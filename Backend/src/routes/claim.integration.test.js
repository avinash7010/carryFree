import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import jwt from "jsonwebtoken";

import Claim from "../models/Claim.js";
import claimRoutes from "./claim.routes.js";

const JWT_SECRET = "claim-integration-test-secret";
const CLAIMANT_ID = "64b000000000000000000001";
const OTHER_USER_ID = "64b000000000000000000002";
const FINDER_ID = "64b000000000000000000003";

const tokenFor = (userId) => jwt.sign({ id: userId, role: "user" }, JWT_SECRET);

const request = async (server, path, token) => {
  const address = server.address();
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  return fetch(`http://127.0.0.1:${address.port}${path}`, { headers });
};

test("GET /api/claims/my returns only claimant's claims, newest-first, with populated data", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const mockClaims = [
    {
      _id: "claim-2",
      lostItem: { _id: "lost-2", title: "Lost Phone" },
      foundItem: { _id: "found-2", title: "Found Phone" },
      claimant: CLAIMANT_ID,
      finder: { _id: FINDER_ID, name: "Finder Name", email: "finder@example.com", role: "user", rating: 5, totalReviews: 10, completedDeliveries: 5 },
      message: "Is this my phone?",
      status: "approved",
      createdAt: new Date("2026-09-02T10:00:00Z"),
    },
    {
      _id: "claim-1",
      lostItem: { _id: "lost-1", title: "Lost Keys" },
      foundItem: { _id: "found-1", title: "Found Keys" },
      claimant: CLAIMANT_ID,
      finder: { _id: FINDER_ID, name: "Finder Name", email: "finder@example.com", role: "user", rating: 5, totalReviews: 10, completedDeliveries: 5 },
      message: "Are these my keys?",
      status: "pending",
      createdAt: new Date("2026-09-01T10:00:00Z"),
    },
  ];

  const originalFind = Claim.find;
  Claim.find = (filter) => {
    const queryObj = {
      populate: (path, select) => queryObj,
      sort: async (sortCriteria) => {
        const filtered = mockClaims.filter((c) => c.claimant === filter.claimant);
        if (sortCriteria && sortCriteria.createdAt === -1) {
          filtered.sort((a, b) => b.createdAt - a.createdAt);
        }
        return filtered;
      },
    };
    return queryObj;
  };

  const app = express();
  app.use(express.json());
  app.use("/api/claims", claimRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    // Unauthenticated access rejected
    const unauthResponse = await request(server, "/api/claims/my");
    assert.equal(unauthResponse.status, 401);

    // Authenticated claimant request
    const res = await request(server, "/api/claims/my", tokenFor(CLAIMANT_ID));
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.message, "My claims fetched");
    assert.equal(body.data.length, 2);
    // Newest first
    assert.equal(body.data[0]._id, "claim-2");
    assert.equal(body.data[1]._id, "claim-1");
    // Populated finder data
    assert.equal(body.data[0].finder.name, "Finder Name");
    assert.equal(body.data[0].finder.email, "finder@example.com");
    assert.equal(body.data[0].lostItem.title, "Lost Phone");
    assert.equal(body.data[0].foundItem.title, "Found Phone");

  } finally {
    Claim.find = originalFind;
    await new Promise((resolve) => server.close(resolve));
  }
});
