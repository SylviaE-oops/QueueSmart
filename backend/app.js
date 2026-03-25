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

app.get('/health', (req, res) => {
  return res.status(200).json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/services', serviceRoutes);
app.use('/queue', queueRoutes);
app.use('/notifications', notificationRoutes);
app.use('/history', historyRoutes);

app.use((req, res) => {
  return res.status(404).json({ error: 'route not found' });
});

app.use(errorHandler);

module.exports = app;
