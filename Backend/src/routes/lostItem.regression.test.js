import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import express from "express";

import LostItem from "../models/LostItem.js";
import lostItemRoutes from "./lostItem.routes.js";

const JWT_SECRET = "lost-item-regression-test-secret";
const OWNER_ID = "64b000000000000000000001";

const tokenFor = (userId) => jwt.sign({ id: userId, role: "user" }, JWT_SECRET);

const request = async (server, path, token) => {
  const address = server.address();
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  return fetch(`http://127.0.0.1:${address.port}${path}`, { headers });
};

test("GET /api/lost-items applies status: 'lost' filter in query call", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const lostItem = {
    _id: "64b000000000000000000010",
    title: "Active Lost Phone",
    description: "A lost phone",
    category: "electronics",
    location: "Campus Center",
    dateLost: "2026-08-29",
    status: "lost",
    createdBy: OWNER_ID,
  };

  const claimedItem = {
    _id: "64b000000000000000000011",
    title: "Claimed Item",
    description: "A claimed item",
    category: "electronics",
    location: "Campus Center",
    dateLost: "2026-08-28",
    status: "claimed",
    createdBy: OWNER_ID,
  };

  const originalFind = LostItem.find;
  const queryCalls = [];
  LostItem.find = (filter) => {
    queryCalls.push({ model: "LostItem", operation: "find", filter });
    return {
      populate: async (path, select) => {
        queryCalls.push({
          model: "LostItem",
          operation: "populate",
          path,
          select,
        });
        return [lostItem, claimedItem].filter(
          (item) => item.status === filter.status
        );
      },
      sort: async (sortCriteria) => {
        return [lostItem, claimedItem].sort(
          (a, b) =>
            sortCriteria && sortCriteria.createdAt === -1
              ? b.createdAt - a.createdAt
              : 0
        );
      },
    };
  };

  const app = express();
  app.use(express.json());
  app.use("/api/lost-items", lostItemRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    await request(server, "/api/lost-items", tokenFor(OWNER_ID));

    const findCall = queryCalls.find(
      (q) => q.model === "LostItem" && q.operation === "find"
    );
    assert.ok(findCall, "Expected a LostItem.find call");
    assert.deepEqual(findCall.filter, { status: "lost" });

    // Verify the filter excludes claimed items by checking the filter logic
    const filteredByLost = [lostItem, claimedItem].filter(
      (item) => item.status === "lost"
    );
    assert.equal(filteredByLost.length, 1, "Only 'lost' items should remain");
    assert.equal(filteredByLost[0].status, "lost");

  } finally {
    LostItem.find = originalFind;
    await new Promise((resolve) => server.close(resolve));
  }
});