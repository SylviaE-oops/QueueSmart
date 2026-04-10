const NotificationService = require('../services/NotificationService');

async function getUserNotifications(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const notifications = await NotificationService.getUserNotifications(userId);
    return res.status(200).json(notifications);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUserNotifications
};
