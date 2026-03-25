const User = require('../models/User');

class UserController {
  // Create a new user (register)
  static async register(req, res) {
    try {
      const { email, password, role } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Check if user already exists
      const existingUser = await User.getByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const user = await User.create({ email, password, role: role || 'user' });
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Get all users (admin only)
  static async getAll(req, res) {
    try {
      const users = await User.getAll();
      res.json({ success: true, data: users });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Get user by ID
  static async getById(req, res) {
    try {
      const user = await User.getById(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Get user by email
  static async getByEmail(req, res) {
    try {
      const user = await User.getByEmail(req.params.email);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Update user
  static async update(req, res) {
    try {
      const user = await User.update(req.params.id, req.body);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ success: true, data: user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Delete user
  static async delete(req, res) {
    try {
      await User.delete(req.params.id);
      res.json({ success: true, message: 'User deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Login (placeholder - implement JWT later)
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await User.getByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // TODO: Implement proper password hashing and verification
      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      res.json({ success: true, data: { id: user.id, email: user.email, role: user.role } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = UserController;
