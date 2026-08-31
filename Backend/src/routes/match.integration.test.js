import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import express from "express";
import jwt from "jsonwebtoken";

import LostItem from "../models/LostItem.js";
import FoundItem from "../models/FoundItem.js";
import matchRoutes from "./match.routes.js";

const JWT_SECRET = "match-integration-test-secret";
const OWNER_ID = "64b000000000000000000001";
const OTHER_USER_ID = "64b000000000000000000002";
const LOST_ITEM_ID = "64b000000000000000000010";
const MISSING_ITEM_ID = "64b000000000000000000099";

const lostItem = {
  _id: LOST_ITEM_ID,
  title: "Apple AirPods Pro",
  description: "Wireless earbuds in black case with charging cable",
  category: "electronics",
  location: "Central Library 2nd Floor",
  dateLost: "2026-08-29",
  color: "black",
  status: "lost",
  createdBy: OWNER_ID,
};

const foundItems = [
  {
    _id: "64b000000000000000000101",
    title: "Apple AirPods Pro",
    description: "Wireless earbuds in black case with charging cable",
    category: "electronics",
    location: "Central Library 2nd Floor",
    dateFound: "2026-08-29",
    color: "black",
    status: "found",
    createdBy: { _id: "64b000000000000000000201", name: "Finder One" },
    sourceMarker: "found-query-layer",
  },
  {
    _id: "64b000000000000000000102",
    title: "AirPods Pro",
    description: "Black wireless earbuds with charging case",
    category: "electronics",
    location: "Central Library",
    dateFound: "2026-08-30",
    color: "black",
    status: "found",
    createdBy: { _id: "64b000000000000000000202", name: "Finder Two" },
    sourceMarker: "found-query-layer",
  },
  {
    _id: "64b000000000000000000103",
    title: "Black phone",
    description: "Item found there",
    category: "electronics",
    location: "Central Library 2nd Floor",
    dateFound: "2026-08-29",
    color: "black",
    status: "found",
    createdBy: { _id: "64b000000000000000000203", name: "Finder Three" },
    sourceMarker: "found-query-layer",
  },
  {
    _id: "64b000000000000000000104",
    title: "Apple AirPods Pro",
    description: "Wireless earbuds in black case with charging cable",
    category: "clothing",
    location: "Central Library 2nd Floor",
    dateFound: "2026-08-29",
    color: "black",
    status: "found",
    createdBy: { _id: "64b000000000000000000204", name: "Finder Four" },
    sourceMarker: "found-query-layer",
  },
  {
    _id: "64b000000000000000000105",
    title: "Apple AirPods Pro",
    description: "Wireless earbuds in black case with charging cable",
    category: "electronics",
    location: "Central Library 2nd Floor",
    dateFound: "2026-08-28",
    color: "black",
    status: "found",
    createdBy: { _id: "64b000000000000000000205", name: "Finder Five" },
    sourceMarker: "found-query-layer",
  },
];

const tokenFor = (userId) => jwt.sign({ id: userId, role: "user" }, JWT_SECRET);

const request = async (server, path, token) => {
  const address = server.address();
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  return fetch(`http://127.0.0.1:${address.port}${path}`, { headers });
};

test("GET /api/match/lost/:id follows the real authenticated endpoint flow", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const originalFindById = LostItem.findById;
  const originalFoundFind = FoundItem.find;
  const queryCalls = [];

  LostItem.findById = async (id) => {
    queryCalls.push({ model: "LostItem", operation: "findById", id });
    return id === LOST_ITEM_ID ? lostItem : null;
  };

  FoundItem.find = (filter) => {
    queryCalls.push({ model: "FoundItem", operation: "find", filter });
    return {
      populate: async (path, select) => {
        queryCalls.push({ model: "FoundItem", operation: "populate", path, select });
        return foundItems;
      },
    };
  };

  const app = express();
  app.use(express.json());
  app.use("/api/match", matchRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const ownerResponse = await request(server, `/api/match/lost/${LOST_ITEM_ID}`, tokenFor(OWNER_ID));
    const ownerBody = await ownerResponse.json();

    assert.equal(ownerResponse.status, 200);
    assert.equal(ownerBody.success, true);
    assert.equal(ownerBody.message, "Matches fetched");
    assert.equal(ownerBody.data.lostItem._id, LOST_ITEM_ID);
    assert.equal(ownerBody.data.matchCount, 2);
    assert.deepEqual(
      ownerBody.data.matches.map((match) => match.foundItem._id),
      [foundItems[0]._id, foundItems[1]._id],
    );
    assert.deepEqual(
      ownerBody.data.matches.map((match) => match.score),
      [100, 81],
    );
    assert.ok(ownerBody.data.matches[0].score > ownerBody.data.matches[1].score);

    for (const match of ownerBody.data.matches) {
      assert.ok(match.foundItem.sourceMarker === "found-query-layer");
      assert.equal(typeof match.score, "number");
      assert.equal(typeof match.level, "string");
      assert.ok(Array.isArray(match.reasons));
      assert.ok(Array.isArray(match.matchedFields));
    }

    assert.deepEqual(queryCalls[0], {
      model: "LostItem",
      operation: "findById",
      id: LOST_ITEM_ID,
    });
    assert.deepEqual(queryCalls[1], {
      model: "FoundItem",
      operation: "find",
      filter: { status: "found" },
    });
    assert.equal(queryCalls[2].operation, "populate");
    assert.equal(queryCalls[2].path, "createdBy");

    const unauthorizedResponse = await request(
      server,
      `/api/match/lost/${LOST_ITEM_ID}`,
      tokenFor(OTHER_USER_ID),
    );
    const unauthorizedBody = await unauthorizedResponse.json();

    assert.equal(unauthorizedResponse.status, 403);
    assert.deepEqual(unauthorizedBody, {
      success: false,
      message: "Unauthorized access",
      error: null,
    });

    const invalidIdResponse = await request(server, "/api/match/lost/not-an-object-id", tokenFor(OWNER_ID));
    const invalidIdBody = await invalidIdResponse.json();

    assert.equal(invalidIdResponse.status, 400);
    assert.deepEqual(invalidIdBody, {
      success: false,
      message: "Invalid lost item id",
      error: null,
    });

    const missingResponse = await request(server, `/api/match/lost/${MISSING_ITEM_ID}`, tokenFor(OWNER_ID));
    const missingBody = await missingResponse.json();

    assert.equal(missingResponse.status, 404);
    assert.deepEqual(missingBody, {
      success: false,
      message: "Lost item not found",
      error: null,
    });

    const noTokenResponse = await request(server, `/api/match/lost/${LOST_ITEM_ID}`);
    const noTokenBody = await noTokenResponse.json();

    assert.equal(noTokenResponse.status, 401);
    assert.deepEqual(noTokenBody, { message: "No token provided" });
  } finally {
    LostItem.findById = originalFindById;
    FoundItem.find = originalFoundFind;
    await new Promise((resolve) => server.close(resolve));
  }
});