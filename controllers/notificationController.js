import Notification from '../models/notificationModel.js';

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 20;
    const lastId = req.query.lastId;

    const query = { userId };
    if (lastId) query._id = { $lt: lastId }; // fetch older ones

    const notifications = await Notification.find(query)
      .sort({ _id: -1 })
      .limit(limit);

    res.json({
      success: true,
      notifications,
      nextCursor:
        notifications.length > 0
          ? notifications[notifications.length - 1]._id
          : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteUserNotifications = async (req, res) => {
    try {
        const userId = req.userId;
        await Notification.deleteMany({ userId });
        res.status(200).json({ success: true, message: 'Notifications cleared.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
