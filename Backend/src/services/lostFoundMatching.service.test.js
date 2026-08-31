import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateDateProximityScore,
  calculateTokenSimilarity,
  findRankedMatchesForLostItem,
  normalizeText,
  scoreFoundItemMatch,
} from "./lostFoundMatching.service.js";

const makeLostItem = (overrides = {}) => ({
  title: "Apple AirPods Pro",
  description: "Wireless earbuds in black case with charging cable",
  category: "electronics",
  location: "Library 2nd Floor",
  dateLost: "2026-08-29",
  color: "black",
  ...overrides,
});

const makeFoundItem = (overrides = {}) => ({
  title: "Apple AirPods Pro",
  description: "Wireless earbuds in black case with charging cable",
  category: "electronics",
  location: "Library 2nd Floor",
  dateFound: "2026-08-29",
  color: "black",
  status: "found",
  ...overrides,
});

test("PERFECT / VERY STRONG MATCH receives a very high score and is classified as very_strong", () => {
  const lostItem = makeLostItem();
  const foundItem = makeFoundItem();

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result, "Expected a scored match");
  assert.equal(result.level, "very_strong");
  assert.ok(result.score >= 90, `Expected score >= 90, got ${result.score}`);
  assert.ok(result.matchedFields.includes("category"));
  assert.ok(result.matchedFields.includes("title"));
  assert.ok(result.matchedFields.includes("description"));
  assert.ok(result.matchedFields.includes("location"));
  assert.ok(result.matchedFields.includes("color"));
  assert.ok(result.matchedFields.includes("date"));
});

test("DIFFERENT CATEGORY is rejected completely and not returned in ranked matches", () => {
  const lostItem = makeLostItem();
  const foundItem = makeFoundItem({ category: "clothing", title: "Black hoodie" });

  const result = scoreFoundItemMatch({ lostItem, foundItem });
  assert.equal(result, null);

  const ranked = findRankedMatchesForLostItem({
    lostItem,
    foundItems: [foundItem],
  });

  assert.deepEqual(ranked, []);
});

test("SAME ITEM WITH PARTIAL TEXT DIFFERENCES still produces a strong candidate", () => {
  const lostItem = makeLostItem();
  const foundItem = makeFoundItem({
    title: "AirPods Pro",
    description: "Black wireless earbuds in a slim case",
    color: "black",
    dateFound: "2026-08-30",
  });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result, "Expected a valid candidate");
  assert.ok(result.score >= 60, `Expected at least possible match, got ${result.score}`);
  assert.ok(result.score >= 75 || result.level === "possible", "Expected strong or possible match for partial text match");
  assert.ok(result.matchedFields.includes("title"));
  assert.ok(result.matchedFields.includes("description"));
});

test("SAME LOCATION WITH MORE SPECIFIC FOUND LOCATION receives partial credit", () => {
  const lostItem = makeLostItem({ location: "Library" });
  const foundItem = makeFoundItem({
    location: "Library 2nd Floor",
    title: "AirPods Pro",
    description: "Black wireless earbuds",
    dateFound: "2026-08-30",
    color: "black",
  });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result, "Expected a valid candidate");
  assert.ok(result.matchedFields.includes("location"), "Expected location to contribute");
  assert.ok(result.score > 0, `Expected a positive score, got ${result.score}`);
});

test("DIFFERENT LOCATION does not incorrectly receive a high similarity score", () => {
  const lostItem = makeLostItem({ location: "Library" });
  const foundItem = makeFoundItem({
    location: "Cafeteria",
    title: "AirPods Pro",
    description: "Black wireless earbuds",
    dateFound: "2026-08-30",
    color: "black",
  });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result, "Expected a candidate to still pass category/date gating");
  assert.ok(!result.matchedFields.includes("location"), "Expected location signal to be absent");
  assert.ok(result.reasons.includes("Unrelated location"), "Expected an unrelated location reason");
  assert.ok(result.score < 70, `Expected a moderate score, got ${result.score}`);
});

test("SAME COLOR with different text casing is normalized and accepted", () => {
  const lostItem = makeLostItem({ color: "Black" });
  const foundItem = makeFoundItem({ color: "black" });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result, "Expected a valid match");
  assert.ok(result.matchedFields.includes("color"), "Expected color to match");
  assert.equal(normalizeText("Black"), "black");
  assert.equal(normalizeText("black"), "black");
});

test("DIFFERENT COLOR is treated as contradictory evidence and penalizes the score", () => {
  const lostItem = makeLostItem({ color: "Black" });
  const foundItem = makeFoundItem({ color: "Blue" });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result, "Expected the candidate to pass other filters");
  assert.ok(!result.matchedFields.includes("color"), "Expected color to be excluded from matchedFields");
  assert.ok(result.reasons.includes("Different color"), "Expected a color contradiction reason");
  assert.equal(result.score, 80, `Expected a 10-point color penalty, got ${result.score}`);
});

test("MISSING COLOR is neutral missing evidence rather than a contradiction", () => {
  const lostItem = makeLostItem({ color: "black" });
  const foundItem = makeFoundItem({ color: null });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result, "Expected the candidate to pass other filters");
  assert.ok(!result.matchedFields.includes("color"), "Expected missing color to be excluded from matchedFields");
  assert.ok(!result.reasons.includes("Same color"));
  assert.ok(!result.reasons.includes("Different color"));
  assert.equal(result.score, 90, "Expected missing color to remove positive evidence without a penalty");
});

