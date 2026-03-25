const pool = require('../config/database');
const { QUEUE_STATUS } = require('../config/constants');

class Queue {
  // Create a new queue entry
  static async create(queueData) {
    const { email, serviceId, position, status = QUEUE_STATUS.WAITING } = queueData;
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'INSERT INTO queues (email, serviceId, position, status) VALUES (?, ?, ?, ?)',
        [email, serviceId, position, status]
      );
      return { id: result.insertId, ...queueData };
    } finally {
      connection.release();
    }
  }

  // Get all queues
  static async getAll() {
    const connection = await pool.getConnection();
    try {
      const [queues] = await connection.query('SELECT * FROM queues ORDER BY position ASC');
      return queues;
    } finally {
      connection.release();
    }
  }

  // Get queue by ID
  static async getById(id) {
    const connection = await pool.getConnection();
    try {
      const [queues] = await connection.query('SELECT * FROM queues WHERE id = ?', [id]);
      return queues[0] || null;
    } finally {
      connection.release();
    }
  }

  // Get queues by service ID
  static async getByServiceId(serviceId) {
    const connection = await pool.getConnection();
    try {
      const [queues] = await connection.query(
        'SELECT * FROM queues WHERE serviceId = ? ORDER BY position ASC',
        [serviceId]
      );
      return queues;
    } finally {
      connection.release();
    }
  }

  // Get queues by email
  static async getByEmail(email) {
    const connection = await pool.getConnection();
    try {
      const [queues] = await connection.query(
        'SELECT * FROM queues WHERE email = ?',
        [email]
      );
      return queues;
    } finally {
      connection.release();
    }
  }

  // Update queue
  static async update(id, updateData) {
    const connection = await pool.getConnection();
    try {
      const { status, position } = updateData;
      await connection.query(
        'UPDATE queues SET status = ?, position = ? WHERE id = ?',
        [status, position, id]
      );
      return await this.getById(id);
    } finally {
      connection.release();
    }
  }

  // Delete queue
  static async delete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.query('DELETE FROM queues WHERE id = ?', [id]);
      return true;
    } finally {
      connection.release();
    }
  }

  // Get queue length for a service
  static async getQueueLength(serviceId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'SELECT COUNT(*) as count FROM queues WHERE serviceId = ? AND status IN (?, ?)',
        [serviceId, QUEUE_STATUS.WAITING, QUEUE_STATUS.ALMOST_READY]
      );
      return result[0].count;
    } finally {
      connection.release();
    }
  }
}

module.exports = Queue;
