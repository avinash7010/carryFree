import test from "node:test";
import assert from "node:assert/strict";

import FoundItem from "../models/FoundItem.js";
import LostItem from "../models/LostItem.js";
import Notification from "../models/Notification.js";
import { createFoundItem } from "../controllers/foundItem.controller.js";
import { createLostItem } from "../controllers/lostItem.controller.js";
import {
  notifyMatchesForFoundItem,
  notifyMatchesForLostItem,
} from "./lostFoundMatchNotification.service.js";

const ownerA = "64d000000000000000000001";
const ownerB = "64d000000000000000000002";

const makeLostItem = (overrides = {}) => ({
  _id: "64d000000000000000000101",
  title: "Apple AirPods Pro",
  description: "Wireless earbuds in black case with small blue sticker",
  category: "electronics",
  location: "Library 2nd Floor",
  dateLost: "2026-08-29",
  color: "black",
  status: "lost",
  createdBy: ownerA,
  ...overrides,
});

const makeFoundItem = (overrides = {}) => ({
  _id: "64d000000000000000000201",
  title: "AirPods Pro",
  description: "Black wireless earbuds with small blue sticker on case",
  category: "electronics",
  location: "Library",
  dateFound: "2026-08-29",
  color: "black",
  status: "found",
  createdBy: ownerB,
  ...overrides,
});

const withStubs = async ({ foundItems = [], lostItems = [], notificationStore = [] }, callback) => {
  const originalFoundFind = FoundItem.find;
  const originalLostFind = LostItem.find;
  const originalNotificationFindOne = Notification.findOne;
  const originalNotificationInsertMany = Notification.insertMany;

  FoundItem.find = async () => foundItems;
  LostItem.find = async () => lostItems;
  Notification.findOne = async (query) => notificationStore.find((notification) =>
    String(notification.userId) === String(query.userId) &&
    notification.type === query.type &&
    notification.metadata?.matchKey === query["metadata.matchKey"]
  );
  Notification.insertMany = async (notifications) => {
    notificationStore.push(...notifications);
  };

  try {
    await callback(notificationStore);
  } finally {
    FoundItem.find = originalFoundFind;
    LostItem.find = originalLostFind;
    Notification.findOne = originalNotificationFindOne;
    Notification.insertMany = originalNotificationInsertMany;
  }
};

test("matching a new LostItem notifies the matching FoundItem owner", async () => {
  const notifications = [];

  await withStubs({ foundItems: [makeFoundItem()], notificationStore: notifications }, async () => {
    await notifyMatchesForLostItem(makeLostItem());
  });

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].userId, ownerB);
  assert.equal(notifications[0].title, "Potential match found");
  assert.match(notifications[0].message, /A FoundItem may match your lost report/);
  assert.deepEqual(notifications[0].metadata, {
    matchKey: `${ownerB}:64d000000000000000000101:64d000000000000000000201`,
    lostItemId: "64d000000000000000000101",
    foundItemId: "64d000000000000000000201",
    score: 83,
    level: "strong",
    matchedFields: ["category", "title", "description", "location", "color", "date"],
  });
});

test("matching a new FoundItem notifies the matching LostItem owner", async () => {
  const notifications = [];

  await withStubs({ lostItems: [makeLostItem()], notificationStore: notifications }, async () => {
    await notifyMatchesForFoundItem(makeFoundItem());
  });

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].userId, ownerA);
  assert.match(notifications[0].message, /A LostItem may match an item you reported as found/);
  assert.equal(notifications[0].metadata.lostItemId, "64d000000000000000000101");
  assert.equal(notifications[0].metadata.foundItemId, "64d000000000000000000201");
  assert.equal(notifications[0].metadata.score, 83);
  assert.equal(notifications[0].metadata.level, "strong");
  assert.deepEqual(notifications[0].metadata.matchedFields, [
    "category",
    "title",
    "description",
    "location",
    "color",
    "date",
  ]);
});

test("no match and bad candidates create no notifications", async () => {
  const notifications = [];

  await withStubs({
    foundItems: [makeFoundItem({ title: "Unrelated charger", description: "Power adapter", category: "electronics" })],
    notificationStore: notifications,
  }, async () => {
    await notifyMatchesForLostItem(makeLostItem());
  });

  assert.deepEqual(notifications, []);
});

test("the creator is not notified about a matching item they also created", async () => {
  const notifications = [];

  await withStubs({
    foundItems: [makeFoundItem({ createdBy: ownerA })],
    notificationStore: notifications,
  }, async () => {
    await notifyMatchesForLostItem(makeLostItem());
  });

  assert.deepEqual(notifications, []);
});

test("the same match does not create a duplicate notification", async () => {
  const notifications = [];

  await withStubs({ foundItems: [makeFoundItem()], notificationStore: notifications }, async () => {
    await notifyMatchesForLostItem(makeLostItem());
    await notifyMatchesForLostItem(makeLostItem());
  });

  assert.equal(notifications.length, 1);
});

test("matching query failure is swallowed after item creation", async () => {
  const originalFoundFind = FoundItem.find;
  FoundItem.find = async () => {
    throw new Error("candidate query failed");
  };

  try {
    await assert.doesNotReject(() => notifyMatchesForLostItem(makeLostItem()));
  } finally {
    FoundItem.find = originalFoundFind;
  }
});

test("notification failure is swallowed after item creation", async () => {
  const originalFoundFind = FoundItem.find;
  const originalNotificationFindOne = Notification.findOne;
  const originalNotificationInsertMany = Notification.insertMany;
  FoundItem.find = async () => [makeFoundItem()];
  Notification.findOne = async () => null;
  Notification.insertMany = async () => {
    throw new Error("notification insert failed");
  };

  try {
    await assert.doesNotReject(() => notifyMatchesForLostItem(makeLostItem()));
  } finally {
    FoundItem.find = originalFoundFind;
    Notification.findOne = originalNotificationFindOne;
    Notification.insertMany = originalNotificationInsertMany;
  }
});

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("LostItem creation stays successful when post-create matching fails", async () => {
  const originalCreate = LostItem.create;
  const originalFoundFind = FoundItem.find;
  LostItem.create = async (payload) => ({ ...makeLostItem(), ...payload });
  FoundItem.find = async () => {
    throw new Error("matching unavailable");
  };

  try {
    const response = makeResponse();
    await createLostItem({
      body: {
        title: "AirPods",
        description: "Wireless earbuds",
        category: "electronics",
        location: "Library",
        dateLost: "2026-08-29",
      },
      user: { id: ownerA },
    }, response);
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
  } finally {
    LostItem.create = originalCreate;
    FoundItem.find = originalFoundFind;
  }
});

test("FoundItem creation stays successful when post-create matching fails", async () => {
  const originalCreate = FoundItem.create;
  const originalLostFind = LostItem.find;
  FoundItem.create = async (payload) => ({ ...makeFoundItem(), ...payload });
  LostItem.find = async () => {
    throw new Error("matching unavailable");
  };

  try {
    const response = makeResponse();
    await createFoundItem({
      body: {
        title: "AirPods",
        description: "Wireless earbuds",
        category: "electronics",
        location: "Library",
        dateFound: "2026-08-29",
      },
      user: { id: ownerB },
    }, response);
    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
  } finally {
    FoundItem.create = originalCreate;
    LostItem.find = originalLostFind;
  }
});