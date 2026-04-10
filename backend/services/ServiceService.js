const Service = require('../models/Service');
const {
  addService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService
} = require('../data/store');
const { createHttpError } = require('./errors');
const database = require('../config/database');

function useDatabase() {
  return typeof database.isDatabaseEnabled === 'function' && database.isDatabaseEnabled();
}

function normalizePriority(priority) {
  if (priority === undefined || priority === null || priority === '') {
    return undefined;
  }

  if (typeof priority === 'string') {
    const value = priority.toLowerCase();
    if (value === 'low') return 1;
    if (value === 'medium') return 2;
    if (value === 'high') return 3;
  }

  const parsed = Number(priority);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeStatus(status) {
  if (!status) {
    return 'open';
  }

  return ['open', 'closed', 'maintenance'].includes(status) ? status : 'open';
}

function validateServicePayload(payload, isPartial) {
  const { name, description, duration, priority } = payload;

  if (!isPartial && (!name || !description || duration === undefined || priority === undefined)) {
    throw createHttpError(400, 'name, description, duration, and priority are required');
  }

  if (duration !== undefined && !Number.isFinite(Number(duration))) {
    throw createHttpError(400, 'duration must be a number');
  }

  if (priority !== undefined && normalizePriority(priority) === undefined) {
    throw createHttpError(400, 'priority must be a number');
  }
}

function toServiceRecord(payload, current = {}) {
  return {
    name: payload.name ?? current.name,
    description: payload.description ?? current.description,
    duration: payload.duration !== undefined ? Number(payload.duration) : Number(current.duration),
    priority: payload.priority !== undefined ? normalizePriority(payload.priority) : normalizePriority(current.priority),
    status: normalizeStatus(payload.status ?? current.status)
  };
}

function createService(payload) {
  validateServicePayload(payload, false);
  const serviceRecord = toServiceRecord(payload);

  if (useDatabase()) {
    return Service.create(serviceRecord);
  }

  return addService(serviceRecord);
}

function listServices() {
  if (useDatabase()) {
    return Service.getAll();
  }

  return getAllServices();
}

function editService(serviceId, payload) {
  validateServicePayload(payload, true);

  if (useDatabase()) {
    return (async () => {
      const existing = await Service.getById(serviceId);
      if (!existing) {
        throw createHttpError(404, 'service not found');
      }

      return Service.update(serviceId, toServiceRecord(payload, existing));
    })();
  }

  const current = getServiceById(serviceId);
  if (!current) {
    throw createHttpError(404, 'service not found');
  }

  const updated = updateService(serviceId, toServiceRecord(payload, current));
  if (!updated) {
    throw createHttpError(404, 'service not found');
  }

  return updated;
}

function removeService(serviceId) {
  if (useDatabase()) {
    return (async () => {
      const service = await Service.getById(serviceId);
      if (!service) {
        throw createHttpError(404, 'service not found');
      }

      await Service.delete(serviceId);
      return { success: true };
    })();
  }

  const deleted = deleteService(serviceId);
  if (!deleted) {
    throw createHttpError(404, 'service not found');
  }

  return { success: true };
}

function findService(serviceId) {
  if (useDatabase()) {
    return (async () => {
      const service = await Service.getById(serviceId);
      if (!service) {
        throw createHttpError(404, 'service not found');
      }
      return service;
    })();
  }

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
  removeService,
  findService
};
