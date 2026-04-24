require('dotenv').config();
const express = require('express');
const cors = require('cors');
//const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'queuesmart_user',
  password: process.env.DB_PASSWORD || 'queuesmart123',
  database: process.env.DB_NAME || 'queuesmart',
  waitForConnections: true,
  connectionLimit: 10,
});

function sendError(res, status, message) {
  return res.status(status).json({ ok: false, message });
}

function estimateWaitTime(position, expectedDurationMin) {
  return Math.max(0, (Number(position) - 1) * Number(expectedDurationMin || 0));
}

function normalizeRole(role) {
  return role === 'admin' ? 'admin' : 'user';
}

async function createNotification(userId, message, channel = 'in_app', connection = pool) {
  await connection.execute(
    'INSERT INTO notifications (user_id, message, channel) VALUES (?, ?, ?)',
    [userId, message, channel]
  );
}

async function addHistory(userId, serviceId, action, connection = pool) {
  await connection.execute(
    'INSERT INTO history (user_id, service_id, action) VALUES (?, ?, ?)',
    [userId, serviceId, action]
  );
}

async function resequenceQueue(serviceId, connection) {
  const [entries] = await connection.execute(
    `SELECT id FROM queue_entries
     WHERE service_id = ? AND status IN ('waiting', 'almost_ready', 'serving')
     ORDER BY position ASC, joined_at ASC`,
    [serviceId]
  );

  for (let i = 0; i < entries.length; i += 1) {
    await connection.execute('UPDATE queue_entries SET position = ? WHERE id = ?', [i + 1, entries[i].id]);
  }
}

async function getServiceSummary(connection = pool) {
  const [rows] = await connection.execute(
    `SELECT
      s.id,
      s.name,
      s.description,
      s.is_open AS isOpen,
      s.location_id AS locationId,
      l.name AS locationName,
      COUNT(CASE WHEN qe.status IN ('waiting', 'almost_ready', 'serving') THEN 1 END) AS activeQueueLength
    FROM services s
    LEFT JOIN locations l ON l.id = s.location_id
    LEFT JOIN queue_entries qe ON qe.service_id = s.id
    GROUP BY s.id, l.name
    ORDER BY s.id ASC`
  );

  return rows.map((row) => ({
    ...row,
    isOpen: Boolean(row.isOpen),
  }));
}

