const database = require('../config/database');
const {
  addNotification,
  getNotificationsByUserId,
  markNotificationAsRead
} = require('../data/store');

function useDatabase() {
  return typeof database.isDatabaseEnabled === 'function' && database.isDatabaseEnabled();
}

function mapNotification(row) {
  return {
    id: Number(row.id),
    userId: Number(row.userId),
    title: row.title,
    message: row.message,
    type: row.type,
    read: Boolean(row.isRead ?? row.read),
    createdAt: new Date(row.createdAt || row.created_at || new Date()).toISOString()
  };
}

function sendNotification(payload) {
  const {
    userId,
    title = 'Notification',
    message,
    type = 'info'
  } = payload;

  if (useDatabase()) {
    return (async () => {
      const pool = database.pool || database;
      const connection = await pool.getConnection();
      try {
        const createdAt = new Date();
        const [result] = await connection.query(
          'INSERT INTO notifications (userId, title, message, type, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [Number(userId), title, message, type, 0, createdAt]
        );

        return {
          id: result.insertId,
          userId: Number(userId),
          title,
          message,
          type,
          read: false,
          createdAt: createdAt.toISOString()
        };
      } finally {
        connection.release();
      }
    })();
  }

  return addNotification({ userId: Number(userId), title, message, type, read: false });
}

function notifyUser(userId, message, type = 'info') {
  return sendNotification({
    userId,
    title: 'Queue Update',
    message,
    type
  });
}

function getUserNotifications(userId) {
  if (useDatabase()) {
    return (async () => {
      const pool = database.pool || database;
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.query(
          'SELECT id, userId, title, message, type, isRead, createdAt FROM notifications WHERE userId = ? ORDER BY createdAt DESC, id DESC',
          [Number(userId)]
        );

        return rows.map(mapNotification);
      } finally {
        connection.release();
      }
    })();
  }

  return getNotificationsByUserId(Number(userId));
}

function markAsRead(userId, notificationId) {
  if (useDatabase()) {
    return (async () => {
      const pool = database.pool || database;
      const connection = await pool.getConnection();
      try {
        await connection.query(
          'UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?',
          [Number(notificationId), Number(userId)]
        );

        const notifications = await getUserNotifications(userId);
        return notifications.find((item) => item.id === Number(notificationId)) || null;
      } finally {
        connection.release();
      }
    })();
  }

  return markNotificationAsRead(Number(userId), Number(notificationId));
}

function getUnreadNotifications(userId) {
  if (useDatabase()) {
    return (async () => {
      const notifications = await getUserNotifications(userId);
      return notifications.filter((item) => !item.read);
    })();
  }

  return getNotificationsByUserId(Number(userId)).filter((item) => !item.read);
}

module.exports = {
  sendNotification,
  notifyUser,
  getUserNotifications,
  markAsRead,
  getUnreadNotifications
};
