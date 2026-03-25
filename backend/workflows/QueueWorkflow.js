const Queue = require('../models/Queue');
const Service = require('../models/Service');
const { QUEUE_STATUS } = require('../config/constants');

class QueueWorkflow {
  // Join a queue
  static async joinQueue(email, serviceId) {
    try {
      // Check if service exists
      const service = await Service.getById(serviceId);
      if (!service) throw new Error('Service not found');

      // Check if user already in this queue
      const existingQueues = await Queue.getByEmail(email);
      const alreadyInQueue = existingQueues.some(q => q.serviceId === serviceId && q.status !== QUEUE_STATUS.SERVED);
      
      if (alreadyInQueue) {
        throw new Error('User already in this queue');
      }

      // Get current queue length
      const length = await Queue.getQueueLength(serviceId);
      
      // Create new queue entry
      const queue = await Queue.create({
        email,
        serviceId,
        position: length + 1,
        status: QUEUE_STATUS.WAITING
      });

      return {
        success: true,
        message: `Successfully joined queue for ${service.name}`,
        data: queue
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }

  // Leave queue
  static async leaveQueue(queueId) {
    try {
      const queue = await Queue.getById(queueId);
      if (!queue) throw new Error('Queue entry not found');

      await Queue.delete(queueId);

      return {
        success: true,
        message: 'Successfully left queue'
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }

  // Move to next customer (serve next)
  static async serveNext(serviceId) {
    try {
      // Get first waiting customer
      const queues = await Queue.getByServiceId(serviceId);
      const nextCustomer = queues.find(q => q.status === QUEUE_STATUS.WAITING);

      if (!nextCustomer) {
        return {
          success: false,
          error: 'No customers waiting'
        };
      }

      // Update status to almost_ready
      await Queue.update(nextCustomer.id, {
        status: QUEUE_STATUS.ALMOST_READY,
        position: nextCustomer.position
      });

      return {
        success: true,
        message: 'Customer notified',
        data: await Queue.getById(nextCustomer.id)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }

  // Mark customer as served
  static async markServed(queueId) {
    try {
      const queue = await Queue.getById(queueId);
      if (!queue) throw new Error('Queue entry not found');

      await Queue.update(queueId, {
        status: QUEUE_STATUS.SERVED,
        position: queue.position
      });

      return {
        success: true,
        message: 'Customer marked as served',
        data: await Queue.getById(queueId)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }

  // Get queue status summary
  static async getQueueSummary(serviceId) {
    try {
      const queues = await Queue.getByServiceId(serviceId);
      const service = await Service.getById(serviceId);

      const summary = {
        service,
        total: queues.length,
        waiting: queues.filter(q => q.status === QUEUE_STATUS.WAITING).length,
        almostReady: queues.filter(q => q.status === QUEUE_STATUS.ALMOST_READY).length,
        served: queues.filter(q => q.status === QUEUE_STATUS.SERVED).length,
        nextCustomer: queues.find(q => q.status === QUEUE_STATUS.ALMOST_READY) || null,
        estimatedWaitTime: queues.length * (service.expectedDurationMin || 5)
      };

      return {
        success: true,
        data: summary
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
}

module.exports = QueueWorkflow;
