import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";

import tripRoutes from "./trip.routes.js";

const TRIP_ID = "64b000000000000000000099";
const TRAVELER_ID = "64b000000000000000000001";

const fakeTrip = {
  _id: TRIP_ID,
  travelerId: TRAVELER_ID,
  source: { city: "Mumbai", lat: 19.076, lng: 72.877 },
  destination: { city: "Delhi", lat: 28.613, lng: 77.209 },
  date: new Date("2026-09-15"),
  capacityKg: 10,
  availableCapacityKg: 7,
  status: "open",
  notes: "Fragile items welcome",
};

const fakeTraveler = {
  _id: TRAVELER_ID,
  name: "Ravi Kumar",
  email: "ravi@example.com",
  role: "traveler",
  rating: 4.5,
  totalReviews: 12,
  completedDeliveries: 8,
};

const buildChainable = (doc) => {
  const chain = {
    _selectFields: null,
    select(fields) {
      chain._selectFields = fields;
      return chain;
    },
    populate(_ref, fields) {
      if (!doc) return chain;
      const result = { ...doc };
      if (fields) {
        const allowed = fields.split(" ");
        const populated = { _id: fakeTraveler._id };
        for (const f of allowed) {
          if (fakeTraveler[f] !== undefined) {
            populated[f] = fakeTraveler[f];
          }
        }
        result.travelerId = populated;
      }
      chain._resolved = result;
      return chain;
    },
    then(resolve, reject) {
      if (!doc) {
        resolve(null);
        return;
      }
      resolve(chain._resolved || doc);
    },
  };
  return chain;
};

let originalFindById;

function setupApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/trips", tripRoutes);
  return app;
}

async function withServer(fn) {
  const Trip = (await import("../models/Trip.js")).default;
  originalFindById = Trip.findById;

  const app = setupApp();
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    await fn(server);
  } finally {
    Trip.findById = originalFindById;
    await new Promise((resolve) => server.close(resolve));
  }
}

const GET = (server, path) =>
  fetch(`http://127.0.0.1:${server.address().port}${path}`);

// --- Tests ---

test("GET /api/trips/:id returns 200 with full trip and populated traveler", async () => {
  const Trip = (await import("../models/Trip.js")).default;
  Trip.findById = (id) => {
    if (id === TRIP_ID) return buildChainable(fakeTrip);
    return buildChainable(null);
  };

  await withServer(async (server) => {
    const res = await GET(server, `/api/trips/${TRIP_ID}`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);

    const trip = body.data;
    assert.equal(trip._id, TRIP_ID);
    assert.equal(trip.status, "open");
    assert.equal(trip.capacityKg, 10);
    assert.equal(trip.availableCapacityKg, 7);
    assert.equal(trip.notes, "Fragile items welcome");

    assert.equal(typeof trip.date, "string");

    assert.deepEqual(trip.source, { city: "Mumbai", lat: 19.076, lng: 72.877 });
    assert.deepEqual(trip.destination, { city: "Delhi", lat: 28.613, lng: 77.209 });

    const traveler = trip.travelerId;
    assert.equal(traveler._id, TRAVELER_ID);
    assert.equal(traveler.name, "Ravi Kumar");
    assert.equal(traveler.email, "ravi@example.com");
    assert.equal(traveler.role, "traveler");
    assert.equal(traveler.rating, 4.5);
    assert.equal(traveler.totalReviews, 12);
    assert.equal(traveler.completedDeliveries, 8);
  });
});

test("GET /api/trips/:id with invalid ObjectId returns 400", async () => {
  const Trip = (await import("../models/Trip.js")).default;
  Trip.findById = () => buildChainable(null);

  await withServer(async (server) => {
    const res = await GET(server, "/api/trips/not-a-valid-id");
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.equal(body.success, false);
  });
});

test("GET /api/trips/:id with valid but nonexistent ObjectId returns 404", async () => {
  const Trip = (await import("../models/Trip.js")).default;
  Trip.findById = () => buildChainable(null);

  await withServer(async (server) => {
    const res = await GET(server, "/api/trips/64b000000000000000000099");
    const body = await res.json();

    assert.equal(res.status, 404);
    assert.equal(body.success, false);
  });
});

test("GET /api/trips/:id does not expose traveler password", async () => {
  const Trip = (await import("../models/Trip.js")).default;
  Trip.findById = (id) => {
    if (id === TRIP_ID) return buildChainable(fakeTrip);
    return buildChainable(null);
  };

  await withServer(async (server) => {
    const res = await GET(server, `/api/trips/${TRIP_ID}`);
    const body = await res.json();

    assert.equal(res.status, 200);
    const traveler = body.data.travelerId;
    assert.equal(traveler.password, undefined);
    assert.equal(Object.keys(traveler).includes("password"), false);
  });
});

test("GET /api/trips/:id works without authentication (public route)", async () => {
  const Trip = (await import("../models/Trip.js")).default;
  Trip.findById = (id) => {
    if (id === TRIP_ID) return buildChainable(fakeTrip);
    return buildChainable(null);
  };

  await withServer(async (server) => {
    const address = server.address();
    const res = await fetch(`http://127.0.0.1:${address.port}/api/trips/${TRIP_ID}`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data._id, TRIP_ID);
  });
});
