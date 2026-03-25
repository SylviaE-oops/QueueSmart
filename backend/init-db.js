const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
  try {
    // Connect without specifying a database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('✓ Connected to MySQL');

    // Create database
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'queuesmart'}`);
    console.log(`✓ Database '${process.env.DB_NAME || 'queuesmart'}' created/exists`);

    // Create tables
    await connection.query(`USE ${process.env.DB_NAME || 'queuesmart'}`);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS queues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Table "queues" created/exists');

    await connection.end();
    console.log('✓ Database initialization complete!');
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

initDatabase();
