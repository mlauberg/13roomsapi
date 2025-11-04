import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import roomRoutes from './routes/rooms.routes';
import bookingRoutes from './routes/bookings.routes';
import authRoutes from './routes/auth.routes';

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

// Basic route for testing server status
app.get('/', (req, res) => {
  res.send('13Rooms API is running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
