import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import express from "express";

import reviewRoutes from "./review.routes.js";

const JWT_SECRET = "review-test-secret";
const SENDER_ID = "64b000000000000000000001";
const TRAVELER_ID = "64b000000000000000000002";
const BOOKING_ID = "64b000000000000000000099";
const OTHER_USER_ID = "64b000000000000000000003";

const tokenFor = (userId, role = "user") =>
  jwt.sign({ id: userId, role }, JWT_SECRET);

const fakeBooking = {
  _id: BOOKING_ID,
  packageId: "64b000000000000000000010",
  tripId: "64b000000000000000000011",
  senderId: SENDER_ID,
  travelerId: TRAVELER_ID,
  status: "delivered",
  paymentStatus: "released",
};

const fakeTraveler = {
  _id: TRAVELER_ID,
  name: "Traveler One",
  email: "traveler@example.com",
  role: "traveler",
  rating: 4.0,
  totalReviews: 2,
  completedDeliveries: 5,
  reviews: [],
  save: async function () {
    this._saved = true;
  },
};

let originalBookingFindById;
let originalUserFindById;
let originalNotificationFindOne;
let originalNotificationInsertMany;

function setupApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/reviews", reviewRoutes);
  return app;
}

async function withServer(fn) {
  const Booking = (await import("../models/Booking.js")).default;
  const User = (await import("../models/User.js")).default;
  const Notification = (await import("../models/Notification.js")).default;

  originalBookingFindById = Booking.findById;
  originalUserFindById = User.findById;
  originalNotificationFindOne = Notification.findOne;
  originalNotificationInsertMany = Notification.insertMany;

  Notification.findOne = async () => null;
  Notification.insertMany = async () => [];

  const app = setupApp();
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    await fn(server);
  } finally {
    Booking.findById = originalBookingFindById;
    User.findById = originalUserFindById;
    Notification.findOne = originalNotificationFindOne;
    Notification.insertMany = originalNotificationInsertMany;
    await new Promise((resolve) => server.close(resolve));
  }
}

const sendRequest = async (server, method, path, body, token) => {
  const address = server.address();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path,
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

// --- Tests ---

process.env.JWT_SECRET = JWT_SECRET;

test("POST /api/reviews with valid data returns 201", async () => {
  const traveler = { ...fakeTraveler, reviews: [] };
  const Booking = (await import("../models/Booking.js")).default;
  const User = (await import("../models/User.js")).default;

  Booking.findById = (id) => {
    if (id === BOOKING_ID) return { then: (resolve) => resolve({ ...fakeBooking }) };
    return { then: (resolve) => resolve(null) };
  };

  User.findById = (id) => {
    if (id === TRAVELER_ID) {
      const doc = { ...traveler, reviews: [] };
      doc.save = async function () { Object.assign(traveler, this); };
      return {
        populate: () => ({ then: (resolve) => resolve(doc) }),
        then: (resolve) => resolve(doc),
      };
    }
    return { then: (resolve) => resolve(null) };
  };

  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "POST",
      "/api/reviews",
      { bookingId: BOOKING_ID, rating: 5, comment: "Great delivery!" },
      tokenFor(SENDER_ID)
    );

    assert.equal(result.status, 201);
    assert.equal(result.body.success, true);
    assert.equal(result.body.data.review.rating, 5);
    assert.equal(result.body.data.review.comment, "Great delivery!");
    assert.ok(result.body.data.travelerStats);
  });
});

test("POST /api/reviews without token returns 401", async () => {
  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "POST",
      "/api/reviews",
      { bookingId: BOOKING_ID, rating: 5 },
      null
    );

    assert.equal(result.status, 401);
  });
});

test("POST /api/reviews with missing bookingId returns 400", async () => {
  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "POST",
      "/api/reviews",
      { rating: 5 },
      tokenFor(SENDER_ID)
    );

    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  });
});

test("POST /api/reviews with missing rating returns 400", async () => {
  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "POST",
      "/api/reviews",
      { bookingId: BOOKING_ID },
      tokenFor(SENDER_ID)
    );

    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  });
});

test("POST /api/reviews with rating < 1 returns 400", async () => {
  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "POST",
      "/api/reviews",
      { bookingId: BOOKING_ID, rating: 0 },
      tokenFor(SENDER_ID)
    );

    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  });
});

test("POST /api/reviews with rating > 5 returns 400", async () => {
  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "POST",
      "/api/reviews",
      { bookingId: BOOKING_ID, rating: 6 },
      tokenFor(SENDER_ID)
    );

    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  });
});

test("POST /api/reviews for non-delivered booking returns 400", async () => {
  const Booking = (await import("../models/Booking.js")).default;
  const User = (await import("../models/User.js")).default;

  Booking.findById = (id) => {
    if (id === BOOKING_ID)
      return {
        then: (resolve) =>
          resolve({ ...fakeBooking, status: "in-transit" }),
      };
    return { then: (resolve) => resolve(null) };
  };

  User.findById = () => ({ then: (resolve) => resolve(null) });

  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "POST",
      "/api/reviews",
      { bookingId: BOOKING_ID, rating: 5 },
      tokenFor(SENDER_ID)
    );

    assert.equal(result.status, 400);
    assert.match(result.body.message, /delivery/i);
  });
});

