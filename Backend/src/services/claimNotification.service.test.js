import test from "node:test";
import assert from "node:assert/strict";
import Notification from "../models/Notification.js";
import { notifyUsers } from "./notification.service.js";

test("claim notification sends notification to finder with correct recipient and deduplication", async () => {
  const notifications = [];
  const originalFindOne = Notification.findOne;
  const originalInsertMany = Notification.insertMany;

  Notification.findOne = async (query) => {
    return notifications.find(
      (n) => String(n.userId) === String(query.userId) &&
             n.type === query.type &&
             n.metadata?.matchKey === query["metadata.matchKey"]
    );
  };
  Notification.insertMany = async (docs) => {
    notifications.push(...docs);
  };

  try {
    const finderId = "finder-123";
    const claimId = "claim-abc";

    const payload = [{
      userId: finderId,
      type: "claim_received",
      title: "New Claim Received",
      message: "Someone submitted a claim for your found item.",
      metadata: { claimId, matchKey: `claim:${claimId}:received` }
    }];

    // First call
    await notifyUsers(payload);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].userId, finderId);
    assert.equal(notifications[0].type, "claim_received");

    // Second call with same matchKey (duplicate)
    await notifyUsers(payload);
    assert.equal(notifications.length, 1, "Duplicate notification should not be created");

  } finally {
    Notification.findOne = originalFindOne;
    Notification.insertMany = originalInsertMany;
  }
});

test("claim approval and rejection send notifications to claimant safely", async () => {
  const notifications = [];
  const originalFindOne = Notification.findOne;
  const originalInsertMany = Notification.insertMany;

  Notification.findOne = async () => null;
  Notification.insertMany = async (docs) => {
    notifications.push(...docs);
  };

  try {
    const claimantId = "claimant-456";
    const claimId = "claim-xyz";

    // Approval notification
    await notifyUsers([{
      userId: claimantId,
      type: "claim_approved",
      title: "Claim Approved",
      message: "Your claim was approved.",
      metadata: { claimId, matchKey: `claim:${claimId}:approved` }
    }]);

    // Rejection notification
    await notifyUsers([{
      userId: claimantId,
      type: "claim_rejected",
      title: "Claim Rejected",
      message: "Your claim was rejected.",
      metadata: { claimId, matchKey: `claim:${claimId}:rejected` }
    }]);

    assert.equal(notifications.length, 2);
    assert.equal(notifications[0].userId, claimantId);
    assert.equal(notifications[0].type, "claim_approved");
    assert.equal(notifications[1].userId, claimantId);
    assert.equal(notifications[1].type, "claim_rejected");

  } finally {
    Notification.findOne = originalFindOne;
    Notification.insertMany = originalInsertMany;
  }
});

test("notification failure is swallowed and does not throw or break flow", async () => {
  const originalInsertMany = Notification.insertMany;
  Notification.insertMany = async () => {
    throw new Error("DB connection failed");
  };

  try {
    // Should not throw
    await notifyUsers([{
      userId: "user-1",
      type: "claim_received",
      title: "Test",
      message: "Test",
      metadata: { matchKey: "test:key" }
    }]);
    assert.ok(true, "Notification failure was successfully isolated/swallowed");
  } finally {
    Notification.insertMany = originalInsertMany;
  }
});

test("invalid or missing recipient/fields are filtered out safely", async () => {
  const notifications = [];
  const originalInsertMany = Notification.insertMany;
  Notification.insertMany = async (docs) => {
    notifications.push(...docs);
  };

  try {
    await notifyUsers([
      { type: "claim_received", title: "Missing userId", message: "Msg" }, // invalid
      { userId: null, type: "claim_received", title: "Null userId", message: "Msg" }, // invalid
      { userId: "user-valid", type: "claim_received", title: "Valid", message: "Msg" } // valid
    ]);

    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].userId, "user-valid");
  } finally {
    Notification.insertMany = originalInsertMany;
  }
});
