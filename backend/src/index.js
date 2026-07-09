const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const rateLimitMiddleware = require('./middleware/rateLimit');

// Import routes
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const adminRoutes = require('./routes/admin');
const professorRoutes = require('./routes/professor');
const canteenRoutes = require('./routes/canteen');
const printRoutes = require('./routes/print');
const uploadRoutes = require('./routes/uploads');
const pushRoutes = require('./routes/push');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://campusblink.me', 'http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
app.use(morgan('combined'));

// Compression
app.use(compression());

// Rate limiting
app.use(rateLimitMiddleware);

// Body parsing - JSON for most routes
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Development info endpoint
if (process.env.NODE_ENV !== 'production') {
  app.get('/dev/info', (req, res) => {
    res.json({
      environment: process.env.NODE_ENV,
      message: 'Campus Blink Backend - Development Mode',
      note: 'Fill in .env file with Supabase and Cloudinary credentials',
      requiredEnvVars: [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET',
      ],
    });
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/professor', professorRoutes);
app.use('/api/canteen', canteenRoutes);
app.use('/api/print', printRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/push', pushRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err);

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(status).json({
    error: message,
    status,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Development info: http://localhost:${PORT}/dev/info`);
  }
});

module.exports = app;
