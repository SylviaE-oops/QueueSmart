const QueueService = require('../services/QueueService');

async function join(req, res, next) {
  try {
    const queue = QueueService.joinQueue(req.body);
    return res.status(201).json(queue);
  } catch (error) {
    return next(error);
  }
}

async function leave(req, res, next) {
  try {
    const queue = QueueService.leaveQueue(req.body);
    return res.status(200).json(queue);
  } catch (error) {
    return next(error);
  }
}

async function listByService(req, res, next) {
  try {
    const queue = QueueService.getQueue(Number(req.params.serviceId));
    return res.status(200).json(queue);
  } catch (error) {
    return next(error);
  }
}

async function serveNext(req, res, next) {
  try {
    const result = QueueService.serveNext(Number(req.body.serviceId));
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function waitTime(req, res, next) {
  try {
    const result = QueueService.estimateWaitTime(req.params.serviceId, req.params.userId);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  join,
  leave,
  listByService,
  serveNext,
  waitTime
};
