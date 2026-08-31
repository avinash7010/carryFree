import Notification from "../models/Notification.js";
import { errorResponse, successResponse } from "../utils/apiResponse.js";

export const getMyNotifications = async (req, res) => {
  try {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Math.min(50, Number(req.query.limit) > 0 ? Number(req.query.limit) : 20);
    const skip = (page - 1) * limit;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ userId: req.user.id, isRead: false }),
    ]);

    return successResponse(res, "Notifications fetched", {
      notifications,
      unreadCount,
      page,
      limit,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch notifications", 500, error.message);
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return errorResponse(res, "Notification not found", 404);
    }

    return successResponse(res, "Notification marked as read", notification);
  } catch (error) {
    return errorResponse(res, "Failed to mark notification", 500, error.message);
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return successResponse(res, "All notifications marked as read");
  } catch (error) {
    return errorResponse(res, "Failed to mark notifications", 500, error.message);
  }
};
