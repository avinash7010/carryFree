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
    const notificationsToInsert = [];

    for (const notification of validNotifications) {
      const matchKey = notification.metadata?.matchKey;

      if (matchKey) {
        const existingNotification = await Notification.findOne({
          userId: notification.userId,
          type: notification.type,
          "metadata.matchKey": matchKey,
        });

        if (existingNotification) {
          continue;
        }
      }

      notificationsToInsert.push(notification);
    }

    if (notificationsToInsert.length > 0) {
      await Notification.insertMany(notificationsToInsert);
    }
  } catch {
    // Notifications should never block main business flow.
  }
};
