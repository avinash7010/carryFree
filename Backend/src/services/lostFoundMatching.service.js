const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "with",
  "were",
]);

const MAX_DATE_GAP_DAYS = 30;
const COLOR_CONTRADICTION_PENALTY = 10;
const LOCATION_CONTRADICTION_PENALTY = 8;
const LOW_INFORMATION_TOKENS = new Set(["item", "thing", "stuff", "object"]);
const BROAD_ITEM_TOKENS = new Set(["phone", "bag", "bottle", "calculator"]);
const CONTEXT_TOKENS = new Set([
  ...LOW_INFORMATION_TOKENS,
  ...BROAD_ITEM_TOKENS,
  "black",
  "blue",
  "brown",
  "gray",
  "grey",
  "green",
  "orange",
  "pink",
  "purple",
  "red",
  "silver",
  "white",
  "yellow",
]);

export const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const tokenizeText = (value, options = {}) => {
  const { ignoreStopWords = true } = options;
  const normalized = normalizeText(value);

  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (!ignoreStopWords) {
    return tokens;
  }

  return tokens.filter((token) => !STOP_WORDS.has(token));
};

export const calculateTokenSimilarity = (leftValue, rightValue, options = {}) => {
  const { ignoreStopWords = true } = options;
  const leftTokens = tokenizeText(leftValue, { ignoreStopWords });
  const rightTokens = tokenizeText(rightValue, { ignoreStopWords });

  if (!leftTokens.length || !rightTokens.length) {
    return 0;
  }

  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  const intersectionCount = [...leftSet].filter((token) => rightSet.has(token)).length;
  const unionSize = new Set([...leftSet, ...rightSet]).size;

  if (unionSize === 0) {
    return 0;
  }

  return intersectionCount / unionSize;
};

const getIdentityTokens = (value) =>
  tokenizeText(value, { ignoreStopWords: true }).filter((token) => !CONTEXT_TOKENS.has(token));

const calculateIdentitySimilarity = (leftValue, rightValue) => {
  const leftTokens = getIdentityTokens(leftValue);
  const rightTokens = getIdentityTokens(rightValue);
  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  const sharedTokenCount = [...leftSet].filter((token) => rightSet.has(token)).length;
  const unionSize = new Set([...leftSet, ...rightSet]).size;

  return {
    similarity: unionSize ? sharedTokenCount / unionSize : 0,
    sharedTokenCount,
  };
};

const hasMeaningfulIdentityEvidence = (titleEvidence, descriptionEvidence) =>
  (titleEvidence.sharedTokenCount > 0 && titleEvidence.similarity >= 0.35) ||
  (descriptionEvidence.sharedTokenCount >= 2 && descriptionEvidence.similarity >= 0.2);

export const isHardCandidateMatch = (lostItem, foundItem) => {
  if (!lostItem || !foundItem) {
    return false;
  }

  if (lostItem.status && lostItem.status !== "lost") {
    return false;
  }

  if (foundItem.status !== "found") {
    return false;
  }

  if (normalizeText(foundItem.category) !== normalizeText(lostItem.category)) {
    return false;
  }

  const lostDate = lostItem.dateLost ? new Date(lostItem.dateLost) : null;
  const foundDate = foundItem.dateFound ? new Date(foundItem.dateFound) : null;

  if (!lostDate || !foundDate || Number.isNaN(lostDate.getTime()) || Number.isNaN(foundDate.getTime())) {
    return false;
  }

  if (foundDate < lostDate) {
    return false;
  }

  const differenceInDays = (foundDate - lostDate) / (1000 * 60 * 60 * 24);
  if (differenceInDays > MAX_DATE_GAP_DAYS) {
    return false;
  }

  return true;
};

export const calculateDateProximityScore = (lostDateValue, foundDateValue) => {
  if (!lostDateValue || !foundDateValue) {
    return { points: 0, dayDifference: null };
  }

  const lostDate = new Date(lostDateValue);
  const foundDate = new Date(foundDateValue);

  if (Number.isNaN(lostDate.getTime()) || Number.isNaN(foundDate.getTime())) {
    return { points: 0, dayDifference: null };
  }

  const differenceInDays = Math.abs((foundDate - lostDate) / (1000 * 60 * 60 * 24));
  const roundedDifference = Math.round(differenceInDays);

  if (differenceInDays > MAX_DATE_GAP_DAYS) {
    return { points: 0, dayDifference: roundedDifference };
  }

  const points = Math.max(0, 10 * (1 - differenceInDays / 30));

  return {
    points: Number(points.toFixed(1)),
    dayDifference: roundedDifference,
  };
};

