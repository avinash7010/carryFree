import FoundItem from "../models/FoundItem.js";
import LostItem from "../models/LostItem.js";
import { matchItemAgainstCandidates } from "./lostFoundMatching.service.js";
import { notifyUsers } from "./notification.service.js";

const getId = (value) => value?._id || value;

const buildMatchNotification = ({ recipientId, lostItem, foundItem, match, direction }) => {
  const lostItemId = getId(lostItem);
  const foundItemId = getId(foundItem);
  const matchKey = `${recipientId}:${lostItemId}:${foundItemId}`;
  const itemTitle = direction === "found" ? lostItem.title : foundItem.title;

  return {
    userId: recipientId,
    type: "lost_found_potential_match",
    title: "Potential match found",
    message:
      direction === "found"
        ? `A LostItem may match an item you reported as found: ${itemTitle}.`
        : `A FoundItem may match your lost report: ${itemTitle}.`,
    metadata: {
      matchKey,
      lostItemId,
      foundItemId,
      score: match.score,
      level: match.level,
      matchedFields: match.matchedFields,
    },
  };
};

const getOwnerId = (item) => getId(item?.createdBy);

export const notifyMatchesForLostItem = async (lostItem) => {
  try {
    const foundItems = await FoundItem.find({ status: "found" });
    const matches = matchItemAgainstCandidates({
      sourceItem: lostItem,
      candidateItems: foundItems,
      sourceType: "lost",
    });
    const recipientId = getOwnerId(lostItem);

    const notifications = matches
      .filter((match) => {
        const foundOwnerId = getOwnerId(match.foundItem);
        return foundOwnerId && String(foundOwnerId) !== String(recipientId);
      })
      .map((match) => buildMatchNotification({
        recipientId: getOwnerId(match.foundItem),
        lostItem,
        foundItem: match.foundItem,
        match,
        direction: "lost",
      }));

    await notifyUsers(notifications);
  } catch (error) {
    console.error("Failed to create LostItem match notifications:", error.message);
  }
};

export const notifyMatchesForFoundItem = async (foundItem) => {
  try {
    const lostItems = await LostItem.find({ status: "lost" });
    const matches = matchItemAgainstCandidates({
      sourceItem: foundItem,
      candidateItems: lostItems,
      sourceType: "found",
    });
    const recipientId = getOwnerId(foundItem);

    const notifications = matches
      .filter((match) => {
        const lostOwnerId = getOwnerId(match.lostItem);
        return lostOwnerId && String(lostOwnerId) !== String(recipientId);
      })
      .map((match) => buildMatchNotification({
        recipientId: getOwnerId(match.lostItem),
        lostItem: match.lostItem,
        foundItem,
        match,
        direction: "found",
      }));

    await notifyUsers(notifications);
  } catch (error) {
    console.error("Failed to create FoundItem match notifications:", error.message);
  }
};