import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import jwt from "jsonwebtoken";

import Package from "../models/Package.js";
import Trip from "../models/Trip.js";
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import packageRoutes from "./package.routes.js";
import carryMatchRoutes from "./carryMatch.routes.js";
import bookingRoutes from "./booking.routes.js";

const JWT_SECRET = "package-authz-test-secret";
const OWNER_ID = "64b000000000000000000001";
const OTHER_USER_ID = "64b000000000000000000002";
const TRAVELER_ID = "64b000000000000000000003";
const PACKAGE_ID = "64b0000000000000000000aa";
const TRIP_ID = "64b0000000000000000000bb";

const tokenFor = (userId, role = "user") =>
  jwt.sign({ id: userId, role }, JWT_SECRET);

const makeGetRequest = async (server, path, token) => {
  const address = server.address();
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(`http://127.0.0.1:${address.port}${path}`, { headers });
};

const makePostRequest = async (server, path, body, token) => {
  const address = server.address();
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(`http://127.0.0.1:${address.port}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
};

// ──────────────────────────────────────────────────────────
// Test 1: Non-owner cannot view package matches (403)
// ──────────────────────────────────────────────────────────
test("GET /api/matches/packages/:packageId returns 403 for non-owner", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const mockPackage = {
    _id: PACKAGE_ID,
    senderId: { toString: () => OWNER_ID },
    status: "pending",
    weight: 2.5,
    expectedDate: new Date("2026-09-15"),
    pickupLocation: { city: "Mumbai", lat: 19.076, lng: 72.877 },
    dropLocation: { city: "Delhi", lat: 28.613, lng: 77.209 },
  };

  const originalFindById = Package.findById;
  Package.findById = () => Promise.resolve(mockPackage);

  const app = express();
  app.use(express.json());
  app.use("/api/matches", carryMatchRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const res = await makeGetRequest(
      server,
      `/api/matches/packages/${PACKAGE_ID}`,
      tokenFor(OTHER_USER_ID)
    );
    const body = await res.json();

    assert.equal(res.status, 403);
    assert.equal(body.success, false);
    assert.ok(body.message.toLowerCase().includes("not authorized"));
  } finally {
    Package.findById = originalFindById;
    await new Promise((resolve) => server.close(resolve));
  }
});

// ──────────────────────────────────────────────────────────
// Test 2: Owner CAN view package matches (200)
// ──────────────────────────────────────────────────────────
test("GET /api/matches/packages/:packageId returns 200 for owner", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const mockPackage = {
    _id: PACKAGE_ID,
    senderId: { toString: () => OWNER_ID },
    status: "pending",
    weight: 2.5,
    expectedDate: new Date("2026-09-15"),
    pickupLocation: { city: "Mumbai", lat: 19.076, lng: 72.877 },
    dropLocation: { city: "Delhi", lat: 28.613, lng: 77.209 },
  };

  const originalFindById = Package.findById;
  const originalTripFind = Trip.find;
  Package.findById = () => Promise.resolve(mockPackage);
  Trip.find = () => ({
    populate: () => Promise.resolve([]),
  });

  const app = express();
  app.use(express.json());
  app.use("/api/matches", carryMatchRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const res = await makeGetRequest(
      server,
      `/api/matches/packages/${PACKAGE_ID}`,
      tokenFor(OWNER_ID)
    );
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.matchCount, 0);
  } finally {
    Package.findById = originalFindById;
    Trip.find = originalTripFind;
    await new Promise((resolve) => server.close(resolve));
  }
});

// ──────────────────────────────────────────────────────────
// Test 3: Non-owner cannot create booking (403)
// ──────────────────────────────────────────────────────────
test("POST /api/bookings returns 403 when non-owner tries to book another user's package", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const mockPackage = {
    _id: PACKAGE_ID,
    senderId: { toString: () => OWNER_ID },
    status: "pending",
    weight: 2.5,
    paymentAmount: 100,
    expectedDate: new Date("2026-09-15"),
  };

  const mockTrip = {
    _id: TRIP_ID,
    travelerId: { toString: () => TRAVELER_ID },
    status: "open",
    availableCapacityKg: 10,
  };

  const originalPackageFindById = Package.findById;
  const originalTripFindById = Trip.findById;
  Package.findById = (id) => {
    if (id === PACKAGE_ID) return Promise.resolve(mockPackage);
    return Promise.resolve(null);
  };
  Trip.findById = (id) => {
    if (id === TRIP_ID) return Promise.resolve(mockTrip);
    return Promise.resolve(null);
  };

  const app = express();
  app.use(express.json());
  app.use("/api/bookings", bookingRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const res = await makePostRequest(
      server,
      "/api/bookings",
      { packageId: PACKAGE_ID, tripId: TRIP_ID },
      tokenFor(OTHER_USER_ID)
    );
    const body = await res.json();

    assert.equal(res.status, 403);
    assert.equal(body.success, false);
    assert.ok(body.message.toLowerCase().includes("only package owner"));
  } finally {
    Package.findById = originalPackageFindById;
    Trip.findById = originalTripFindById;
    await new Promise((resolve) => server.close(resolve));
  }
});

// ──────────────────────────────────────────────────────────
// Test 4: Owner CAN create booking for own package (201)
// ──────────────────────────────────────────────────────────
test("POST /api/bookings returns 201 when owner books their own package", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const mockPackage = {
    _id: PACKAGE_ID,
    senderId: { toString: () => OWNER_ID },
    status: "pending",
    weight: 2.5,
    paymentAmount: 100,
    expectedDate: new Date("2026-09-15"),
  };

  const mockTrip = {
    _id: TRIP_ID,
    travelerId: { toString: () => TRAVELER_ID },
    status: "open",
    availableCapacityKg: 10,
  };

  let createdBooking = null;
  const originalPackageFindById = Package.findById;
  const originalTripFindById = Trip.findById;
  const originalBookingCreate = Booking.create;
  const originalBookingFindOne = Booking.findOne;
  const originalNotificationFindOne = Notification.findOne;
  const originalNotificationInsertMany = Notification.insertMany;

  Package.findById = (id) => {
    if (id === PACKAGE_ID) return Promise.resolve(mockPackage);
    return Promise.resolve(null);
  };
  Trip.findById = (id) => {
    if (id === TRIP_ID) return Promise.resolve(mockTrip);
    return Promise.resolve(null);
  };
  Booking.create = async (doc) => {
    createdBooking = { ...doc, _id: "booking-new-1", createdAt: new Date() };
    return createdBooking;
  };
  Booking.findOne = () => Promise.resolve(null);
  Notification.findOne = () => Promise.resolve(null);
  Notification.insertMany = async () => [];

  const originalSave = mockPackage.save;
  mockPackage.save = async () => {};

  const app = express();
  app.use(express.json());
  app.use("/api/bookings", bookingRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const res = await makePostRequest(
      server,
      "/api/bookings",
      { packageId: PACKAGE_ID, tripId: TRIP_ID },
      tokenFor(OWNER_ID)
    );
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(String(createdBooking.senderId), OWNER_ID);
    assert.equal(String(createdBooking.travelerId), TRAVELER_ID);
  } finally {
    Package.findById = originalPackageFindById;
    Trip.findById = originalTripFindById;
    Booking.create = originalBookingCreate;
    Booking.findOne = originalBookingFindOne;
    Notification.findOne = originalNotificationFindOne;
    Notification.insertMany = originalNotificationInsertMany;
    mockPackage.save = originalSave;
    await new Promise((resolve) => server.close(resolve));
  }
});

// ──────────────────────────────────────────────────────────
// Test 5: Public package detail accessible without auth
// ──────────────────────────────────────────────────────────
test("GET /api/packages/:id returns 200 without authentication", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const mockPackage = {
    _id: "64b0000000000000000000cc",
    pickupLocation: { city: "Mumbai", lat: 19.076, lng: 72.877 },
    dropLocation: { city: "Delhi", lat: 28.613, lng: 77.209 },
    expectedDate: new Date("2026-09-10"),
    weight: 2.5,
    status: "pending",
    paymentStatus: "unlocked",
    createdAt: new Date(),
  };

  const originalFindById = Package.findById;
  Package.findById = () => ({
    select: () => ({
      populate: () => ({
        populate: () => Promise.resolve(mockPackage),
      }),
    }),
  });

  const app = express();
  app.use(express.json());
  app.use("/api/packages", packageRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const res = await makeGetRequest(server, "/api/packages/64b0000000000000000000cc");
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.pickupLocation.city, "Mumbai");
    assert.equal(body.data.weight, 2.5);
  } finally {
    Package.findById = originalFindById;
    await new Promise((resolve) => server.close(resolve));
  }
});

// ──────────────────────────────────────────────────────────
// Test 6: Public package detail excludes sensitive fields
// ──────────────────────────────────────────────────────────
test("GET /api/packages/:id excludes receiverName, receiverPhone, paymentAmount, deliveryOtpHash, description", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const selectedFields = "pickupLocation dropLocation expectedDate weight status paymentStatus createdAt matchedTrip senderId";
  const rawPackage = {
    _id: "64b0000000000000000000dd",
    pickupLocation: { city: "Mumbai", lat: 19.076, lng: 72.877 },
    dropLocation: { city: "Delhi", lat: 28.613, lng: 77.209 },
    expectedDate: new Date("2026-09-10"),
    weight: 2.5,
    status: "pending",
    paymentStatus: "unlocked",
    createdAt: new Date(),
    receiverName: "Secret Receiver",
    receiverPhone: "+919999999999",
    paymentAmount: 500,
    deliveryOtpHash: "abc123hash",
    description: "Private package description",
  };

  const sanitized = {};
  for (const field of selectedFields.split(" ")) {
    if (rawPackage[field] !== undefined) {
      sanitized[field] = rawPackage[field];
    }
  }
  sanitized._id = rawPackage._id;

  const originalFindById = Package.findById;
  Package.findById = () => ({
    select: () => ({
      populate: () => ({
        populate: () => Promise.resolve(sanitized),
      }),
    }),
  });

  const app = express();
  app.use(express.json());
  app.use("/api/packages", packageRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const res = await makeGetRequest(server, "/api/packages/64b0000000000000000000dd");
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.receiverName, undefined, "receiverName must not be exposed");
    assert.equal(body.data.receiverPhone, undefined, "receiverPhone must not be exposed");
    assert.equal(body.data.paymentAmount, undefined, "paymentAmount must not be exposed");
    assert.equal(body.data.deliveryOtpHash, undefined, "deliveryOtpHash must not be exposed");
    assert.equal(body.data.description, undefined, "description must not be exposed");
    assert.equal(body.data.pickupLocation.city, "Mumbai");
    assert.equal(body.data.weight, 2.5);
    assert.equal(body.data.status, "pending");
  } finally {
    Package.findById = originalFindById;
    await new Promise((resolve) => server.close(resolve));
  }
});
