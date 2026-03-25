// Queue Status Constants
const QUEUE_STATUS = {
  WAITING: 'waiting',
  ALMOST_READY: 'almost_ready',
  READY: 'ready',
  SERVED: 'served',
  CANCELLED: 'cancelled'
};

// Service Status Constants
const SERVICE_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  MAINTENANCE: 'maintenance'
};

// User Roles
const ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};

module.exports = {
  QUEUE_STATUS,
  SERVICE_STATUS,
  ROLES
};
