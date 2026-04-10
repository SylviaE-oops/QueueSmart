const Queue = require('../models/Queue');
const User = require('../models/User');
const {
  addService,
  getQueueByServiceId,
  getAllQueues,
  setQueueForService,
  getUserById
} = require('../data/store');
const { createHttpError } = require('./errors');
const { findService } = require('./ServiceService');
const NotificationService = require('./NotificationService');
const HistoryService = require('./HistoryService');
const database = require('../config/database');

function useDatabase() {
  return typeof database.isDatabaseEnabled === 'function' && database.isDatabaseEnabled();
}

function normalizePriority(priority, fallback = 1) {
  const parsed = Number(priority);
  return Number.isNaN(parsed) ? Number(fallback || 1) : parsed;
}

function sortQueue(queue) {
  return [...queue].sort((a, b) => {
    if (Number(b.priority) !== Number(a.priority)) {
      return Number(b.priority) - Number(a.priority);
    }
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  });
}

function addLocation(payload) {
  return addService({
    name: payload.name,
    description: payload.description || payload.name,
    duration: Number(payload.duration || 5),
    priority: normalizePriority(payload.priority, 1),
    status: payload.status || 'open'
  });
}

function addToQueue(serviceId, entry) {
  const queue = getQueueByServiceId(Number(serviceId));
  const queueEntry = {
    userId: Number(entry.userId),
    joinedAt: entry.joinedAt || new Date().toISOString(),
    priority: normalizePriority(entry.priority, 1),
    status: entry.status || 'waiting'
  };

  const updated = sortQueue([...queue, queueEntry]);
  setQueueForService(Number(serviceId), updated);
  return updated;
}

function removeFromQueue(serviceId, userId) {
  const queue = getQueueByServiceId(Number(serviceId));
  const updated = sortQueue(queue.filter((item) => Number(item.userId) !== Number(userId)));
  setQueueForService(Number(serviceId), updated);
  return updated;
}

function notifyFrontUsers(serviceId) {
  if (useDatabase()) {
    return (async () => {
      const sorted = await Queue.getByServiceId(Number(serviceId));
      await Promise.all(
        sorted.slice(0, 2).map((entry) =>
          NotificationService.notifyUser(
            entry.userId,
            `You are near the front for service ${serviceId}`,
            'queue-near-front'
          )
        )
      );
    })();
  }

  const queue = getQueueByServiceId(Number(serviceId));
  const sorted = sortQueue(queue);
  sorted.slice(0, 2).forEach((entry) => {
    NotificationService.notifyUser(
      entry.userId,
      `You are near the front for service ${serviceId}`,
      'queue-near-front'
    );
  });
}

function joinQueue(payload) {
  const { serviceId, userId, priority } = payload;

  if (!serviceId || !userId) {
    throw createHttpError(400, 'serviceId and userId are required');
  }

  if (useDatabase()) {
    return (async () => {
      const service = await findService(Number(serviceId));
      const user = await User.getById(Number(userId));

      if (!user) {
        throw createHttpError(404, 'user not found');
      }

      const queue = await Queue.getByServiceId(service.id);
      if (queue.find((item) => Number(item.userId) === Number(user.id))) {
        throw createHttpError(400, 'user already in queue');
      }

      await Queue.create({
        serviceId: Number(service.id),
        userId: Number(user.id),
        priority: normalizePriority(priority, service.priority),
        status: 'waiting'
      });

      await NotificationService.notifyUser(
        user.id,
        `You joined queue for service ${service.name}`,
        'queue-joined'
      );
      await notifyFrontUsers(service.id);

      return Queue.getByServiceId(service.id);
    })();
  }

  const service = findService(Number(serviceId));
  const user = getUserById(Number(userId));

  if (!user) {
    throw createHttpError(404, 'user not found');
  }

  const queue = getQueueByServiceId(service.id);
  if (queue.find((item) => Number(item.userId) === Number(user.id))) {
    throw createHttpError(400, 'user already in queue');
  }

  const queueEntry = {
    userId: user.id,
    joinedAt: new Date().toISOString(),
    priority: normalizePriority(priority, service.priority),
    status: 'waiting'
  };

  const updated = sortQueue([...queue, queueEntry]);
  setQueueForService(service.id, updated);
  NotificationService.notifyUser(user.id, `You joined queue for service ${service.name}`, 'queue-joined');
  notifyFrontUsers(service.id);

  return updated;
}

