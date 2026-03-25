const { addNotification, getNotificationsByUserId } = require('../data/store');

function notifyUser(userId, message, type) {
  return addNotification({
    userId,
    message,
    type
  });
}

function getUserNotifications(userId) {
  return getNotificationsByUserId(userId);
}

module.exports = {
  notifyUser,
  getUserNotifications
};
