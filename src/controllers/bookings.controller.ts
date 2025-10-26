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
 * @route GET /api/bookings/room/:roomId
 * @desc Get all bookings for a specific room (optionally filtered by date)
 * @access Public
 */
export const getBookingsByRoomId = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { date } = req.query;

  try {
    let query = 'SELECT * FROM bookings WHERE room_id = ?';
    const params: any[] = [roomId];

    // If date is provided, filter bookings for that specific date
    if (date) {
      const dateStr = date as string;
      const startOfDay = `${dateStr} 00:00:00`;
      const endOfDay = `${dateStr} 23:59:59`;
      query += ' AND start_time >= ? AND start_time <= ?';
      params.push(startOfDay, endOfDay);
      console.log(`Fetching bookings for room ${roomId} on ${dateStr}`);
    } else {
      console.log(`Fetching all bookings for room ${roomId}`);
    }

    query += ' ORDER BY start_time ASC';

    const [rows] = await pool.query<any[]>(query, params);
    const bookings: Booking[] = rows as Booking[];
    console.log(`Found ${bookings.length} bookings for room ${roomId}`);
    res.json(bookings);
  } catch (error) {
    console.error(`Error fetching bookings for room ${roomId}:`, error);
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
    // CRITICAL: Server-side conflict check to prevent booking overwrites
    // Check for overlapping bookings before inserting
    // A booking overlaps if:
    // 1. It starts before the requested end time AND
    // 2. It ends after the requested start time
    const [existingBookings] = await pool.query<any[]>(
      `SELECT id, room_id, name, start_time, end_time
       FROM bookings
       WHERE room_id = ?
       AND start_time < ?
       AND end_time > ?`,
      [room_id, end_time, start_time]
    );

    // If any overlapping booking exists, reject the request
    if (existingBookings.length > 0) {
      const conflict = existingBookings[0];
      console.log(`Booking conflict detected for room ${room_id}:`, conflict);
      return res.status(409).json({
        message: 'Dieser Zeitraum ist bereits gebucht.',
        conflict: {
          name: conflict.name,
          start_time: conflict.start_time,
          end_time: conflict.end_time
        }
      });
    }

    // No conflict - proceed with insertion
    const [result] = await pool.query<any>(
      'INSERT INTO bookings (room_id, name, start_time, end_time, comment) VALUES (?, ?, ?, ?, ?)',
      [room_id, name, start_time, end_time, comment]
    );

    console.log(`Booking created successfully for room ${room_id}: ${start_time} - ${end_time}`);
    res.status(201).json({ message: 'Booking created successfully', bookingId: result.insertId });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @route GET /api/bookings/check-conflict/:roomId
 * @desc Check if a time slot has a booking conflict
 * @access Public
 */
export const checkBookingConflict = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { date, startTime, endTime } = req.query;

  console.log(`Checking conflict for room ${roomId}: ${date} ${startTime}-${endTime}`);

  if (!date || !startTime || !endTime) {
    return res.status(400).json({ message: 'Date, startTime, and endTime are required' });
  }

  try {
    // Combine date with times to create full datetime strings
    const requestedStart = `${date} ${startTime}:00`;
    const requestedEnd = `${date} ${endTime}:00`;

    // Query for overlapping bookings
    // A booking overlaps if:
    // 1. It starts before the requested end time AND
    // 2. It ends after the requested start time
    const [rows] = await pool.query<any[]>(
      `SELECT id, room_id, name, start_time, end_time, comment
       FROM bookings
       WHERE room_id = ?
       AND start_time < ?
       AND end_time > ?`,
      [roomId, requestedEnd, requestedStart]
    );

    if (rows.length > 0) {
      console.log(`Conflict found for room ${roomId}:`, rows[0]);
      // Return the first conflicting booking
      res.json(rows[0]);
    } else {
      console.log(`No conflict found for room ${roomId}`);
      // No conflict found
      res.json(null);
    }
  } catch (error) {
    console.error(`Error checking booking conflict for room ${roomId}:`, error);
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