app.get('/api/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    res.json({ ok: true, message: 'QueueSmart API is running.' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Database connection failed.', error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const fullName = String(req.body.fullName || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = normalizeRole(req.body.role);

    if (!fullName) return sendError(res, 400, 'Full name is required.');
    if (!email) return sendError(res, 400, 'Email is required.');
    if (password.length < 6) return sendError(res, 400, 'Password must be at least 6 characters.');

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return sendError(res, 409, 'An account with that email already exists.');

    const passwordHash = password;
    const [result] = await pool.execute(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [fullName, email, passwordHash, role]
    );

    await createNotification(result.insertId, 'Welcome to QueueSmart.', 'in_app');

    res.status(201).json({
      ok: true,
      message: 'Registration successful.',
      user: { id: result.insertId, fullName, email, role },
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Registration failed.', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) return sendError(res, 400, 'Email and password are required.');

    const [rows] = await pool.execute(
      'SELECT id, full_name AS fullName, email, password_hash AS passwordHash, role FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows.length) return sendError(res, 401, 'Invalid email or password.');

    const user = rows[0];
    const matches = password === user.passwordHash;
    if (!matches) return sendError(res, 401, 'Invalid email or password.');

    res.json({
      ok: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Login failed.', error: error.message });
  }
});

app.get('/api/services', async (req, res) => {
  try {
    const services = await getServiceSummary();
    res.json({ ok: true, services });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not load services.', error: error.message });
  }
});

app.post('/api/services', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const isOpen = Boolean(req.body.isOpen);
    const locationId = req.body.locationId ? Number(req.body.locationId) : null;

    if (!name) return sendError(res, 400, 'Service name is required.');
    if (!description) return sendError(res, 400, 'Description is required.');

    const [result] = await pool.execute(
      `INSERT INTO services (name, description, is_open, location_id) VALUES (?, ?, ?, ?)`,
      [name, description, isOpen, locationId]
    );

    res.status(201).json({ ok: true, message: 'Service created.', serviceId: result.insertId });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not create service.', error: error.message });
  }
});

app.put('/api/services/:id', async (req, res) => {
  try {
    const serviceId = Number(req.params.id);
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const isOpen = Boolean(req.body.isOpen);
    const locationId = req.body.locationId ? Number(req.body.locationId) : null;

    if (!serviceId) return sendError(res, 400, 'Valid service id is required.');
    if (!name) return sendError(res, 400, 'Service name is required.');
    if (!description) return sendError(res, 400, 'Description is required.');

    await pool.execute(
      `UPDATE services SET name = ?, description = ?, is_open = ?, location_id = ? WHERE id = ?`,
      [name, description, isOpen, locationId, serviceId]
    );

    res.json({ ok: true, message: 'Service updated.' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not update service.', error: error.message });
  }
});

app.get('/api/queues/service/:serviceId', async (req, res) => {
  try {
    const serviceId = Number(req.params.serviceId);
    const [rows] = await pool.execute(
      `SELECT qe.id, qe.position, qe.status, qe.joined_at AS joinedAt,
              u.id AS userId, u.full_name AS fullName, u.email
       FROM queue_entries qe
       INNER JOIN users u ON u.id = qe.user_id
       WHERE qe.service_id = ? AND qe.status IN ('waiting', 'almost_ready', 'serving')
       ORDER BY qe.position ASC, qe.joined_at ASC`,
      [serviceId]
    );

    res.json({ ok: true, queue: rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not load queue.', error: error.message });
  }
});

app.get('/api/queues/user/:userId/current', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const [rows] = await pool.execute(
      `SELECT qe.id, qe.position, qe.status, qe.joined_at AS joinedAt,
              s.id AS serviceId, s.name AS serviceName,
              s.location_id AS locationId, l.name AS locationName
       FROM queue_entries qe
       INNER JOIN services s ON s.id = qe.service_id
       LEFT JOIN locations l ON l.id = s.location_id
       WHERE qe.user_id = ? AND qe.status IN ('waiting', 'almost_ready', 'serving')
       ORDER BY qe.joined_at DESC
       LIMIT 1`,
      [userId]
    );

    if (!rows.length) return res.json({ ok: true, entry: null });

    res.json({ ok: true, entry: rows[0] });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not load queue status.', error: error.message });
  }
});

app.post('/api/queues/join', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const userId = Number(req.body.userId);
    const serviceId = Number(req.body.serviceId);

    if (!userId || !serviceId) {
      await connection.rollback();
      return sendError(res, 400, 'User id and service id are required.');
    }

    const [existing] = await connection.execute(
      `SELECT id FROM queue_entries
       WHERE user_id = ? AND status IN ('waiting', 'almost_ready', 'serving')
       LIMIT 1`,
      [userId]
    );

    if (existing.length) {
      await connection.rollback();
      return sendError(res, 409, 'This user is already in an active queue.');
    }

    const [services] = await connection.execute(
      'SELECT id, name, is_open AS isOpen FROM services WHERE id = ? LIMIT 1',
      [serviceId]
    );

    if (!services.length) {
      await connection.rollback();
      return sendError(res, 404, 'Service not found.');
    }

    const service = services[0];
    if (!service.isOpen) {
      await connection.rollback();
      return sendError(res, 400, 'This service is currently closed.');
    }

    const [queueRows] = await connection.execute(
      `SELECT COUNT(*) AS count
       FROM queue_entries
       WHERE service_id = ? AND status IN ('waiting', 'almost_ready', 'serving')`,
      [serviceId]
    );

    const position = Number(queueRows[0].count) + 1;

    const [result] = await connection.execute(
      'INSERT INTO queue_entries (user_id, service_id, position, status) VALUES (?, ?, ?, ?)',
      [userId, serviceId, position, 'waiting']
    );

    await addHistory(userId, serviceId, 'joined queue', connection);
    await createNotification(userId, `You joined ${service.name}. Your current position is ${position}.`, 'in_app', connection);

    await connection.commit();

    res.status(201).json({
      ok: true,
      message: 'Joined queue successfully.',
      entry: {
        id: result.insertId,
        userId,
        serviceId,
        position,
        status: 'waiting',

      },
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ ok: false, message: 'Could not join queue.', error: error.message });
  } finally {
    connection.release();
  }
});

app.post('/api/queues/leave', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const userId = Number(req.body.userId);
    if (!userId) {
      await connection.rollback();
      return sendError(res, 400, 'User id is required.');
    }

    const [rows] = await connection.execute(
      `SELECT id, service_id AS serviceId
       FROM queue_entries
       WHERE user_id = ? AND status IN ('waiting', 'almost_ready', 'serving')
       ORDER BY joined_at DESC LIMIT 1`,
      [userId]
    );

    if (!rows.length) {
      await connection.rollback();
      return sendError(res, 404, 'No active queue entry found for this user.');
    }

    const entry = rows[0];
    await connection.execute('UPDATE queue_entries SET status = ? WHERE id = ?', ['cancelled', entry.id]);
    await resequenceQueue(entry.serviceId, connection);
    await addHistory(userId, entry.serviceId, 'left queue', connection);
    await createNotification(userId, 'You left the queue.', 'in_app', connection);

    await connection.commit();
    res.json({ ok: true, message: 'Queue entry cancelled.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ ok: false, message: 'Could not leave queue.', error: error.message });
  } finally {
    connection.release();
  }
});

app.post('/api/admin/queue/serve-next', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const serviceId = Number(req.body.serviceId);
    if (!serviceId) {
      await connection.rollback();
      return sendError(res, 400, 'Service id is required.');
    }

    const [rows] = await connection.execute(
      `SELECT qe.id, qe.user_id AS userId, s.name AS serviceName
       FROM queue_entries qe
       INNER JOIN services s ON s.id = qe.service_id
       WHERE qe.service_id = ? AND qe.status IN ('waiting', 'almost_ready', 'serving')
       ORDER BY qe.position ASC, qe.joined_at ASC
       LIMIT 1`,
      [serviceId]
    );

    if (!rows.length) {
      await connection.rollback();
      return sendError(res, 404, 'No active queue entries for this service.');
    }

    const entry = rows[0];
    await connection.execute('UPDATE queue_entries SET status = ? WHERE id = ?', ['completed', entry.id]);
    await addHistory(entry.userId, serviceId, 'served', connection);
    await createNotification(entry.userId, `You have been served at ${entry.serviceName}.`, 'email', connection);
    await createNotification(entry.userId, `You have been served at ${entry.serviceName}.`, 'sms', connection);
    await createNotification(entry.userId, `You have been served at ${entry.serviceName}.`, 'in_app', connection);
    await resequenceQueue(serviceId, connection);

    const [nextRows] = await connection.execute(
      `SELECT qe.id, qe.user_id AS userId, qe.position, s.name AS serviceName
       FROM queue_entries qe
       INNER JOIN services s ON s.id = qe.service_id
       WHERE qe.service_id = ? AND qe.status IN ('waiting', 'almost_ready', 'serving')
       ORDER BY qe.position ASC, qe.joined_at ASC
       LIMIT 1`,
      [serviceId]
    );

    if (nextRows.length) {
      const next = nextRows[0];
      await connection.execute('UPDATE queue_entries SET status = ? WHERE id = ?', ['almost_ready', next.id]);
      await createNotification(next.userId, `Please head to ${next.serviceName}. You are almost ready.`, 'email', connection);
      await createNotification(next.userId, `Please head to ${next.serviceName}. You are almost ready.`, 'sms', connection);
      await createNotification(next.userId, `Please head to ${next.serviceName}. You are almost ready.`, 'in_app', connection);
    }

    await connection.commit();
    res.json({ ok: true, message: 'Served next user successfully.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ ok: false, message: 'Could not serve next user.', error: error.message });
  } finally {
    connection.release();
  }
});

app.post('/api/admin/queue/reorder', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const serviceId = Number(req.body.serviceId);
    const orderedEntryIds = Array.isArray(req.body.orderedEntryIds) ? req.body.orderedEntryIds.map(Number) : [];

    if (!serviceId || !orderedEntryIds.length) {
      await connection.rollback();
      return sendError(res, 400, 'Service id and ordered entry ids are required.');
    }

    for (let i = 0; i < orderedEntryIds.length; i += 1) {
      await connection.execute(
        'UPDATE queue_entries SET position = ? WHERE id = ? AND service_id = ?',
        [i + 1, orderedEntryIds[i], serviceId]
      );
    }

    await connection.commit();
    res.json({ ok: true, message: 'Queue reordered.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ ok: false, message: 'Could not reorder queue.', error: error.message });
  } finally {
    connection.release();
  }
});

app.post('/api/admin/queue/remove-entry', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const entryId = Number(req.body.entryId);

    const [rows] = await connection.execute(
      'SELECT id, user_id AS userId, service_id AS serviceId FROM queue_entries WHERE id = ? LIMIT 1',
      [entryId]
    );

    if (!rows.length) {
      await connection.rollback();
      return sendError(res, 404, 'Queue entry not found.');
    }

    const entry = rows[0];
    await connection.execute('UPDATE queue_entries SET status = ? WHERE id = ?', ['cancelled', entry.id]);
    await addHistory(entry.userId, entry.serviceId, 'removed by admin', connection);
    await createNotification(entry.userId, 'Your queue entry was removed by an administrator.', 'in_app', connection);
    await resequenceQueue(entry.serviceId, connection);

    await connection.commit();
    res.json({ ok: true, message: 'Queue entry removed.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ ok: false, message: 'Could not remove queue entry.', error: error.message });
  } finally {
    connection.release();
  }
});

app.post('/api/book-requests', async (req, res) => {
  try {
    const userId = Number(req.body.userId);
    const bookTitle = String(req.body.bookTitle || '').trim();
    const author = String(req.body.author || '').trim();
    const isbn = String(req.body.isbn || '').trim();
    const courseCode = String(req.body.courseCode || '').trim();
    const notes = String(req.body.notes || '').trim();

    if (!userId) return sendError(res, 400, 'User id is required.');
    if (!bookTitle) return sendError(res, 400, 'Book title is required.');

    const [users] = await pool.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!users.length) return sendError(res, 404, 'User not found.');

    const [result] = await pool.execute(
      `INSERT INTO book_requests (user_id, book_title, author, isbn, course_code, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, bookTitle, author || null, isbn || null, courseCode || null, notes || null]
    );

    await createNotification(userId, `Book request received for "${bookTitle}".`, 'in_app');

    res.status(201).json({
      ok: true,
      message: 'Book request submitted successfully.',
      requestId: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not submit book request.', error: error.message });
  }
});

app.get('/api/book-requests/user/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return sendError(res, 400, 'Valid user id is required.');

    const [rows] = await pool.execute(
      `SELECT br.id,
              br.book_title AS bookTitle,
              br.author,
              br.isbn,
              br.course_code AS courseCode,
              br.notes,
              br.status,
              br.location_id AS locationId,
              l.name AS locationName,
              br.ready_at AS readyAt,
              br.created_at AS createdAt
       FROM book_requests br
       LEFT JOIN locations l ON l.id = br.location_id
       WHERE br.user_id = ?
       ORDER BY br.created_at DESC`,
      [userId]
    );

    res.json({ ok: true, requests: rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not load book requests.', error: error.message });
  }
});

app.get('/api/history/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const [rows] = await pool.execute(
      `SELECT h.id, h.action, h.action_time AS actionTime, s.name AS serviceName
       FROM history h
       INNER JOIN services s ON s.id = h.service_id
       WHERE h.user_id = ?
       ORDER BY h.action_time DESC`,
      [userId]
    );

    res.json({ ok: true, history: rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not load history.', error: error.message });
  }
});

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const [rows] = await pool.execute(
      `SELECT id, message, channel, is_read AS isRead, created_at AS createdAt
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 25`,
      [userId]
    );

    res.json({ ok: true, notifications: rows.map((row) => ({ ...row, isRead: Boolean(row.isRead) })) });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not load notifications.', error: error.message });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    await pool.execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [Number(req.params.id)]);
    res.json({ ok: true, message: 'Notification marked as read.' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not update notification.', error: error.message });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const [totals] = await pool.execute(
      `SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM services) AS services,
        (SELECT COUNT(*) FROM queue_entries WHERE status IN ('waiting', 'almost_ready', 'serving')) AS activeQueueEntries,
        (SELECT COUNT(*) FROM history WHERE action = 'served') AS servedCount,
        (SELECT COUNT(*) FROM notifications) AS notificationsSent`
    );

    const [serviceStats] = await pool.execute(
      `SELECT s.name,
              COUNT(CASE WHEN qe.status IN ('waiting', 'almost_ready', 'serving') THEN 1 END) AS activeQueueLength,
              COUNT(CASE WHEN h.action = 'served' THEN 1 END) AS totalServed,
       FROM services s
       LEFT JOIN queue_entries qe ON qe.service_id = s.id
       LEFT JOIN history h ON h.service_id = s.id
       GROUP BY s.id
       ORDER BY s.id ASC`
    );

    res.json({ ok: true, totals: totals[0], serviceStats });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not load statistics.', error: error.message });
  }
});

// ── Locations ──────────────────────────────────────────────────────────────────

app.get('/api/locations', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, address, max_queues AS maxQueues, created_at AS createdAt FROM locations ORDER BY name ASC'
    );
    res.json({ ok: true, locations: rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not load locations.', error: error.message });
  }
});

app.post('/api/locations', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const address = String(req.body.address || '').trim();
    const maxQueues = Number(req.body.maxQueues || 1);

    if (!name) return sendError(res, 400, 'Location name is required.');
    if (!Number.isInteger(maxQueues) || maxQueues < 1) return sendError(res, 400, 'Max queues must be a positive integer.');

    const [result] = await pool.execute(
      'INSERT INTO locations (name, address, max_queues) VALUES (?, ?, ?)',
      [name, address || null, maxQueues]
    );

    res.status(201).json({ ok: true, message: 'Location created.', locationId: result.insertId });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not create location.', error: error.message });
  }
});

app.put('/api/locations/:id', async (req, res) => {
  try {
    const locationId = Number(req.params.id);
    const name = String(req.body.name || '').trim();
    const address = String(req.body.address || '').trim();
    const maxQueues = Number(req.body.maxQueues || 1);

    if (!locationId) return sendError(res, 400, 'Valid location id is required.');
    if (!name) return sendError(res, 400, 'Location name is required.');
    if (!Number.isInteger(maxQueues) || maxQueues < 1) return sendError(res, 400, 'Max queues must be a positive integer.');

    const [existing] = await pool.execute('SELECT id FROM locations WHERE id = ? LIMIT 1', [locationId]);
    if (!existing.length) return sendError(res, 404, 'Location not found.');

    await pool.execute(
      'UPDATE locations SET name = ?, address = ?, max_queues = ? WHERE id = ?',
      [name, address || null, maxQueues, locationId]
    );

    res.json({ ok: true, message: 'Location updated.' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not update location.', error: error.message });
  }
});

app.delete('/api/locations/:id', async (req, res) => {
  try {
    const locationId = Number(req.params.id);
    if (!locationId) return sendError(res, 400, 'Valid location id is required.');

    const [existing] = await pool.execute('SELECT id FROM locations WHERE id = ? LIMIT 1', [locationId]);
    if (!existing.length) return sendError(res, 404, 'Location not found.');

    await pool.execute('DELETE FROM locations WHERE id = ?', [locationId]);

    res.json({ ok: true, message: 'Location deleted.' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not delete location.', error: error.message });
  }
});

// ── Admin book requests ────────────────────────────────────────────────────────

app.get('/api/admin/book-requests', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
         br.id,
         br.book_title AS bookTitle,
         br.author,
         br.isbn,
         br.course_code AS courseCode,
         br.notes,
         br.status,
         br.location_id AS locationId,
         l.name AS locationName,
         br.ready_at AS readyAt,
         br.picked_up_at AS pickedUpAt,
         br.created_at AS createdAt,
         u.id AS userId,
         u.full_name AS studentName,
         u.email AS studentEmail
       FROM book_requests br
       INNER JOIN users u ON u.id = br.user_id
       LEFT JOIN locations l ON l.id = br.location_id
       ORDER BY br.created_at DESC`
    );

    res.json({ ok: true, requests: rows });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Could not load book requests.', error: error.message });
  }
});