test("STRONG MATCH WITHOUT COLOR INFORMATION remains a strong candidate", () => {
  const lostItem = makeLostItem({ color: null });
  const foundItem = makeFoundItem({ color: null });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result, "Expected a valid match without color information");
  assert.equal(result.score, 90);
  assert.equal(result.level, "very_strong");
  assert.ok(!result.matchedFields.includes("color"));
});

test("SAME DAY gets the maximum date score", () => {
  const score = calculateDateProximityScore("2026-08-29", "2026-08-29");

  assert.equal(score.points, 10);
  assert.equal(score.dayDifference, 0);
});

test("ONE DAY APART receives slightly less than same-day score", () => {
  const sameDay = calculateDateProximityScore("2026-08-29", "2026-08-29");
  const oneDayApart = calculateDateProximityScore("2026-08-29", "2026-08-30");

  assert.ok(oneDayApart.points < sameDay.points, `Expected 1-day gap to score lower than same-day score; got ${oneDayApart.points} vs ${sameDay.points}`);
  assert.ok(oneDayApart.points > 0, `Expected positive date score, got ${oneDayApart.points}`);
});

test("FOUND BEFORE LOST is rejected by the hard filter", () => {
  const lostItem = makeLostItem({ dateLost: "2026-08-29" });
  const foundItem = makeFoundItem({ dateFound: "2026-08-28" });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.equal(result, null);
});

test("EXTREMELY DISTANT FOUND DATE is rejected by the hard filter", () => {
  const lostItem = makeLostItem({ dateLost: "2026-08-29" });
  const foundItem = makeFoundItem({ dateFound: "2026-10-01" });

  const result = scoreFoundItemMatch({ lostItem, foundItem });
  const ranked = findRankedMatchesForLostItem({ lostItem, foundItems: [foundItem] });

  assert.equal(result, null);
  assert.deepEqual(ranked, []);
});

test("NON-FOUND STATUS is rejected", () => {
  const lostItem = makeLostItem();
  const foundItem = makeFoundItem({ status: "returned" });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.equal(result, null);
});

test("MULTIPLE CANDIDATES are filtered, ranked, and the highest-quality match appears first", () => {
  const lostItem = makeLostItem({
    title: "Apple AirPods Pro",
    description: "Wireless earbuds in black case with charging cable",
    category: "electronics",
    location: "Library",
    dateLost: "2026-08-29",
    color: "black",
  });

  const candidates = [
    makeFoundItem({
      title: "Apple AirPods Pro",
      description: "Wireless earbuds in black case with charging cable",
      category: "electronics",
      location: "Library",
      dateFound: "2026-08-29",
      color: "black",
      status: "found",
    }),
    makeFoundItem({
      title: "Headphones",
      description: "Wireless earbuds in black case",
      category: "electronics",
      location: "Library 2nd Floor",
      dateFound: "2026-08-30",
      color: "black",
      status: "found",
    }),
    makeFoundItem({
      title: "Blue backpack",
      description: "Blue backpack found at cafeteria",
      category: "electronics",
      location: "Cafeteria",
      dateFound: "2026-08-31",
      color: "blue",
      status: "found",
    }),
    makeFoundItem({
      title: "Random item",
      description: "Item found there",
      category: "electronics",
      location: "Cafeteria",
      dateFound: "2026-09-05",
      color: "green",
      status: "found",
    }),
  ];

  const ranked = findRankedMatchesForLostItem({ lostItem, foundItems: candidates });

  assert.ok(ranked.length >= 2, "Expected at least two valid candidates");
  assert.ok(ranked.every((candidate) => candidate.score >= 60), "Expected all returned candidates to be at or above 60");
  assert.ok(ranked[0].score >= ranked[1].score, "Expected descending score order");
  assert.equal(ranked[0].foundItem.title, "Apple AirPods Pro");
  assert.ok(ranked.some((candidate) => candidate.foundItem.title === "Headphones"));
  assert.ok(ranked.every((candidate) => candidate.score >= 60), "Expected below-60 candidates to be excluded");
});

test("GENERIC DESCRIPTION does not receive an unjustifiably high description score", () => {
  const lostItem = makeLostItem();
  const foundItem = makeFoundItem({
    title: "Random USB Cable",
    description: "Item found there",
    category: "electronics",
    location: "Library",
    dateFound: "2026-08-30",
    color: "black",
  });

  const result = scoreFoundItemMatch({ lostItem, foundItem });

  assert.ok(result, "Expected a valid candidate to pass hard filters");
  assert.ok(!result.matchedFields.includes("description"), "Expected generic description to contribute little or nothing");
});

test("EMPTY / MISSING OPTIONAL VALUES do not throw and do not produce NaN", () => {
  const lostItem = makeLostItem({ color: null, location: "Library" });
  const foundItem = makeFoundItem({ color: null, location: "Library", title: "AirPods Pro" });

  assert.doesNotThrow(() => {
    const result = scoreFoundItemMatch({ lostItem, foundItem });
    assert.ok(result, "Expected a valid result when optional values are missing");
    assert.ok(Number.isFinite(result.score), "Expected a finite numeric score");
  });
});

test("DUPLICATE TOKENS do not artificially inflate similarity", () => {
  const similarity = calculateTokenSimilarity("black black laptop", "black laptop");

  assert.equal(similarity, 1);
  assert.ok(Number.isFinite(similarity));
});
