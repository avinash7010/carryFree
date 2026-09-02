import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import jwt from "jsonwebtoken";

import Trip from "../models/Trip.js";
import tripRoutes from "./trip.routes.js";

const JWT_SECRET = "trip-location-test-secret";
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

test("POST /api/trips accepts valid { city, lat, lng } location objects", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  let createdDoc = null;
  const originalCreate = Trip.create;
  Trip.create = async (doc) => {
    createdDoc = doc;
    return { ...doc, _id: "trip-1", status: "open", createdAt: new Date() };
  };

  const app = express();
  app.use(express.json());
  app.use("/api/trips", tripRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const payload = {
      source: { city: "Mumbai", lat: 19.076, lng: 72.877 },
      destination: { city: "Delhi", lat: 28.613, lng: 77.209 },
      date: "2026-09-10",
      capacityKg: 10,
    };

    const res = await request(server, "/api/trips", payload, tokenFor(USER_ID));
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(createdDoc.source.city, "Mumbai");
    assert.equal(createdDoc.source.lat, 19.076);
    assert.equal(createdDoc.source.lng, 72.877);
    assert.equal(createdDoc.destination.city, "Delhi");
    assert.equal(createdDoc.destination.lat, 28.613);
    assert.equal(createdDoc.destination.lng, 77.209);
  } finally {
    Trip.create = originalCreate;
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/trips rejects string location (old frontend contract)", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const app = express();
  app.use(express.json());
  app.use("/api/trips", tripRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const payload = {
      source: "Mumbai",
      destination: "Delhi",
      date: "2026-09-10",
      capacityKg: 10,
    };

    const res = await request(server, "/api/trips", payload, tokenFor(USER_ID));
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/trips rejects missing lng", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const app = express();
  app.use(express.json());
  app.use("/api/trips", tripRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const payload = {
      source: { city: "Mumbai", lat: 19.076 },
      destination: { city: "Delhi", lat: 28.613, lng: 77.209 },
      date: "2026-09-10",
      capacityKg: 10,
    };

    const res = await request(server, "/api/trips", payload, tokenFor(USER_ID));
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/trips rejects out-of-range longitude", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const app = express();
  app.use(express.json());
  app.use("/api/trips", tripRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const payload = {
      source: { city: "Mumbai", lat: 19.076, lng: 72.877 },
      destination: { city: "Delhi", lat: 28.613, lng: 999 },
      date: "2026-09-10",
      capacityKg: 10,
    };

    const res = await request(server, "/api/trips", payload, tokenFor(USER_ID));
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("POST /api/trips preserves correct city and coordinates", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  let createdDoc = null;
  const originalCreate = Trip.create;
  Trip.create = async (doc) => {
    createdDoc = doc;
    return { ...doc, _id: "trip-2", status: "open", createdAt: new Date() };
  };

  const app = express();
  app.use(express.json());
  app.use("/api/trips", tripRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const payload = {
      source: { city: "Bangalore", lat: 12.971, lng: 77.594 },
      destination: { city: "Chennai", lat: 13.082, lng: 80.27 },
      date: "2026-09-15",
      capacityKg: 5,
    };

    const res = await request(server, "/api/trips", payload, tokenFor(USER_ID));
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(createdDoc.source.city, "Bangalore");
    assert.ok(Math.abs(createdDoc.source.lat - 12.971) < 0.001);
    assert.ok(Math.abs(createdDoc.source.lng - 77.594) < 0.001);
    assert.equal(createdDoc.destination.city, "Chennai");
    assert.ok(Math.abs(createdDoc.destination.lat - 13.082) < 0.001);
    assert.ok(Math.abs(createdDoc.destination.lng - 80.27) < 0.001);
  } finally {
    Trip.create = originalCreate;
    await new Promise((resolve) => server.close(resolve));
  }
});
