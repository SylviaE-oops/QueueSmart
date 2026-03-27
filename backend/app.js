const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const queueRoutes = require('./routes/queueRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const historyRoutes = require('./routes/historyRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  return res.status(200).json({ status: 'ok' });
});

// Original routes — keep these so old code still works
app.use('/auth', authRoutes);
app.use('/services', serviceRoutes);
app.use('/queue', queueRoutes);
app.use('/notifications', notificationRoutes);
app.use('/history', historyRoutes);

// API aliases — add these for frontend compatibility
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/queues', queueRoutes); // added because frontend uses /api/queues
app.use('/api/notifications', notificationRoutes);
app.use('/api/history', historyRoutes);

app.use((req, res) => {
  return res.status(404).json({ error: 'route not found' });
});

app.use(errorHandler);

module.exports = app;
