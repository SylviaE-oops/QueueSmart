require('dotenv').config();

let mysql = null;
try {
  mysql = require('mysql2/promise');
} catch (error) {
  console.warn('⚠ mysql2 is not installed yet. Run `npm install` in `backend` to enable MySQL persistence.');
}

const databaseEnabled =
  process.env.NODE_ENV !== 'test'
  && process.env.DB_ENABLED !== 'false'
  && Boolean(mysql);

const pool = databaseEnabled
  ? mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',//might have to change this if you have a different password or no password
      database: process.env.DB_NAME || 'queuesmart',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    })
  : null;

if (pool) {
  pool.getConnection()
    .then((connection) => {
      console.log('✓ MySQL Database Connected Successfully');
      connection.release();
    })
    .catch((error) => {
      console.warn(`⚠ MySQL unavailable, continuing with in-memory store: ${error.message}`);
    });
}

function isDatabaseEnabled() {
  return Boolean(pool);
}

module.exports = {
  pool,
  isDatabaseEnabled
};
