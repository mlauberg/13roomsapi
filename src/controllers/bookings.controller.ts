import { Request, Response } from 'express';
import pool from '../models/db';

// Interface for Booking data
interface Booking {
  id: number;
  room_id: number;
  name: string;
  start_time: Date;
  end_time: Date;
  comment: string;
}

/**
 * @route GET /api/bookings
 * @desc Get all bookings
 * @access Public
 */
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<any[]>('SELECT * FROM bookings');
    const bookings: Booking[] = rows as Booking[];
    res.json(rows);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @route POST /api/bookings
 * @desc Create a new booking
 * @access Public
 */
export const createBooking = async (req: Request, res: Response) => {
  const { room_id, name, start_time, end_time, comment } = req.body;
  if (!room_id || !name || !start_time || !end_time) {
    return res.status(400).json({ message: 'Please enter all required fields' });
  }
  try {
    const [result] = await pool.query<any>(
      'INSERT INTO bookings (room_id, name, start_time, end_time, comment) VALUES (?, ?, ?, ?, ?)',
      [room_id, name, start_time, end_time, comment]
    );
    res.status(201).json({ message: 'Booking created successfully', bookingId: result.insertId });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @route DELETE /api/bookings/:id
 * @desc Delete a booking by ID
 * @access Public
 */
export const deleteBooking = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query<any>('DELETE FROM bookings WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
