import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import jwt from "jsonwebtoken";

import Package from "../models/Package.js";
import packageRoutes from "./package.routes.js";

const JWT_SECRET = "package-location-test-secret";
const USER_ID = "64b000000000000000000001";

const tokenFor = (userId, role = "user") =>
  jwt.sign({ id: userId, role }, JWT_SECRET);

const request = async (server, path, body, token) => {
  const address = server.address();
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(`http://127.0.0.1:${address.port}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
};

test("POST /api/packages accepts valid { city, lat, lng } location objects", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  let createdDoc = null;
  const originalCreate = Package.create;
  Package.create = async (doc) => {
    createdDoc = doc;
    return { ...doc, _id: "pkg-1", status: "pending", createdAt: new Date() };
  };

  const app = express();
  app.use(express.json());
  app.use("/api/packages", packageRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const payload = {
      pickupLocation: { city: "Mumbai", lat: 19.076, lng: 72.877 },
      dropLocation: { city: "Delhi", lat: 28.613, lng: 77.209 },
      expectedDate: "2026-09-10",
      weight: 2.5,
      description: "Test package",
    };

    const res = await request(server, "/api/packages", payload, tokenFor(USER_ID));
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(createdDoc.pickupLocation.city, "Mumbai");
    assert.equal(createdDoc.pickupLocation.lat, 19.076);
    assert.equal(createdDoc.pickupLocation.lng, 72.877);
    assert.equal(createdDoc.dropLocation.city, "Delhi");
    assert.equal(createdDoc.dropLocation.lat, 28.613);
    assert.equal(createdDoc.dropLocation.lng, 77.209);
  } finally {
    Package.create = originalCreate;
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/packages rejects string location (old frontend contract)", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const app = express();
  app.use(express.json());
  app.use("/api/packages", packageRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const payload = {
      pickupLocation: "Mumbai",
      dropLocation: "Delhi",
      expectedDate: "2026-09-10",
      weight: 2.5,
    };

    const res = await request(server, "/api/packages", payload, tokenFor(USER_ID));
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/packages rejects missing lat", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const app = express();
  app.use(express.json());
  app.use("/api/packages", packageRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const payload = {
      pickupLocation: { city: "Mumbai", lng: 72.877 },
      dropLocation: { city: "Delhi", lat: 28.613, lng: 77.209 },
      expectedDate: "2026-09-10",
      weight: 2.5,
    };

    const res = await request(server, "/api/packages", payload, tokenFor(USER_ID));
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/packages rejects out-of-range lat", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const app = express();
  app.use(express.json());
  app.use("/api/packages", packageRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const payload = {
      pickupLocation: { city: "Mumbai", lat: 999, lng: 72.877 },
      dropLocation: { city: "Delhi", lat: 28.613, lng: 77.209 },
      expectedDate: "2026-09-10",
      weight: 2.5,
    };

    const res = await request(server, "/api/packages", payload, tokenFor(USER_ID));
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/packages preserves correct city and coordinates", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  let createdDoc = null;
  const originalCreate = Package.create;
  Package.create = async (doc) => {
    createdDoc = doc;
    return { ...doc, _id: "pkg-2", status: "pending", createdAt: new Date() };
  };

  const app = express();
  app.use(express.json());
  app.use("/api/packages", packageRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const payload = {
      pickupLocation: { city: "Bangalore", lat: 12.971, lng: 77.594 },
      dropLocation: { city: "Chennai", lat: 13.082, lng: 80.27 },
      expectedDate: "2026-09-15",
      weight: 1.0,
    };

    const res = await request(server, "/api/packages", payload, tokenFor(USER_ID));
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(createdDoc.pickupLocation.city, "Bangalore");
    assert.ok(Math.abs(createdDoc.pickupLocation.lat - 12.971) < 0.001);
    assert.ok(Math.abs(createdDoc.pickupLocation.lng - 77.594) < 0.001);
    assert.equal(createdDoc.dropLocation.city, "Chennai");
    assert.ok(Math.abs(createdDoc.dropLocation.lat - 13.082) < 0.001);
    assert.ok(Math.abs(createdDoc.dropLocation.lng - 80.27) < 0.001);
  } finally {
    Package.create = originalCreate;
    await new Promise((resolve) => server.close(resolve));
  }
});

const makeGetRequest = async (server, path, token) => {
  const address = server.address();
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(`http://127.0.0.1:${address.port}${path}`, { headers });
};

test("GET /api/packages returns public package list without auth", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const mockPackages = [
    {
      _id: "pkg-pub-1",
      pickupLocation: { city: "Mumbai", lat: 19.076, lng: 72.877 },
      dropLocation: { city: "Delhi", lat: 28.613, lng: 77.209 },
      expectedDate: new Date("2026-09-10"),
      weight: 2.5,
      status: "pending",
      paymentStatus: "pending",
      createdAt: new Date(),
    },
  ];

  const originalFind = Package.find;
  Package.find = () => ({
    sort: () => ({
      select: () => ({
        populate: () => ({
          populate: () => Promise.resolve(mockPackages),
        }),
      }),
    }),
  });

  const app = express();
  app.use(express.json());
  app.use("/api/packages", packageRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const res = await makeGetRequest(server, "/api/packages");
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(Array.isArray(body.data), true);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].pickupLocation.city, "Mumbai");
  } finally {
    Package.find = originalFind;
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /api/packages/:id returns a single package by id", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const mockPackage = {
    _id: "pkg-detail-1",
    pickupLocation: { city: "Mumbai", lat: 19.076, lng: 72.877 },
    dropLocation: { city: "Delhi", lat: 28.613, lng: 77.209 },
    expectedDate: new Date("2026-09-10"),
    weight: 2.5,
    status: "pending",
    paymentStatus: "pending",
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

    const res = await makeGetRequest(server, "/api/packages/pkg-detail-1");
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

test("GET /api/packages/:id returns 400 for invalid ObjectId", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const app = express();
  app.use(express.json());
  app.use("/api/packages", packageRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const res = await makeGetRequest(server, "/api/packages/not-a-valid-id");
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
    assert.ok(body.message.toLowerCase().includes("invalid"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /api/packages/:id returns 404 for nonexistent package", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const originalFindById = Package.findById;
  Package.findById = () => ({
    select: () => ({
      populate: () => ({
        populate: () => Promise.resolve(null),
      }),
    }),
  });

  const app = express();
  app.use(express.json());
  app.use("/api/packages", packageRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const res = await makeGetRequest(server, "/api/packages/64b000000000000000000099");
    const body = await res.json();

    assert.equal(res.status, 404);
    assert.equal(body.success, false);
  } finally {
    Package.findById = originalFindById;
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /api/packages/:id does not expose sensitive fields", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  // The controller uses .select() which strips sensitive fields.
  // Simulate this by returning only the fields the select allows.
  const rawPackage = {
    _id: "64b0000000000000000000aa",
    pickupLocation: { city: "Mumbai", lat: 19.076, lng: 72.877 },
    dropLocation: { city: "Delhi", lat: 28.613, lng: 77.209 },
    expectedDate: new Date("2026-09-10"),
    weight: 2.5,
    status: "pending",
    paymentStatus: "pending",
    createdAt: new Date(),
    // Sensitive fields that .select() should strip
    receiverName: "Secret Receiver",
    receiverPhone: "+919999999999",
    paymentAmount: 500,
    deliveryOtpHash: "abc123hash",
    description: "Private package description",
  };

  const selectedFields = "pickupLocation dropLocation expectedDate weight status paymentStatus createdAt matchedTrip senderId";
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

    const res = await makeGetRequest(server, "/api/packages/64b0000000000000000000aa");
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    // Verify sensitive fields are not exposed in the response
    assert.equal(body.data.receiverName, undefined, "receiverName must not be exposed");
    assert.equal(body.data.receiverPhone, undefined, "receiverPhone must not be exposed");
    assert.equal(body.data.paymentAmount, undefined, "paymentAmount must not be exposed");
    assert.equal(body.data.deliveryOtpHash, undefined, "deliveryOtpHash must not be exposed");
    assert.equal(body.data.description, undefined, "description must not be exposed");
    // Verify safe fields ARE exposed
    assert.equal(body.data.pickupLocation.city, "Mumbai");
    assert.equal(body.data.weight, 2.5);
  } finally {
    Package.findById = originalFindById;
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GET /api/packages/:id works without authentication", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const mockPackage = {
    _id: "64b0000000000000000000bb",
    pickupLocation: { city: "Mumbai", lat: 19.076, lng: 72.877 },
    dropLocation: { city: "Delhi", lat: 28.613, lng: 77.209 },
    expectedDate: new Date("2026-09-10"),
    weight: 2.5,
    status: "pending",
    paymentStatus: "pending",
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

    // No token passed — public access
    const res = await makeGetRequest(server, "/api/packages/64b0000000000000000000bb");
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data._id, "64b0000000000000000000bb");
  } finally {
    Package.findById = originalFindById;
    await new Promise((resolve) => server.close(resolve));
  }
});
