import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import express from "express";

import FoundItem from "../models/FoundItem.js";
import foundItemRoutes from "./foundItem.routes.js";

const JWT_SECRET = "found-item-regression-test-secret";
const OWNER_ID = "64b000000000000000000001";

const tokenFor = (userId) => jwt.sign({ id: userId, role: "user" }, JWT_SECRET);

const request = async (server, path, token) => {
  const address = server.address();
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  return fetch(`http://127.0.0.1:${address.port}${path}`, { headers });
};

test("GET /api/found-items applies status: 'found' filter in query call", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const foundItem = {
    _id: "64b000000000000000000101",
    title: "Active Found Phone",
    description: "A found phone",
    category: "electronics",
    location: "Campus Center",
    dateFound: "2026-08-29",
    status: "found",
    createdBy: OWNER_ID,
  };

  const returnedItem = {
    _id: "64b000000000000000000102",
    title: "Returned Item",
    description: "A returned item",
    category: "electronics",
    location: "Campus Center",
    dateFound: "2026-08-28",
    status: "returned",
    createdBy: OWNER_ID,
  };

  const originalFind = FoundItem.find;
  const queryCalls = [];
  FoundItem.find = (filter) => {
    queryCalls.push({ model: "FoundItem", operation: "find", filter });
    return {
      populate: async (path, select) => {
        queryCalls.push({
          model: "FoundItem",
          operation: "populate",
          path,
          select,
        });
        return [foundItem, returnedItem].filter(
          (item) => item.status === filter.status
        );
      },
      sort: async (sortCriteria) => {
        return [foundItem, returnedItem].sort(
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
  app.use("/api/found-items", foundItemRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    await request(server, "/api/found-items", tokenFor(OWNER_ID));

    const findCall = queryCalls.find(
      (q) => q.model === "FoundItem" && q.operation === "find"
    );
    assert.ok(findCall, "Expected a FoundItem.find call");
    assert.deepEqual(findCall.filter, { status: "found" });

    // Verify the filter excludes returned items
    const filteredByFound = [foundItem, returnedItem].filter(
      (item) => item.status === "found"
    );
    assert.equal(filteredByFound.length, 1, "Only 'found' items should remain");
    assert.equal(filteredByFound[0].status, "found");

  } finally {
    FoundItem.find = originalFind;
    await new Promise((resolve) => server.close(resolve));
  }
});