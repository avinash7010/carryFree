import test from "node:test";
import assert from "node:assert/strict";

import { findRankedMatchesForLostItem, scoreFoundItemMatch } from "./lostFoundMatching.service.js";

const TRUE_MATCH = "TRUE_MATCH";
const FALSE_MATCH = "FALSE_MATCH";

const lost = (overrides = {}) => ({
  title: "Apple AirPods Pro",
  description: "Wireless earbuds in black case with charging cable",
  category: "electronics",
  location: "Central Library 2nd Floor",
  dateLost: "2026-08-29",
  color: "black",
  ...overrides,
});

const found = (overrides = {}) => ({
  title: "Apple AirPods Pro",
  description: "Wireless earbuds in black case with charging cable",
  category: "electronics",
  location: "Central Library 2nd Floor",
  dateFound: "2026-08-29",
  color: "black",
  status: "found",
  ...overrides,
});

const scenarios = [
  {
    name: "clear exact AirPods match",
    lostItem: lost(),
    foundItems: [found()],
    expected: TRUE_MATCH,
  },
  {
    name: "strong textual match with abbreviated title",
    lostItem: lost(),
    foundItems: [found({ title: "AirPods Pro", description: "Black wireless earbuds with charging case" })],
    expected: TRUE_MATCH,
  },
  {
    name: "same category but unrelated physical item",
    lostItem: lost(),
    foundItems: [found({ title: "USB-C laptop charger", description: "White power adapter with long cable", color: "white" })],
    expected: FALSE_MATCH,
  },
  {
    name: "same title but distinctive description",
    lostItem: lost({ title: "Black leather wallet", description: "Slim wallet with family photo and three cards", category: "accessories", color: "black" }),
    foundItems: [found({ title: "Black leather wallet", description: "Large brown wallet with coin pouch", category: "accessories", color: "brown" })],
    expected: FALSE_MATCH,
  },
  {
    name: "same color but different item",
    lostItem: lost({ title: "Black Kindle Paperwhite", description: "E-reader with floral case", category: "electronics" }),
    foundItems: [found({ title: "Black phone", description: "Android phone in a rubber case", category: "electronics" })],
    expected: FALSE_MATCH,
  },
  {
    name: "same item with different wording",
    lostItem: lost({ title: "Silver commuter bicycle", description: "Hybrid bike with rear rack and red bell", category: "sports", color: "silver" }),
    foundItems: [found({ title: "Commuter hybrid bike", description: "Silver bicycle, rack at back, red bell", category: "sports", color: "silver" })],
    expected: TRUE_MATCH,
  },
  {
    name: "same location but different item",
    lostItem: lost({ title: "Blue water bottle", description: "Insulated bottle with mountain sticker", category: "containers", color: "blue" }),
    foundItems: [found({ title: "Blue umbrella", description: "Compact rain umbrella", category: "containers", location: "Central Library 2nd Floor", color: "blue" })],
    expected: FALSE_MATCH,
  },
  {
    name: "clearly different locations",
    lostItem: lost({ location: "Central Library 2nd Floor" }),
    foundItems: [found({ location: "North Campus Cafeteria" })],
    expected: FALSE_MATCH,
  },
  {
    name: "missing found color",
    lostItem: lost({ color: "black" }),
    foundItems: [found({ color: null })],
    expected: TRUE_MATCH,
  },
  {
    name: "missing found description",
    lostItem: lost({ description: "Wireless earbuds in black case with charging cable" }),
    foundItems: [found({ description: null })],
    expected: TRUE_MATCH,
  },
  {
    name: "generic descriptions with weak identity",
    lostItem: lost({ title: "Item", description: "Something I lost" }),
    foundItems: [found({ title: "Item", description: "Item found there" })],
    expected: FALSE_MATCH,
  },
  {
    name: "minor typographical variations",
    lostItem: lost({ title: "Apple AirPods Pro" }),
    foundItems: [found({ title: "Apple Airpod Pro", description: "Wireless earbud in black case with charging cable" })],
    expected: TRUE_MATCH,
  },
  {
    name: "same day exact details",
    lostItem: lost(),
    foundItems: [found({ dateFound: "2026-08-29" })],
    expected: TRUE_MATCH,
  },
  {
    name: "seven day date gap with matching identity",
    lostItem: lost({ dateLost: "2026-08-01" }),
    foundItems: [found({ dateFound: "2026-08-08" })],
    expected: TRUE_MATCH,
  },
  {
    name: "thirty day date gap with matching identity",
    lostItem: lost({ dateLost: "2026-08-01" }),
    foundItems: [found({ dateFound: "2026-08-31" })],
    expected: TRUE_MATCH,
  },
  {
    name: "more than thirty day date gap",
    lostItem: lost({ dateLost: "2026-08-01" }),
    foundItems: [found({ dateFound: "2026-09-01" })],
    expected: FALSE_MATCH,
  },
  {
    name: "found before lost",
    lostItem: lost({ dateLost: "2026-08-29" }),
    foundItems: [found({ dateFound: "2026-08-28" })],
    expected: FALSE_MATCH,
  },
  {
    name: "different category despite exact title",
    lostItem: lost({ category: "electronics" }),
    foundItems: [found({ category: "clothing" })],
    expected: FALSE_MATCH,
  },
  {
    name: "multiple plausible candidates with one best match",
    lostItem: lost(),
    foundItems: [
      found({ title: "Black headphones", description: "Wireless headphones with case", color: "black" }),
      found({ title: "Apple AirPods Pro", description: "Wireless earbuds in black case with charging cable", color: "black" }),
      found({ title: "Black earbuds", description: "Wireless earbuds found near a desk", color: "black" }),
    ],
    targetIndex: 1,
    expected: TRUE_MATCH,
  },
  {
    name: "duplicate reports for the same physical item",
    lostItem: lost(),
    foundItems: [
      found({ title: "Apple AirPods Pro", description: "Black AirPods case with charging cable" }),
      found({ title: "Apple AirPods Pro", description: "Wireless earbuds in black charging case" }),
    ],
    expected: TRUE_MATCH,
  },
  {
    name: "same title but contradictory color",
    lostItem: lost({ title: "AirPods Pro", color: "black" }),
    foundItems: [found({ title: "AirPods Pro", color: "white" })],
    expected: FALSE_MATCH,
  },
  {
    name: "partial location overlap with floor detail",
    lostItem: lost({ location: "Central Library" }),
    foundItems: [found({ location: "Central Library 2nd Floor" })],
    expected: TRUE_MATCH,
  },
  {
    name: "different item with same location and date",
    lostItem: lost({ title: "Graphing calculator", description: "TI calculator with scratched screen", category: "school supplies", color: "black" }),
    foundItems: [found({ title: "Scientific calculator", description: "Casio calculator in good condition", category: "school supplies", color: "black" })],
    expected: FALSE_MATCH,
  },
  {
    name: "strong identity with no color information on either report",
    lostItem: lost({ color: null }),
    foundItems: [found({ color: null })],
    expected: TRUE_MATCH,
  },
];

