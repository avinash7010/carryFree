import Notification from "../models/Notification.js";

export const notifyUsers = async (notifications = []) => {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return;
  }

  const validNotifications = notifications.filter(
    (item) => item?.userId && item?.type && item?.title && item?.message
  );

  if (validNotifications.length === 0) {
    return;
  }

  try {
    await Notification.insertMany(validNotifications);
  } catch {
    // Notifications should never block main business flow.
  }
};
