require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// Configuration & Validation
const { validateEnv } = require('./src/config/envCheck');
const connectDB = require('./src/config/db');
const seedDatabase = require('./src/utils/seedData');

// Middleware
const errorHandler = require('./src/middleware/errorHandler');
const requestLogger = require('./src/middleware/logger');
const { apiLimiter } = require('./src/middleware/rateLimiter');

// Route imports
const memoryRoutes = require('./src/routes/memoryRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const audioRoutes = require('./src/routes/audioRoutes');
const statsRoutes = require('./src/routes/statsRoutes');
const tagRoutes = require('./src/routes/tagRoutes');
const authRoutes = require('./src/routes/authRoutes');
const conversationRoutes = require('./src/routes/conversationRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const reminderRoutes = require('./src/routes/reminderRoutes');
const recapRoutes = require('./src/routes/recapRoutes');

// Validate environment on boot
validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for mobile app and client requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'RateLimit-Limit', 'RateLimit-Remaining'],
}));

// Request correlation ID and structured latency logging
app.use(requestLogger);

// Body parsing with safe size bounds
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Global API Rate Limiter
app.use('/api', apiLimiter);

// Serve static uploaded audio files with security headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
  },
}));

// Production Health & Monitoring endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const memUsage = process.memoryUsage();

  res.json({
    status: dbState === 1 ? 'healthy' : 'degraded',
    app: 'Echo – AI Voice-Based Memory Assistant Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
    },
    system: {
      nodeVersion: process.version,
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/recaps', recapRoutes);

// Catch-all 404 for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    },
    requestId: req.id || null,
    timestamp: new Date().toISOString(),
  });
});

// Centralized error handler
app.use(errorHandler);

// Global unhandled error resilience
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception thrown:', err.message, err.stack);
});

// Connect to MongoDB and start listening
let server;
connectDB().then((conn) => {
  if (conn) {
    seedDatabase();
  }
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` Echo Backend running at http://localhost:${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
  });
});

module.exports = { app, server };
