const store = {
  users: [
    { id: 1, username: 'user1@cougarnet.uh.edu', password: 'password', role: 'user' },
    { id: 2, username: 'admin@uh.edu', password: 'password', role: 'admin' }
  ],
  services: [],
  queues: {},
  history: [],
  notifications: [],
  counters: {
    userId: 3,
    serviceId: 1,
    historyId: 1,
    notificationId: 1
  }
};

function nextId(counterKey) {
  const id = store.counters[counterKey];
  store.counters[counterKey] += 1;
  return id;
}

function addUser(userData) {
  const user = {
    id: nextId('userId'),
    ...userData
  };
  store.users.push(user);
  return user;
}

function getUserByUsername(username) {
  return store.users.find((user) => user.username === username);
}

function getUserById(userId) {
  return store.users.find((user) => user.id === userId);
}

function addService(serviceData) {
  const service = {
    id: nextId('serviceId'),
    status: 'open',
    ...serviceData
  };
  store.services.push(service);
  return service;
}

function getAllServices() {
  return store.services;
}

function getServiceById(serviceId) {
  return store.services.find((service) => service.id === serviceId);
}

function updateService(serviceId, updates) {
  const service = getServiceById(serviceId);
  if (!service) {
    return null;
  }

  Object.assign(service, updates);
  return service;
}

function deleteService(serviceId) {
  const serviceIndex = store.services.findIndex((service) => service.id === serviceId);
  if (serviceIndex === -1) {
    return false;
  }

  store.services.splice(serviceIndex, 1);
  delete store.queues[serviceId];
  return true;
}

function getQueueByServiceId(serviceId) {
  if (!store.queues[serviceId]) {
    store.queues[serviceId] = [];
  }
  return store.queues[serviceId];
}

function getAllQueues() {
  return Object.entries(store.queues).flatMap(([serviceId, queueItems]) =>
    queueItems.map((item) => ({
      serviceId: Number(serviceId),
      ...item
    }))
  );
}

function setQueueForService(serviceId, queueItems) {
  store.queues[serviceId] = queueItems;
  return store.queues[serviceId];
}

function addHistory(entryData) {
  const entry = {
    id: nextId('historyId'),
    ...entryData
  };
  store.history.push(entry);
  return entry;
}

function getHistoryByUserId(userId) {
  return store.history.filter((item) => item.userId === userId);
}

function addNotification(notificationData) {
  const notification = {
    id: nextId('notificationId'),
    createdAt: new Date().toISOString(),
    read: false,
    title: 'Notification',
    type: 'info',
    ...notificationData
  };
  store.notifications.push(notification);
  return notification;
}

function getNotificationsByUserId(userId) {
  return store.notifications.filter((item) => item.userId === userId);
}

function markNotificationAsRead(userId, notificationId) {
  const notification = store.notifications.find(
    (item) => item.userId === userId && item.id === notificationId
  );

  if (!notification) {
    return null;
  }

  notification.read = true;
  return notification;
}

function resetStore() {
  store.users.length = 0;
  store.services.length = 0;
  store.history.length = 0;
  store.notifications.length = 0;
  store.queues = {};
  store.counters.userId = 1;
  store.counters.serviceId = 1;
  store.counters.historyId = 1;
  store.counters.notificationId = 1;
}

module.exports = {
  store,
  addUser,
  getUserByUsername,
  getUserById,
  addService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
  getQueueByServiceId,
  getAllQueues,
  setQueueForService,
  addHistory,
  getHistoryByUserId,
  addNotification,
  getNotificationsByUserId,
  markNotificationAsRead,
  resetStore
};
