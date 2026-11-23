require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./src/config/db');
const seedDatabase = require('./src/utils/seedData');
const errorHandler = require('./src/middleware/errorHandler');

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

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for mobile app and local development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static uploaded audio files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Echo – AI Voice-Based Memory Assistant Backend',
    version: '1.0.0',
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
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler
app.use(errorHandler);

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
