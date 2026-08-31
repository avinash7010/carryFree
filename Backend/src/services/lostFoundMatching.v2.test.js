import test from "node:test";
import assert from "node:assert/strict";

import { findRankedMatchesForLostItem, scoreFoundItemMatch } from "./lostFoundMatching.service.js";

const makeLostItem = (overrides = {}) => ({
  title: "Apple AirPods Pro",
  description: "Wireless earbuds in black case with charging cable",
  category: "electronics",
  location: "Central Library 2nd Floor",
  dateLost: "2026-08-29",
  color: "black",
  ...overrides,
});

const makeFoundItem = (overrides = {}) => ({
  title: "Apple AirPods Pro",
  description: "Wireless earbuds in black case with charging cable",
  category: "electronics",
  location: "Central Library 2nd Floor",
  dateFound: "2026-08-29",
  color: "black",
  status: "found",
  ...overrides,
});

const isReturned = (lostItem, foundItem) =>
  findRankedMatchesForLostItem({ lostItem, foundItems: [foundItem] }).length === 1;

test("V2 generic title does not create meaningful identity evidence", () => {
  const lostItem = makeLostItem({ title: "Item", description: "Something I lost" });
  const foundItem = makeFoundItem({ title: "Item", description: "Item found there" });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result, "Expected a diagnostic score for a hard-filter-valid candidate");
  assert.equal(result.score, 55);
  assert.equal(isReturned(lostItem, foundItem), false);
  assert.ok(!result.matchedFields.includes("title"));
});

test("V2 context-only agreement is not returned", () => {
  const lostItem = makeLostItem({ title: "Black calculator", description: "Item" });
  const foundItem = makeFoundItem({ title: "Black calculator", description: "Thing" });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result, "Expected a diagnostic score for a hard-filter-valid candidate");
  assert.equal(isReturned(lostItem, foundItem), false);
  assert.ok(result.score < 60);
});

test("V2 distinctive feature overlap provides strong identity evidence", () => {
  const lostItem = makeLostItem({
    title: "HP laptop with Spider-Man sticker",
    description: "Silver HP laptop with Spider-Man sticker beside the trackpad",
    color: "silver",
  });
  const foundItem = makeFoundItem({
    title: "HP notebook with Spider-Man sticker",
    description: "HP notebook with Spider-Man sticker beside the trackpad",
    color: "silver",
  });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result, "Expected a scored candidate");
  assert.ok(result.score >= 75, `Expected a strong score, got ${result.score}`);
  assert.ok(isReturned(lostItem, foundItem));
  assert.ok(result.matchedFields.includes("title"));
  assert.ok(result.matchedFields.includes("description"));
  assert.ok(result.reasons.includes("Distinctive description similarity"));
});

test("V2 contradictory color meaningfully reduces confidence", () => {
  const lostItem = makeLostItem();
  const foundItem = makeFoundItem({ color: "white" });

  const result = scoreFoundItemMatch({ lostItem, foundItem });
  const matchingColorResult = scoreFoundItemMatch({
    lostItem,
    foundItem: makeFoundItem(),
  });

  assert.ok(result);
  assert.equal(result.score, 80);
  assert.equal(matchingColorResult.score - result.score, 20);
  assert.ok(result.reasons.includes("Different color"));
});

test("V2 missing color remains neutral for a strong textual match", () => {
  const lostItem = makeLostItem({ color: "black" });
  const foundItem = makeFoundItem({ color: null });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result);
  assert.equal(result.score, 90);
  assert.equal(result.level, "very_strong");
  assert.ok(isReturned(lostItem, foundItem));
  assert.ok(!result.reasons.includes("Same color"));
});

test("V2 unrelated location reduces but does not destroy strong identity", () => {
  const lostItem = makeLostItem();
  const foundItem = makeFoundItem({ location: "North Campus Cafeteria" });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result);
  assert.equal(result.score, 77);
  assert.equal(result.level, "strong");
  assert.ok(isReturned(lostItem, foundItem));
  assert.ok(result.reasons.includes("Unrelated location"));
});

test("V2 exact meaningful identity remains very strong", () => {
  const lostItem = makeLostItem();
  const foundItem = makeFoundItem();

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result);
  assert.equal(result.score, 100);
  assert.equal(result.level, "very_strong");
  assert.equal(isReturned(lostItem, foundItem), true);
});

test("V2 common item title alone does not establish a match", () => {
  const lostItem = makeLostItem({
    title: "Black calculator",
    description: "TI-84 with scratched screen and clear case",
  });
  const foundItem = makeFoundItem({
    title: "Black calculator",
    description: "Casio with intact screen and blue case",
  });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result);
  assert.ok(!result.matchedFields.includes("title"));
  assert.notEqual(result.level, "very_strong");
  assert.ok(result.score < 90, `Expected common-item evidence to stay below very strong, got ${result.score}`);
});