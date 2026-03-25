const pool = require('../config/database');
const { SERVICE_STATUS } = require('../config/constants');

class Service {
  // Create a new service
  static async create(serviceData) {
    const { name, description, expectedDurationMin, priority, status = SERVICE_STATUS.OPEN } = serviceData;
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'INSERT INTO services (name, description, expectedDurationMin, priority, status) VALUES (?, ?, ?, ?, ?)',
        [name, description, expectedDurationMin, priority, status]
      );
      return { id: result.insertId, ...serviceData };
    } finally {
      connection.release();
    }
  }

  // Get all services
  static async getAll() {
    const connection = await pool.getConnection();
    try {
      const [services] = await connection.query('SELECT * FROM services');
      return services;
    } finally {
      connection.release();
    }
  }

  // Get service by ID
  static async getById(id) {
    const connection = await pool.getConnection();
    try {
      const [services] = await connection.query('SELECT * FROM services WHERE id = ?', [id]);
      return services[0] || null;
    } finally {
      connection.release();
    }
  }

  // Update service
  static async update(id, updateData) {
    const connection = await pool.getConnection();
    try {
      const { name, description, expectedDurationMin, priority, status } = updateData;
      await connection.query(
        'UPDATE services SET name = ?, description = ?, expectedDurationMin = ?, priority = ?, status = ? WHERE id = ?',
        [name, description, expectedDurationMin, priority, status, id]
      );
      return await this.getById(id);
    } finally {
      connection.release();
    }
  }

  // Delete service
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
