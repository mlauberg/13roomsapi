import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import roomRoutes from './routes/rooms.routes';
import bookingRoutes from './routes/bookings.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS
app.use(cors({
  origin: 'http://localhost:4200', // Allow requests from Angular frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware for parsing JSON request bodies
app.use(express.json());

// API Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);

// Basic route for testing server status
app.get('/', (req, res) => {
  res.send('13Rooms API is running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
