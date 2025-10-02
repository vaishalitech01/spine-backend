import Notification from '../models/notificationModel.js';

export const getUserNotifications = async (req, res) => {
    try {
        const userId = req.userId; // Extract from middleware or token
        const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, notifications });
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
