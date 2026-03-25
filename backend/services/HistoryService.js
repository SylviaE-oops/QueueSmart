const { addHistory, getHistoryByUserId } = require('../data/store');

function recordServedUser(userId, serviceId) {
  return addHistory({
    userId,
    serviceId,
    servedAt: new Date().toISOString()
  });
}

function getUserHistory(userId) {
  return getHistoryByUserId(userId);
}

module.exports = {
  recordServedUser,
  getUserHistory
};
