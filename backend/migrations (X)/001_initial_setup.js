const mysql = require('mysql2/promise');
require('dotenv').config();

// Migration: Create initial tables
async function migrate_001_initial_setup() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'queuesmart'
  });

  try {
    console.log('Running migration: 001_initial_setup');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Users table created');

    // Create services table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        expectedDurationMin INT DEFAULT 5,
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        status ENUM('open', 'closed', 'maintenance') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Services table created');

    // Create queues table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS queues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        serviceId INT NOT NULL,
        position INT NOT NULL,
        status ENUM('waiting', 'almost_ready', 'ready', 'served', 'cancelled') DEFAULT 'waiting',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Queues table created');

    // Create history table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        serviceId INT NOT NULL,
        status ENUM('served', 'left', 'cancelled') DEFAULT 'left',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ History table created');

    console.log('✓ Migration 001 completed successfully');
  } catch (err) {
    console.error('✗ Migration 001 failed:', err.message);
    throw err;
  } finally {
    await connection.end();
  }
}

// Run migration
migrate_001_initial_setup().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
