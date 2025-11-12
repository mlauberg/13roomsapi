import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dbReady } from './models/db';
import roomRoutes from './routes/rooms.routes';
import bookingRoutes from './routes/bookings.routes';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import logsRoutes from './routes/logs.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- START OF FIX ---

// Define CORS options
const corsOptions = {
  origin: 'http://localhost:4200', // Allow only the Angular app to connect
  optionsSuccessStatus: 200 // For legacy browser support
};

// Use CORS middleware with the specified options
// THIS MUST BE PLACED BEFORE YOUR ROUTES
app.use(cors(corsOptions));

// --- END OF FIX ---

// Middleware for parsing JSON request bodies
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/logs', logsRoutes);

// Basic route for testing server status
app.get('/', (req, res) => {
  res.send('13Rooms API is running!');
});

// Wait for database initialization before starting the server
dbReady
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