app.patch('/api/admin/book-requests/:id/status', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const requestId = Number(req.params.id);
    const status = req.body.status;
    const locationId = req.body.locationId ? Number(req.body.locationId) : null;

    const validStatuses = ['pending', 'preparing', 'ready', 'picked_up'];
    if (!validStatuses.includes(status)) return sendError(res, 400, 'Invalid status value.');

    const [rows] = await connection.execute(
      `SELECT br.id, br.user_id, br.book_title, br.status
       FROM book_requests br WHERE br.id = ? LIMIT 1`,
      [requestId]
    );
    if (!rows.length) {
      await connection.rollback();
      return sendError(res, 404, 'Book request not found.');
    }

    const request = rows[0];

    // Validate location is provided when moving to ready
    if (status === 'ready' && !locationId) {
      await connection.rollback();
      return sendError(res, 400, 'A location must be assigned when marking a request as ready.');
    }

    const updates = { status };
    if (locationId) updates.location_id = locationId;
    if (status === 'ready') updates.ready_at = new Date();
    if (status === 'picked_up') updates.picked_up_at = new Date();

    const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), requestId];

    await connection.execute(`UPDATE book_requests SET ${setClauses} WHERE id = ?`, values);

    // Notify student when status changes meaningfully
    if (status === 'preparing') {
      await createNotification(
        request.user_id,
        `Your request for "${request.book_title}" is being prepared.`,
        'in_app',
        connection
      );
    }

    if (status === 'ready') {
      const [locRows] = await connection.execute('SELECT name FROM locations WHERE id = ? LIMIT 1', [locationId]);
      const locationName = locRows.length ? locRows[0].name : 'the assigned location';
      await createNotification(
        request.user_id,
        `Your books ("${request.book_title}") are ready for pick-up at ${locationName}. You can now join the queue!`,
        'in_app',
        connection
      );
    }

    await connection.commit();
    res.json({ ok: true, message: `Request marked as ${status}.` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ ok: false, message: 'Could not update book request status.', error: error.message });
  } finally {
    connection.release();
  }
});

app.listen(PORT, () => {
  console.log(`QueueSmart backend running on http://localhost:${PORT}`);
});
