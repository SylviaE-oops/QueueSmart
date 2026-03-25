const pool = require('../config/database');

class User {
  // Create a new user
  static async create(userData) {
    const { email, password, role = 'user' } = userData;
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [email, password, role]
      );
      return { id: result.insertId, email, role };
    } finally {
      connection.release();
    }
  }

  // Get user by email
  static async getByEmail(email) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
      return users[0] || null;
    } finally {
      connection.release();
    }
  }

  // Get user by ID
  static async getById(id) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.query('SELECT id, email, role, created_at FROM users WHERE id = ?', [id]);
      return users[0] || null;
    } finally {
      connection.release();
    }
  }

  // Get all users
  static async getAll() {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.query('SELECT id, email, role, created_at FROM users');
      return users;
    } finally {
      connection.release();
    }
  }

  // Update user
  static async update(id, updateData) {
    const connection = await pool.getConnection();
    try {
      const { email, role } = updateData;
      await connection.query(
        'UPDATE users SET email = ?, role = ? WHERE id = ?',
        [email, role, id]
      );
      return await this.getById(id);
    } finally {
      connection.release();
    }
  }

  // Delete user
  static async delete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.query('DELETE FROM users WHERE id = ?', [id]);
      return true;
    } finally {
      connection.release();
    }
  }
}

module.exports = User;
