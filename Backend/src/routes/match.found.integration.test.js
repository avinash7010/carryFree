import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import express from "express";
import jwt from "jsonwebtoken";

import LostItem from "../models/LostItem.js";
import FoundItem from "../models/FoundItem.js";
import matchRoutes from "./match.routes.js";

const JWT_SECRET = "found-match-integration-test-secret";
const OWNER_ID = "64c000000000000000000001";
const OTHER_USER_ID = "64c000000000000000000002";
const FOUND_ITEM_ID = "64c000000000000000000010";
const MISSING_ITEM_ID = "64c000000000000000000099";

const foundItem = {
  _id: FOUND_ITEM_ID,
  title: "Apple AirPods Pro",
  description: "Wireless earbuds in black case with charging cable",
  category: "electronics",
  location: "Central Library 2nd Floor",
  dateFound: "2026-08-29",
  color: "black",
  status: "found",
  createdBy: OWNER_ID,
};

const lostItems = [
  {
    _id: "64c000000000000000000101",
    title: "Apple AirPods Pro",
    description: "Wireless earbuds in black case with charging cable",
    category: "electronics",
    location: "Central Library 2nd Floor",
    dateLost: "2026-08-29",
    color: "black",
    status: "lost",
    createdBy: { _id: "64c000000000000000000201", name: "Owner One" },
    sourceMarker: "lost-query-layer",
  },
  {
    _id: "64c000000000000000000102",
    title: "AirPods Pro",
    description: "Black wireless earbuds with charging case",
    category: "electronics",
    location: "Central Library",
    dateLost: "2026-08-28",
    color: "black",
    status: "lost",
    createdBy: { _id: "64c000000000000000000202", name: "Owner Two" },
    sourceMarker: "lost-query-layer",
  },
  {
    _id: "64c000000000000000000103",
    title: "Black phone",
    description: "Thing",
    category: "electronics",
    location: "Central Library 2nd Floor",
    dateLost: "2026-08-29",
    color: "black",
    status: "lost",
    createdBy: { _id: "64c000000000000000000203", name: "Owner Three" },
    sourceMarker: "lost-query-layer",
  },
  {
    _id: "64c000000000000000000104",
    title: "Apple AirPods Pro",
    description: "Wireless earbuds in black case with charging cable",
    category: "clothing",
    location: "Central Library 2nd Floor",
    dateLost: "2026-08-29",
    color: "black",
    status: "lost",
    createdBy: { _id: "64c000000000000000000204", name: "Owner Four" },
    sourceMarker: "lost-query-layer",
  },
  {
    _id: "64c000000000000000000105",
    title: "Apple AirPods Pro",
    description: "Wireless earbuds in black case with charging cable",
    category: "electronics",
    location: "Central Library 2nd Floor",
    dateLost: "2026-08-30",
    color: "black",
    status: "lost",
    sourceMarker: "lost-query-layer",
  },
  {
    _id: "64c000000000000000000106",
    title: "Apple AirPods Pro",
    description: "Wireless earbuds in black case with charging cable",
    category: "electronics",
    location: "Central Library 2nd Floor",
    dateLost: "2026-08-29",
    color: "white",
    status: "lost",
    sourceMarker: "lost-query-layer",
  },
  {
    _id: "64c000000000000000000107",
    title: "Apple AirPods Pro",
    description: "Wireless earbuds in black case with charging cable",
    category: "electronics",
    location: "North Campus Cafeteria",
    dateLost: "2026-08-29",
    color: "black",
    status: "lost",
    sourceMarker: "lost-query-layer",
  },
  {
    _id: "64c000000000000000000108",
    title: "Apple AirPods Pro",
    description: "Wireless earbuds in black case with charging cable",
    category: "electronics",
    location: "Central Library 2nd Floor",
    dateLost: "2026-08-29",
    color: "black",
    status: "claimed",
    sourceMarker: "lost-query-layer",
  },
  {
    _id: "64c000000000000000000109",
    title: "Apple AirPods Pro",
    description: "Wireless earbuds in black case with charging cable",
    category: "electronics",
    location: "Central Library 2nd Floor",
    dateLost: "2026-08-29",
    color: "black",
    status: "found",
    sourceMarker: "lost-query-layer",
  },
];

