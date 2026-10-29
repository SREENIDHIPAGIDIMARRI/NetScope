import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';

import healthRoute from './routes/health.js';
import analyzeRoute from './routes/analyze.js';
import compareRoute from './routes/compare.js';
import historyRoute from './routes/history.js';
import diagnoseRoute from './routes/diagnose.js';
import reportsRoute from './routes/reports.js';
import troubleshootingRoute from './routes/troubleshooting.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend
const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for local development
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/health', healthRoute);
app.use('/api/analyze', analyzeRoute);
app.use('/api/compare', compareRoute);
app.use('/api/history', historyRoute);
app.use('/api/diagnose', diagnoseRoute);
app.use('/api/reports', reportsRoute);
app.use('/api/troubleshooting', troubleshootingRoute);

// Root fallback
app.get('/', (req, res) => {
  res.json({
    name: 'NetScope Backend API',
    status: 'online',
    endpoints: [
      '/api/health',
      '/api/analyze',
      '/api/compare',
      '/api/history',
      '/api/diagnose',
      '/api/reports',
      '/api/troubleshooting',
    ],
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.url}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error occurred.',
  });
});

// Connect Database and Start Server
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`NetScope Backend API Server running on port ${PORT}`);
    console.log(`Local URL: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

startServer();
