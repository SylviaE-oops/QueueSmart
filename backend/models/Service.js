const database = require('../config/database');
const { SERVICE_STATUS } = require('../config/constants');

const pool = database.pool || database;

class Service {
  static async create(serviceData) {
    const {
      name,
      description,
      duration,
      priority,
      status = SERVICE_STATUS.OPEN
    } = serviceData;

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'INSERT INTO services (name, description, duration, priority, status) VALUES (?, ?, ?, ?, ?)',
        [name, description, duration, priority, status]
      );

      return this.getById(result.insertId);
    } finally {
      connection.release();
    }
  }

  static async getAll() {
    const connection = await pool.getConnection();
    try {
      const [services] = await connection.query(
        'SELECT id, name, description, duration, priority, status FROM services ORDER BY id ASC'
      );
      return services;
    } finally {
      connection.release();
    }
  }

  static async getById(id) {
    const connection = await pool.getConnection();
    try {
      const [services] = await connection.query(
        'SELECT id, name, description, duration, priority, status FROM services WHERE id = ?',
        [id]
      );
      return services[0] || null;
    } finally {
      connection.release();
    }
  }

  static async update(id, updateData) {
    const connection = await pool.getConnection();
    try {
      const { name, description, duration, priority, status } = updateData;
      await connection.query(
        'UPDATE services SET name = ?, description = ?, duration = ?, priority = ?, status = ? WHERE id = ?',
        [name, description, duration, priority, status, id]
      );
      return this.getById(id);
    } finally {
      connection.release();
    }
  }

  static async delete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.query('DELETE FROM services WHERE id = ?', [id]);
      return true;
    } finally {
      connection.release();
    }
  }
}

module.exports = Service;
