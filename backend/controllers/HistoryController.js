const HistoryService = require('../services/HistoryService');

async function getUserHistory(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const history = HistoryService.getUserHistory(userId);
    return res.status(200).json(history);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getUserHistory
};
