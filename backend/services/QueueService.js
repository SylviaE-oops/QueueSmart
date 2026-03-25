const {
  getQueueByServiceId,
  setQueueForService,
  getUserById
} = require('../data/store');
const { createHttpError } = require('./errors');
const { findService } = require('./ServiceService');
const { notifyUser } = require('./NotificationService');
const { recordServedUser } = require('./HistoryService');

function sortQueue(queue) {
  return [...queue].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  });
}

function notifyFrontUsers(serviceId) {
  const queue = getQueueByServiceId(serviceId);
  const sorted = sortQueue(queue);

  sorted.forEach((entry, index) => {
    if (index <= 1) {
      notifyUser(entry.userId, `You are near the front for service ${serviceId}`, 'queue-near-front');
    }
  });
}

function joinQueue(payload) {
  const { serviceId, userId, priority } = payload;

  if (!serviceId || !userId) {
    throw createHttpError(400, 'serviceId and userId are required');
  }

  const service = findService(Number(serviceId));
  const user = getUserById(Number(userId));

  if (!user) {
    throw createHttpError(404, 'user not found');
  }

  const queue = getQueueByServiceId(service.id);
  if (queue.find((item) => item.userId === user.id)) {
    throw createHttpError(400, 'user already in queue');
  }

  const queueEntry = {
    userId: user.id,
    joinedAt: new Date().toISOString(),
    priority: typeof priority === 'number' ? priority : service.priority
  };

  const updated = sortQueue([...queue, queueEntry]);
  setQueueForService(service.id, updated);

  notifyUser(user.id, `You joined queue for service ${service.name}`, 'queue-joined');
  notifyFrontUsers(service.id);

  return updated;
}

function leaveQueue(payload) {
  const { serviceId, userId } = payload;
  if (!serviceId || !userId) {
    throw createHttpError(400, 'serviceId and userId are required');
  }

  findService(Number(serviceId));
  const queue = getQueueByServiceId(Number(serviceId));
  const nextQueue = queue.filter((item) => item.userId !== Number(userId));

  if (nextQueue.length === queue.length) {
    throw createHttpError(404, 'user is not in this queue');
  }

  const sorted = sortQueue(nextQueue);
  setQueueForService(Number(serviceId), sorted);
  notifyFrontUsers(Number(serviceId));

  return sorted;
}

function getQueue(serviceId) {
  findService(Number(serviceId));
  const queue = getQueueByServiceId(Number(serviceId));
  const sorted = sortQueue(queue);
  setQueueForService(Number(serviceId), sorted);
  return sorted;
}

function serveNext(serviceId) {
  const service = findService(Number(serviceId));
  const queue = getQueueByServiceId(service.id);

  if (queue.length === 0) {
    throw createHttpError(404, 'queue is empty');
  }

  const sorted = sortQueue(queue);
  const [served, ...rest] = sorted;
  setQueueForService(service.id, rest);
  recordServedUser(served.userId, service.id);
  notifyFrontUsers(service.id);

  return {
    served,
    remainingQueue: rest
  };
}

function estimateWaitTime(serviceId, userId) {
  const service = findService(Number(serviceId));
  const queue = sortQueue(getQueueByServiceId(service.id));
  const positionIndex = queue.findIndex((item) => item.userId === Number(userId));

  if (positionIndex === -1) {
    throw createHttpError(404, 'user is not in this queue');
  }

  const position = positionIndex + 1;
  return {
    serviceId: service.id,
    userId: Number(userId),
    position,
    waitTime: position * service.duration
  };
}

module.exports = {
  sortQueue,
  joinQueue,
  leaveQueue,
  getQueue,
  serveNext,
  estimateWaitTime
};
