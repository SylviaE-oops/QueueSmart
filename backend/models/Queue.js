const database = require('../config/database');
const { QUEUE_STATUS } = require('../config/constants');

const pool = database.pool || database;

function mapQueueRow(row, index = 0) {
  return {
    id: Number(row.id),
    serviceId: Number(row.serviceId),
    userId: Number(row.userId),
    priority: Number(row.priority),
    status: row.status || QUEUE_STATUS.WAITING,
    joinedAt: new Date(row.joinedAt).toISOString(),
    position: index + 1
  };
}

class Queue {
  static async create(queueData) {
    const {
      serviceId,
      userId,
      priority = 1,
      status = QUEUE_STATUS.WAITING,
      joinedAt = new Date().toISOString()
    } = queueData;

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'INSERT INTO queue_entries (serviceId, userId, priority, status, joinedAt) VALUES (?, ?, ?, ?, ?)',
        [serviceId, userId, priority, status, joinedAt.slice(0, 19).replace('T', ' ')]
      );

      return this.getById(result.insertId);
    } finally {
      connection.release();
    }
  }

  static async getAll() {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT id, serviceId, userId, priority, status, joinedAt FROM queue_entries ORDER BY serviceId ASC, priority DESC, joinedAt ASC'
      );

      return rows.map(mapQueueRow);
    } finally {
      connection.release();
    }
  }

  static async getById(id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT id, serviceId, userId, priority, status, joinedAt FROM queue_entries WHERE id = ?',
        [id]
      );
      return rows[0] ? mapQueueRow(rows[0], 0) : null;
    } finally {
      connection.release();
    }
  }

  static async getByServiceId(serviceId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT id, serviceId, userId, priority, status, joinedAt FROM queue_entries WHERE serviceId = ? ORDER BY priority DESC, joinedAt ASC',
        [serviceId]
      );

      return rows.map(mapQueueRow);
    } finally {
      connection.release();
    }
  }

  static async getByUserId(userId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT id, serviceId, userId, priority, status, joinedAt FROM queue_entries WHERE userId = ? ORDER BY joinedAt ASC',
        [userId]
      );

      return rows.map(mapQueueRow);
    } finally {
      connection.release();
    }
  }

  static async deleteByServiceAndUser(serviceId, userId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'DELETE FROM queue_entries WHERE serviceId = ? AND userId = ?',
        [serviceId, userId]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  static async delete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.query('DELETE FROM queue_entries WHERE id = ?', [id]);
      return true;
    } finally {
      connection.release();
    }
  }
}

module.exports = Queue;
