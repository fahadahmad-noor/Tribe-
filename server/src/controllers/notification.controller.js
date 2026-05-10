import Notification from '../models/Notification.js';

// GET /notifications — Paginated notifications for current user
export async function getNotifications(req, res) {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments({ userId: req.userId }),
      Notification.countDocuments({ userId: req.userId, isRead: false }),
    ]);

    res.json({ notifications, total, unreadCount, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

// PATCH /notifications/:id/read — Mark single notification as read
export async function markRead(req, res) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification' });
  }
}

// PATCH /notifications/read-all — Mark all notifications as read
export async function markAllRead(req, res) {
  try {
    await Notification.updateMany(
      { userId: req.userId, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications' });
  }
}
