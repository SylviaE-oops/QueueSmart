const database = require('../config/database');
const { addHistory, getHistoryByUserId } = require('../data/store');

function useDatabase() {
  return typeof database.isDatabaseEnabled === 'function' && database.isDatabaseEnabled();
}

function recordServedUser(userId, serviceId) {
  const entry = {
    userId: Number(userId),
    serviceId: Number(serviceId),
    servedAt: new Date().toISOString()
  };

  if (useDatabase()) {
    return (async () => {
      const pool = database.pool || database;
      const connection = await pool.getConnection();
      try {
        const [result] = await connection.query(
          'INSERT INTO history (userId, serviceId, servedAt) VALUES (?, ?, ?)',
          [entry.userId, entry.serviceId, entry.servedAt.slice(0, 19).replace('T', ' ')]
        );

        return {
          id: result.insertId,
          ...entry
        };
      } finally {
        connection.release();
      }
    })();
  }

  return addHistory(entry);
}

function getUserHistory(userId) {
  if (useDatabase()) {
    return (async () => {
      const pool = database.pool || database;
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.query(
          'SELECT id, userId, serviceId, servedAt FROM history WHERE userId = ? ORDER BY servedAt DESC, id DESC',
          [Number(userId)]
        );

        return rows.map((row) => ({
          id: Number(row.id),
          userId: Number(row.userId),
          serviceId: Number(row.serviceId),
          servedAt: new Date(row.servedAt).toISOString()
        }));
      } finally {
        connection.release();
      }
    })();
  }

  return getHistoryByUserId(Number(userId));
}

module.exports = {
  recordServedUser,
  getUserHistory
};