const tokenFor = (userId) => jwt.sign({ id: userId, role: "user" }, JWT_SECRET);

const request = async (server, path, token) => {
  const address = server.address();
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  return fetch(`http://127.0.0.1:${address.port}${path}`, { headers });
};

test("GET /api/match/found/:id follows the reverse authenticated endpoint flow", async () => {
  process.env.JWT_SECRET = JWT_SECRET;

  const originalFoundFindById = FoundItem.findById;
  const originalLostFind = LostItem.find;
  const queryCalls = [];

  FoundItem.findById = async (id) => {
    queryCalls.push({ model: "FoundItem", operation: "findById", id });
    return id === FOUND_ITEM_ID ? foundItem : null;
  };

  LostItem.find = (filter) => {
    queryCalls.push({ model: "LostItem", operation: "find", filter });
    return {
      populate: async (path, select) => {
        queryCalls.push({ model: "LostItem", operation: "populate", path, select });
        return lostItems;
      },
    };
  };

  const app = express();
  app.use(express.json());
  app.use("/api/match", matchRoutes);
  const server = http.createServer(app);

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    const ownerResponse = await request(server, `/api/match/found/${FOUND_ITEM_ID}`, tokenFor(OWNER_ID));
    const ownerBody = await ownerResponse.json();

    assert.equal(ownerResponse.status, 200);
    assert.equal(ownerBody.success, true);
    assert.equal(ownerBody.message, "Matches fetched");
    assert.equal(ownerBody.data.foundItem._id, FOUND_ITEM_ID);
    assert.equal(ownerBody.data.matchCount, 4);
    assert.deepEqual(
      ownerBody.data.matches.map((match) => match.lostItem._id),
      [lostItems[0]._id, lostItems[1]._id, lostItems[5]._id, lostItems[6]._id],
    );
    assert.deepEqual(
      ownerBody.data.matches.map((match) => match.score),
      [100, 81, 80, 77],
    );
    assert.ok(ownerBody.data.matches.every((match, index, matches) =>
      index === 0 || matches[index - 1].score >= match.score));

    for (const match of ownerBody.data.matches) {
      assert.equal(match.lostItem.sourceMarker, "lost-query-layer");
      assert.equal(typeof match.score, "number");
      assert.equal(typeof match.level, "string");
      assert.ok(Array.isArray(match.reasons));
      assert.ok(Array.isArray(match.matchedFields));
    }

    assert.deepEqual(queryCalls[0], {
      model: "FoundItem",
      operation: "findById",
      id: FOUND_ITEM_ID,
    });
    assert.deepEqual(queryCalls[1], {
      model: "LostItem",
      operation: "find",
      filter: { status: "lost" },
    });
    assert.equal(queryCalls[2].operation, "populate");
    assert.equal(queryCalls[2].path, "createdBy");

    const unauthorizedResponse = await request(
      server,
      `/api/match/found/${FOUND_ITEM_ID}`,
      tokenFor(OTHER_USER_ID),
    );
    const unauthorizedBody = await unauthorizedResponse.json();

    assert.equal(unauthorizedResponse.status, 403);
    assert.deepEqual(unauthorizedBody, {
      success: false,
      message: "Unauthorized access",
      error: null,
    });

    const invalidIdResponse = await request(server, "/api/match/found/not-an-object-id", tokenFor(OWNER_ID));
    const invalidIdBody = await invalidIdResponse.json();

    assert.equal(invalidIdResponse.status, 400);
    assert.deepEqual(invalidIdBody, {
      success: false,
      message: "Invalid found item id",
      error: null,
    });

    const missingResponse = await request(server, `/api/match/found/${MISSING_ITEM_ID}`, tokenFor(OWNER_ID));
    const missingBody = await missingResponse.json();

    assert.equal(missingResponse.status, 404);
    assert.deepEqual(missingBody, {
      success: false,
      message: "Found item not found",
      error: null,
    });
  } finally {
    FoundItem.findById = originalFoundFindById;
    LostItem.find = originalLostFind;
    await new Promise((resolve) => server.close(resolve));
  }
});