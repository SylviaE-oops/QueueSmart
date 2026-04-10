const mysql = require('mysql2/promise');
require('dotenv').config();

async function columnExists(connection, dbName, tableName, columnName) {
  const [rows] = await connection.query(
    `
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `,
    [dbName, tableName, columnName]
  );

  return rows[0] || null;
}

async function migrateLegacyServicesTable(connection, dbName) {
  const legacyDuration = await columnExists(connection, dbName, 'services', 'expectedDurationMin');
  const duration = await columnExists(connection, dbName, 'services', 'duration');
  const priority = await columnExists(connection, dbName, 'services', 'priority');

  if (legacyDuration && !duration) {
    await connection.query(
      'ALTER TABLE services CHANGE COLUMN expectedDurationMin duration INT NOT NULL DEFAULT 5'
    );
    console.log('✓ Migrated `services.expectedDurationMin` to `duration`');
  }

  if (priority && !/^int/i.test(priority.COLUMN_TYPE)) {
    await connection.query(
      'ALTER TABLE services MODIFY COLUMN priority INT NOT NULL DEFAULT 2'
    );
    console.log('✓ Migrated `services.priority` to INT');
  }

  await connection.query(
    'ALTER TABLE services MODIFY COLUMN description TEXT NOT NULL, MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT \'open\''
  );
}

async function initDatabase() {
  const dbName = process.env.DB_NAME || 'queuesmart';

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('✓ Connected to MySQL');

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);
    console.log(`✓ Database '${dbName}' created/selected`);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        duration INT NOT NULL DEFAULT 5,
        priority INT NOT NULL DEFAULT 1,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await migrateLegacyServicesTable(connection, dbName);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS queue_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        serviceId INT NOT NULL,
        userId INT NOT NULL,
        priority INT NOT NULL DEFAULT 1,
        status VARCHAR(50) NOT NULL DEFAULT 'waiting',
        joinedAt DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_service_user (serviceId, userId),
        CONSTRAINT fk_queue_service FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE,
        CONSTRAINT fk_queue_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        serviceId INT NOT NULL,
        servedAt DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT 'Notification',
        message TEXT NOT NULL,
        type VARCHAR(100) NOT NULL DEFAULT 'info',
        isRead TINYINT(1) NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.end();
    console.log('✓ MySQL schema is ready');
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

initDatabase();
