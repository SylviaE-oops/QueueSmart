const mysql = require('mysql2/promise');
require('dotenv').config();

// Create MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'queuesmart',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection().then(connection => {
  console.log('✓ MySQL Database Connected Successfully');
  connection.release();
}).catch(err => {
  console.error('✗ Database Connection Failed:', err.message);
});

module.exports = pool;
