import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { dbReady } from './models/db';
import roomRoutes from './routes/rooms.routes';
import bookingRoutes from './routes/bookings.routes';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import logsRoutes from './routes/logs.routes';
import debugRoutes from './routes/debug.routes';

// Load .env file only if not running in a Docker environment
// In Docker, environment variables are injected via docker-compose.yml
if (process.env.NODE_ENV !== 'docker') {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Helmet middleware for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL // In production, we only trust one URL
    : ['http://localhost:4200', 'http://localhost:8080'], // Allow both for dev flexibility
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware for parsing JSON request bodies with size limit
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/logs', logsRoutes);

// Debug routes (only enabled in non-production environments)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', debugRoutes);
  console.log('[DEBUG] Seeding endpoint /api/debug/seed is enabled.');
}

// Basic route for testing server status
app.get('/', (req, res) => {
  res.send('13Rooms API is running!');
});

// Wait for database initialization before starting the server
dbReady
  .then(() => {
    app.listen(PORT, () => {
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
