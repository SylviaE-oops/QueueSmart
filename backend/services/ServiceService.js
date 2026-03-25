const {
  addService,
  getAllServices,
  getServiceById,
  updateService
} = require('../data/store');
const { createHttpError } = require('./errors');

function validateServicePayload(payload, isPartial) {
  const { name, description, duration, priority } = payload;

  if (!isPartial && (!name || !description || duration === undefined || priority === undefined)) {
    throw createHttpError(400, 'name, description, duration, and priority are required');
  }

  if (duration !== undefined && typeof duration !== 'number') {
    throw createHttpError(400, 'duration must be a number');
  }

  if (priority !== undefined && typeof priority !== 'number') {
    throw createHttpError(400, 'priority must be a number');
  }
}

function createService(payload) {
  validateServicePayload(payload, false);
  return addService(payload);
}

function listServices() {
  return getAllServices();
}

function editService(serviceId, payload) {
  validateServicePayload(payload, true);
  const updated = updateService(serviceId, payload);
  if (!updated) {
    throw createHttpError(404, 'service not found');
  }
  return updated;
}

function findService(serviceId) {
  const service = getServiceById(serviceId);
  if (!service) {
    throw createHttpError(404, 'service not found');
  }
  return service;
}

module.exports = {
  createService,
  listServices,
  editService,
  findService
};