const formatScore = (result) => (result ? String(result.score) : "-");

test("EVALUATION: synthetic LostItem/FoundItem scenarios", () => {
  assert.equal(scenarios.length, 24);

  const results = scenarios.map((scenario) => {
    const targetIndex = scenario.targetIndex ?? 0;
    const target = scenario.foundItems[targetIndex];
    const scored = scoreFoundItemMatch({ lostItem: scenario.lostItem, foundItem: target });
    const ranked = findRankedMatchesForLostItem({
      lostItem: scenario.lostItem,
      foundItems: scenario.foundItems,
    });
    const returned = ranked.some((candidate) => candidate.foundItem === target);
    const result = {
      scenario: scenario.name,
      expected: scenario.expected,
      score: formatScore(scored),
      returned: returned ? "RETURNED" : "NOT_RETURNED",
      level: scored?.level ?? "rejected",
      outcome:
        (scenario.expected === TRUE_MATCH) === returned ? "EXPECTED" : "MISMATCH",
    };

    console.log(
      `${result.scenario} | ${result.expected} | score=${result.score} | ${result.returned} | level=${result.level} | ${result.outcome}`,
    );

    return result;
  });

  const mismatches = results.filter((result) => result.outcome === "MISMATCH");
  console.log(`Evaluation summary: ${mismatches.length} mismatch(es) out of ${results.length} scenarios.`);
});