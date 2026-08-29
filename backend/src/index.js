const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { authLimiter, adminMutationLimiter, generalLimiter } = require('./middleware/rateLimit');
const bloomFilter = require('./utils/bloomFilter');

// Import routes
const authRoutes = require('./routes/auth');
// Note: Custom authController imports removed; auth is handled exclusively by Supabase Auth.
const emailRoutes = require('./routes/email');
const adminRoutes = require('./routes/admin');
const professorRoutes = require('./routes/professor');
const canteenRoutes = require('./routes/canteen');
const printRoutes = require('./routes/print');
const uploadRoutes = require('./routes/uploads');
const pushRoutes = require('./routes/push');
const usersRoutes = require('./routes/users');
const feedRoutes = require('./routes/feed');
const notesRoutes = require('./routes/notes');
const adminNotesRoutes = require('./routes/adminNotes');


const diaryRoutes = require('./routes/diary');
const studentRoutes = require('./routes/student');
const webhookRoutes = require('./routes/webhooks');
const http = require('http');
const { initSocket } = require('./config/socket');

const app = express();
const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://campusblink.me', 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (
      allowedOrigins.includes(origin) || 
      origin === 'https://campusblink.me' ||
      origin === 'http://localhost:5173' ||
      origin === 'https://campusblink.vercel.app' || 
      origin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    
    // Instead of throwing an error which causes a 500 HTML response, return false
    // so it just omits the Access-Control-Allow-Origin header
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// Request logging
app.use(morgan('combined'));

// Compression
app.use(compression());


// ── Clerk Webhooks (raw body MUST be parsed before express.json) ────────────
// svix signature verification requires the raw Buffer, not the parsed JSON.
// Mount this route first so the raw body middleware in webhooks.js takes effect.
app.use('/api/webhooks', webhookRoutes);

// Cookie parsing (required for secure HttpOnly JWT cookies)
app.use(cookieParser());

// Body parsing - JSON for most routes
app.use(express.json());

// Health check — includes Bloom Filter diagnostic stats
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    bloomFilter: bloomFilter.stats(),
  });
});

// Development info endpoint
if (process.env.NODE_ENV !== 'production') {
  app.get('/dev/info', (req, res) => {
    res.json({
      environment: process.env.NODE_ENV,
      message: 'Campus Blink Backend - Development Mode',
      note: 'Fill in .env file with Supabase and AWS S3 credentials',
      requiredEnvVars: [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'AWS_REGION',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_S3_BUCKET',
      ],
    });
  });
}

// Routes
// Note: Custom /api/register, /api/login, /api/logout routes removed. Auth is handled exclusively by Supabase Auth.
app.use('/api/auth', generalLimiter, authRoutes);
app.use('/api/email', generalLimiter, emailRoutes);
app.use('/api/users', generalLimiter, usersRoutes); // username check + registration
app.use('/api/admin', (req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    return adminMutationLimiter(req, res, next);
  }
  return generalLimiter(req, res, next);
}, adminRoutes);
app.use('/api/professor', generalLimiter, professorRoutes);
app.use('/api/canteen', generalLimiter, canteenRoutes);
app.use('/api/print', generalLimiter, printRoutes);
app.use('/api/uploads', generalLimiter, uploadRoutes);
app.use('/api/push', generalLimiter, pushRoutes);
app.use('/api/feed', generalLimiter, feedRoutes);
app.use('/api/notes', generalLimiter, notesRoutes);
app.use('/api/admin/notes', adminNotesRoutes);
const noticesRoutes = require('./routes/notices');
app.use('/api/notices', generalLimiter, noticesRoutes);

app.use('/api/diary', generalLimiter, diaryRoutes);
app.use('/api/student', generalLimiter, studentRoutes);

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

function validateStartupSecrets() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET environment variable is not set or is too short. Minimum 32 characters required.');
    process.exit(1);
  }
}

validateStartupSecrets();

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Development info: http://localhost:${PORT}/dev/info`);
  }

  // Asynchronously hydrate the Bloom Filter after the server is already
  // accepting connections. This means the server is immediately available;
  // the filter simply falls back to DB-only mode for the first few seconds
  // while hydration runs in the background.
  bloomFilter.hydrate().catch((err) => {
    console.error('[Startup] Bloom Filter hydration error (non-fatal):', err.message);
  });
});

module.exports = { app, server, io };