test("POST /api/reviews by non-sender returns 403", async () => {
  const Booking = (await import("../models/Booking.js")).default;
  const User = (await import("../models/User.js")).default;

  Booking.findById = (id) => {
    if (id === BOOKING_ID)
      return { then: (resolve) => resolve({ ...fakeBooking }) };
    return { then: (resolve) => resolve(null) };
  };

  User.findById = () => ({ then: (resolve) => resolve(null) });

  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "POST",
      "/api/reviews",
      { bookingId: BOOKING_ID, rating: 5 },
      tokenFor(OTHER_USER_ID)
    );

    assert.equal(result.status, 403);
    assert.match(result.body.message, /sender/i);
  });
});

test("POST /api/reviews for non-existent booking returns 404", async () => {
  const Booking = (await import("../models/Booking.js")).default;
  const User = (await import("../models/User.js")).default;

  Booking.findById = () => ({ then: (resolve) => resolve(null) });
  User.findById = () => ({ then: (resolve) => resolve(null) });

  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "POST",
      "/api/reviews",
      { bookingId: "64b000000000000000000999", rating: 5 },
      tokenFor(SENDER_ID)
    );

    assert.equal(result.status, 404);
  });
});

test("POST /api/reviews duplicate returns 400", async () => {
  const Booking = (await import("../models/Booking.js")).default;
  const User = (await import("../models/User.js")).default;

  const travelerWithReview = {
    ...fakeTraveler,
    reviews: [
      {
        bookingId: BOOKING_ID,
        reviewer: SENDER_ID,
        rating: 4,
        comment: "Already reviewed",
        createdAt: new Date(),
      },
    ],
  };

  Booking.findById = (id) => {
    if (id === BOOKING_ID)
      return { then: (resolve) => resolve({ ...fakeBooking }) };
    return { then: (resolve) => resolve(null) };
  };

  User.findById = (id) => {
    if (id === TRAVELER_ID) {
      return { then: (resolve) => resolve(travelerWithReview) };
    }
    return { then: (resolve) => resolve(null) };
  };

  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "POST",
      "/api/reviews",
      { bookingId: BOOKING_ID, rating: 5 },
      tokenFor(SENDER_ID)
    );

    assert.equal(result.status, 400);
    assert.match(result.body.message, /already/i);
  });
});

test("GET /api/reviews/traveler/:id returns reviews for a traveler", async () => {
  const User = (await import("../models/User.js")).default;

  const travelerWithReviews = {
    ...fakeTraveler,
    reviews: [
      {
        bookingId: BOOKING_ID,
        reviewer: { _id: SENDER_ID, name: "Sender One" },
        rating: 5,
        comment: "Excellent!",
        createdAt: new Date(),
      },
    ],
  };

  User.findById = (id) => {
    if (id === TRAVELER_ID) {
      return {
        populate: () => ({
          then: (resolve) => resolve(travelerWithReviews),
        }),
        then: (resolve) => resolve(travelerWithReviews),
      };
    }
    return { then: (resolve) => resolve(null) };
  };

  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "GET",
      `/api/reviews/traveler/${TRAVELER_ID}`,
      null,
      null
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.data.reviews.length, 1);
    assert.equal(result.body.data.reviews[0].rating, 5);
    assert.equal(result.body.data.name, "Traveler One");
  });
});

test("GET /api/reviews/traveler/:id with invalid id returns 400", async () => {
  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "GET",
      "/api/reviews/traveler/not-a-valid-id",
      null,
      null
    );

    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  });
});

test("GET /api/reviews/traveler/:id for non-existent traveler returns 404", async () => {
  const User = (await import("../models/User.js")).default;
  User.findById = () => ({
    populate: () => ({ then: (resolve) => resolve(null) }),
    then: (resolve) => resolve(null),
  });

  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "GET",
      "/api/reviews/traveler/64b000000000000000000999",
      null,
      null
    );

    assert.equal(result.status, 404);
  });
});

test("GET /api/reviews/stats/:id returns stats for a traveler", async () => {
  const User = (await import("../models/User.js")).default;

  User.aggregate = async () => [
    {
      summary: [
        {
          rating: 4.5,
          totalReviews: 12,
          completedDeliveries: 8,
        },
      ],
      distribution: [
        { _id: 5, count: 7 },
        { _id: 4, count: 3 },
        { _id: 3, count: 2 },
      ],
    },
  ];

  await withServer(async (server) => {
    const result = await sendRequest(
      server,
      "GET",
      `/api/reviews/stats/${TRAVELER_ID}`,
      null,
      null
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.data.rating, 4.5);
    assert.equal(result.body.data.totalReviews, 12);
    assert.equal(result.body.data.completedDeliveries, 8);
    assert.equal(result.body.data.ratingDistribution.fiveStar, 7);
    assert.equal(result.body.data.ratingDistribution.fourStar, 3);
    assert.equal(result.body.data.ratingDistribution.threeStar, 2);
  });
});
