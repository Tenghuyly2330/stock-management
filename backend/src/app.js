const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const metricsMiddleware = require('./middleware/metricsMiddleware');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const { register } = require('./utils/metrics');

const app = express();

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.isDevelopment) return callback(null, true);

      const allowedList = env.CLIENT_URL ? env.CLIENT_URL.split(',').map((u) => u.trim()) : [];
      if (
        allowedList.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Blocked by CORS policy: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

app.use(metricsMiddleware);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(requestLogger);

// Prometheus Scrape Endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Root & Kubernetes Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.use('/api', apiRoutes);

app.use(notFoundHandler);

app.use(errorHandler);

module.exports = app;