const scoreCanonicalMatch = ({ lostItem, foundItem }) => {
  if (!isHardCandidateMatch(lostItem, foundItem)) {
    return null;
  }

  const categoryScore = 20;
  const titleEvidence = calculateIdentitySimilarity(lostItem.title, foundItem.title);
  const descriptionEvidence = calculateIdentitySimilarity(lostItem.description, foundItem.description);
  const titleSimilarity = titleEvidence.similarity;
  const descriptionSimilarity = descriptionEvidence.similarity;
  const locationSimilarity = calculateTokenSimilarity(lostItem.location, foundItem.location, { ignoreStopWords: true });
  const lostColor = normalizeText(lostItem.color);
  const foundColor = normalizeText(foundItem.color);
  const hasColorContradiction = Boolean(lostColor && foundColor && lostColor !== foundColor);
  const hasLocationContradiction =
    Boolean(normalizeText(lostItem.location) && normalizeText(foundItem.location)) && locationSimilarity === 0;

  const colorScore =
    lostColor && foundColor
      ? lostColor === foundColor
        ? 10
        : -COLOR_CONTRADICTION_PENALTY
      : 0;

  const dateScoreInfo = calculateDateProximityScore(lostItem.dateLost, foundItem.dateFound);
  const titleScore = 20 * titleSimilarity;
  const descriptionScore = 25 * descriptionSimilarity;
  const locationScore = 15 * locationSimilarity;
  const dateScore = dateScoreInfo.points;
  const locationPenalty = hasLocationContradiction ? LOCATION_CONTRADICTION_PENALTY : 0;

  const totalScore =
    categoryScore + titleScore + descriptionScore + locationScore + colorScore + dateScore - locationPenalty;

  const score = Math.max(0, Math.min(100, Math.round(totalScore)));

  let level = "below_60";
  if (score >= 90) {
    level = "very_strong";
  } else if (score >= 75) {
    level = "strong";
  } else if (score >= 60) {
    level = "possible";
  }

  const reasons = [];
  const matchedFields = [];

  reasons.push("Same category");
  matchedFields.push("category");

  if (titleSimilarity >= 0.35) {
    matchedFields.push("title");
    reasons.push(titleSimilarity >= 0.6 ? "Strong item-name similarity" : "Some item-name overlap");
  }

  if (descriptionSimilarity >= 0.2) {
    matchedFields.push("description");
    reasons.push(
      descriptionEvidence.sharedTokenCount >= 2
        ? "Distinctive description similarity"
        : "Some description overlap",
    );
  }

  if (locationSimilarity >= 0.2) {
    matchedFields.push("location");
    reasons.push(locationSimilarity >= 0.5 ? "Same location" : "Similar location");
  } else if (hasLocationContradiction) {
    reasons.push("Unrelated location");
  }

  if (colorScore === 10) {
    matchedFields.push("color");
    reasons.push("Same color");
  } else if (hasColorContradiction) {
    reasons.push("Different color");
  }

  if (dateScore > 0) {
    matchedFields.push("date");

    if (dateScoreInfo.dayDifference === 0) {
      reasons.push("Found on the same day");
    } else if (dateScoreInfo.dayDifference === 1) {
      reasons.push("Found 1 day after the item was lost");
    } else {
      reasons.push(`Found ${dateScoreInfo.dayDifference} days after the item was lost`);
    }
  }

  return {
    score,
    level,
    reasons,
    matchedFields,
    identityEvidence: {
      titleEvidence,
      descriptionEvidence,
    },
  };
};

const scoreMatchForCandidate = ({ lostItem, foundItem }) => {
  const scored = scoreCanonicalMatch({ lostItem, foundItem });

  if (!scored) {
    return null;
  }

  const { identityEvidence, ...publicScore } = scored;

  return {
    foundItem,
    ...publicScore,
  };
};

export const scoreFoundItemMatch = ({ lostItem, foundItem }) =>
  scoreMatchForCandidate({ lostItem, foundItem });

export const matchItemAgainstCandidates = ({ sourceItem, candidateItems, sourceType }) => {
  if (!sourceItem || !Array.isArray(candidateItems) || !["lost", "found"].includes(sourceType)) {
    return [];
  }

  const sourceIsLost = sourceType === "lost";
  const scoredCandidates = candidateItems
    .map((candidateItem) => {
      const lostItem = sourceIsLost ? sourceItem : candidateItem;
      const foundItem = sourceIsLost ? candidateItem : sourceItem;
      const scored = scoreCanonicalMatch({ lostItem, foundItem });

      if (!scored || !hasMeaningfulIdentityEvidence(
        scored.identityEvidence.titleEvidence,
        scored.identityEvidence.descriptionEvidence,
      )) {
        return null;
      }

      const { identityEvidence, ...publicScore } = scored;
      return {
        [sourceIsLost ? "foundItem" : "lostItem"]: candidateItem,
        ...publicScore,
      };
    })
    .filter(Boolean)
    .filter((candidate) => candidate.score >= 60)
    .sort((left, right) => right.score - left.score)
    .slice(0, 10);

  return scoredCandidates;
};

export const findRankedMatchesForLostItem = ({ lostItem, foundItems }) =>
  matchItemAgainstCandidates({
    sourceItem: lostItem,
    candidateItems: foundItems,
    sourceType: "lost",
  });
