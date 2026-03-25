const Service = require('../models/Service');
const { SERVICE_STATUS } = require('../config/constants');

class ServiceWorkflow {
  // Open a service
  static async openService(serviceId) {
    try {
      const service = await Service.update(serviceId, {
        ...await Service.getById(serviceId),
        status: SERVICE_STATUS.OPEN
      });

      return {
        success: true,
        message: `Service opened: ${service.name}`,
        data: service
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }

  // Close a service
  static async closeService(serviceId) {
    try {
      const existing = await Service.getById(serviceId);
      const service = await Service.update(serviceId, {
        ...existing,
        status: SERVICE_STATUS.CLOSED
      });

      return {
        success: true,
        message: `Service closed: ${service.name}`,
        data: service
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }

  // Set service to maintenance
  static async setMaintenance(serviceId) {
    try {
      const existing = await Service.getById(serviceId);
      const service = await Service.update(serviceId, {
        ...existing,
        status: SERVICE_STATUS.MAINTENANCE
      });

      return {
        success: true,
        message: `Service under maintenance: ${service.name}`,
        data: service
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }

  // Get all service statuses
  static async getAllServiceStatus() {
    try {
      const services = await Service.getAll();
      const statuses = services.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        priority: s.priority,
        expectedDuration: s.expectedDurationMin
      }));

      return {
        success: true,
        data: statuses
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
}

module.exports = ServiceWorkflow;