function leaveQueue(payload) {
  const { serviceId, userId } = payload;
  if (!serviceId || !userId) {
    throw createHttpError(400, 'serviceId and userId are required');
  }

  if (useDatabase()) {
    return (async () => {
      await findService(Number(serviceId));
      const removed = await Queue.deleteByServiceAndUser(Number(serviceId), Number(userId));

      if (!removed) {
        throw createHttpError(404, 'user is not in this queue');
      }

      await notifyFrontUsers(Number(serviceId));
      return Queue.getByServiceId(Number(serviceId));
    })();
  }

  findService(Number(serviceId));
  const queue = getQueueByServiceId(Number(serviceId));
  const nextQueue = queue.filter((item) => Number(item.userId) !== Number(userId));

  if (nextQueue.length === queue.length) {
    throw createHttpError(404, 'user is not in this queue');
  }

  const sorted = sortQueue(nextQueue);
  setQueueForService(Number(serviceId), sorted);
  notifyFrontUsers(Number(serviceId));

  return sorted;
}

function getQueue(serviceId) {
  if (useDatabase()) {
    return (async () => {
      await findService(Number(serviceId));
      return Queue.getByServiceId(Number(serviceId));
    })();
  }

  findService(Number(serviceId));
  const queue = getQueueByServiceId(Number(serviceId));
  const sorted = sortQueue(queue);
  setQueueForService(Number(serviceId), sorted);
  return sorted;
}

function listQueues() {
  if (useDatabase()) {
    return Queue.getAll();
  }

  return getAllQueues();
}

function serveNext(serviceId) {
  if (useDatabase()) {
    return (async () => {
      const service = await findService(Number(serviceId));
      const queue = await Queue.getByServiceId(service.id);

      if (queue.length === 0) {
        throw createHttpError(404, 'queue is empty');
      }

      const [served] = queue;
      await Queue.deleteByServiceAndUser(service.id, served.userId);
      await HistoryService.recordServedUser(served.userId, service.id);
      await notifyFrontUsers(service.id);

      return {
        served,
        remainingQueue: await Queue.getByServiceId(service.id)
      };
    })();
  }

  const service = findService(Number(serviceId));
  const queue = getQueueByServiceId(service.id);

  if (queue.length === 0) {
    throw createHttpError(404, 'queue is empty');
  }

  const sorted = sortQueue(queue);
  const [served, ...rest] = sorted;
  setQueueForService(service.id, rest);
  HistoryService.recordServedUser(served.userId, service.id);
  notifyFrontUsers(service.id);

  return {
    served,
    remainingQueue: rest
  };
}

function estimateWaitTime(serviceId, userId) {
  if (useDatabase()) {
    return (async () => {
      const service = await findService(Number(serviceId));
      const queue = await Queue.getByServiceId(service.id);
      const positionIndex = queue.findIndex((item) => Number(item.userId) === Number(userId));

      if (positionIndex === -1) {
        throw createHttpError(404, 'user is not in this queue');
      }

      const position = positionIndex + 1;
      return {
        serviceId: service.id,
        userId: Number(userId),
        position,
        waitTime: position * Number(service.duration)
      };
    })();
  }

  const service = findService(Number(serviceId));
  const queue = sortQueue(getQueueByServiceId(service.id));
  const positionIndex = queue.findIndex((item) => Number(item.userId) === Number(userId));

  if (positionIndex === -1) {
    throw createHttpError(404, 'user is not in this queue');
  }

  const position = positionIndex + 1;
  return {
    serviceId: service.id,
    userId: Number(userId),
    position,
    waitTime: position * Number(service.duration)
  };
}

module.exports = {
  sortQueue,
  addLocation,
  addToQueue,
  removeFromQueue,
  joinQueue,
  leaveQueue,
  getQueue,
  listQueues,
  serveNext,
  estimateWaitTime
};
