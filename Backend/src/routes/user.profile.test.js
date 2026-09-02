import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import express from "express";

import userRoutes from "../routes/user.routes.js";

const JWT_SECRET = "profile-test-secret";
const USER_ID = "64b000000000000000000001";
const OTHER_USER_ID = "64b000000000000000000002";

const tokenFor = (userId, role = "user") =>
  jwt.sign({ id: userId, role }, JWT_SECRET);

const fakeUsers = {
  [USER_ID]: {
    _id: USER_ID,
    name: "Test User",
    email: "test@example.com",
    role: "traveler",
    password: "hashedpassword123",
    rating: 4.5,
    totalReviews: 12,
    completedDeliveries: 8,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-08-20"),
  },
  [OTHER_USER_ID]: {
    _id: OTHER_USER_ID,
    name: "Other User",
    email: "other@example.com",
    role: "sender",
    password: "hashedpassword456",
    rating: 3.8,
    totalReviews: 5,
    completedDeliveries: 3,
    createdAt: new Date("2026-03-10"),
    updatedAt: new Date("2026-07-15"),
  },
};

let originalFindById;

async function setupApp() {
  const User = (await import("../models/User.js")).default;

  originalFindById = User.findById;

  User.findById = (id) => {
    const user = fakeUsers[id];

    const chain = {
      _user: user || null,
      _fields: null,
      select(fields) {
        chain._fields = fields;
        return chain;
      },
      then(resolve, reject) {
        if (!chain._user) {
          resolve(null);
          return;
        }

        const result = { ...chain._user, _id: chain._user._id };

        if (chain._fields && chain._fields.startsWith("-")) {
          const excluded = chain._fields.slice(1).split(" ");
          for (const field of excluded) {
            delete result[field];
          }
        }

        resolve(result);
      },
    };

    return chain;
  };

  const app = express();
  app.use(express.json());
  app.use("/api/users", userRoutes);

  return {
    app,
    cleanup: () => {
      User.findById = originalFindById;
    },
  };
}

const sendGet = async (server, path, token) => {
  const address = server.address();
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path,
        method: "GET",
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
    req.end();
  });
};

async function runTests() {
  process.env.JWT_SECRET = JWT_SECRET;

  await test("GET /api/users/me with valid token returns own profile with email", async () => {
    const { app, cleanup } = await setupApp();
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendGet(server, "/api/users/me", tokenFor(USER_ID));
      assert.equal(result.status, 200);
      assert.equal(result.body.success, true);
      assert.equal(result.body.data.id, USER_ID);
      assert.equal(result.body.data.name, "Test User");
      assert.equal(result.body.data.email, "test@example.com");
      assert.equal(result.body.data.role, "traveler");
      assert.equal(result.body.data.rating, 4.5);
      assert.equal(result.body.data.totalReviews, 12);
      assert.equal(result.body.data.completedDeliveries, 8);
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("GET /api/users/me without token returns 401", async () => {
    const { app, cleanup } = await setupApp();
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendGet(server, "/api/users/me", null);
      assert.equal(result.status, 401);
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("GET /api/users/me with expired token returns 401", async () => {
    const { app, cleanup } = await setupApp();
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const expiredToken = jwt.sign({ id: USER_ID, role: "user" }, JWT_SECRET, { expiresIn: "-1h" });
      const result = await sendGet(server, "/api/users/me", expiredToken);
      assert.equal(result.status, 401);
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("GET /api/users/:id returns public profile without email or password", async () => {
    const { app, cleanup } = await setupApp();
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendGet(server, `/api/users/${OTHER_USER_ID}`, null);
      assert.equal(result.status, 200);
      assert.equal(result.body.success, true);
      assert.equal(result.body.data.id, OTHER_USER_ID);
      assert.equal(result.body.data.name, "Other User");
      assert.equal(result.body.data.role, "sender");
      assert.equal(result.body.data.rating, 3.8);
      assert.equal(result.body.data.totalReviews, 5);
      assert.equal(result.body.data.completedDeliveries, 3);
      assert.equal(result.body.data.email, undefined);
      assert.equal(result.body.data.password, undefined);
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("GET /api/users/:id does not expose password field", async () => {
    const { app, cleanup } = await setupApp();
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendGet(server, `/api/users/${USER_ID}`, null);
      assert.equal(result.status, 200);
      assert.equal(result.body.data.password, undefined);
      assert.equal(result.body.data.email, undefined);
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("GET /api/users/:id with invalid ObjectId returns 400", async () => {
    const { app, cleanup } = await setupApp();
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendGet(server, "/api/users/not-a-valid-id", null);
      assert.equal(result.status, 400);
      assert.equal(result.body.success, false);
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("GET /api/users/:id for non-existent user returns 404", async () => {
    const { app, cleanup } = await setupApp();
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendGet(server, "/api/users/64b000000000000000000999", null);
      assert.equal(result.status, 404);
      assert.equal(result.body.success, false);
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("GET /api/users/me uses req.user.id, not frontend-supplied ID", async () => {
    const { app, cleanup } = await setupApp();
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendGet(server, "/api/users/me", tokenFor(USER_ID));
      assert.equal(result.status, 200);
      assert.equal(result.body.data.id, USER_ID);
      assert.equal(result.body.data.email, "test@example.com");
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("GET /api/users/:id works without auth (public route)", async () => {
    const { app, cleanup } = await setupApp();
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendGet(server, `/api/users/${OTHER_USER_ID}`, null);
      assert.equal(result.status, 200);
      assert.equal(result.body.success, true);
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("GET /api/users/me returns own profile with updatedAt field", async () => {
    const { app, cleanup } = await setupApp();
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendGet(server, "/api/users/me", tokenFor(USER_ID));
      assert.equal(result.status, 200);
      assert.ok(result.body.data.updatedAt);
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("GET /api/users/:id does not return updatedAt (public only)", async () => {
    const { app, cleanup } = await setupApp();
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendGet(server, `/api/users/${OTHER_USER_ID}`, null);
      assert.equal(result.status, 200);
      assert.equal(result.body.data.updatedAt, undefined);
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
