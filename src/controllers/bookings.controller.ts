import { Request, Response } from 'express';
import pool from '../models/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Interface for Booking data
interface Booking {
  id: number;
  room_id: number;
  title: string;
  start_time: Date;
  end_time: Date;
  comment: string | null;
  created_by: number;
  status: 'confirmed' | 'canceled';
  canceled_by: number | null;
  canceled_reason: string | null;
  canceled_at: Date | null;
}

/**
 * @route GET /api/bookings
 * @desc Get all bookings
 * @access Public
 */
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT
         id,
         room_id,
         name AS title,
         start_time,
         end_time,
         comment,
         created_by,
         status,
         canceled_by,
         canceled_reason,
         canceled_at
       FROM booking`
    );
    const bookings: Booking[] = rows.map((row: any) => ({
      ...row,
      title: row.title ?? row.name,
      start_time: new Date(row.start_time),
      end_time: new Date(row.end_time),
      comment: row.comment ?? null,
      canceled_at: row.canceled_at ? new Date(row.canceled_at) : null,
    }));
    res.json(bookings);
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
    let query = `SELECT
                   id,
                   room_id,
                   name AS title,
                   start_time,
                   end_time,
                   comment,
                   created_by,
                   status,
                   canceled_by,
                   canceled_reason,
                   canceled_at
                 FROM booking
                 WHERE room_id = ?
                 AND status = 'confirmed'`;
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
    const bookings: Booking[] = rows.map((row: any) => ({
      ...row,
      title: row.title ?? row.name,
      start_time: new Date(row.start_time),
      end_time: new Date(row.end_time),
      comment: row.comment ?? null,
      canceled_at: row.canceled_at ? new Date(row.canceled_at) : null,
    }));
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
export const createBooking = async (req: AuthenticatedRequest, res: Response) => {
  const {
    room_id,
    title,
    name,
    start_time,
    end_time,
    comment,
  } = req.body ?? {};

  const createdBy = req.user?.id;

  if (!createdBy) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const bookingTitle: string =
    typeof title === 'string' && title.trim().length > 0
      ? title.trim()
      : typeof name === 'string' && name.trim().length > 0
        ? name.trim()
        : '';

  if (!room_id || !bookingTitle || !start_time || !end_time) {
    return res.status(400).json({ message: 'Please enter all required fields (room_id, title, start_time, end_time)' });
  }

  const status: 'confirmed' | 'canceled' = 'confirmed';
  const canceled_by = null;
  const canceled_reason = null;
  const canceled_at = null;

  try {
    // Validate room status before proceeding
    const [roomStatusRows] = await pool.query<any[]>(
      'SELECT status FROM room WHERE id = ?',
      [room_id]
    );

    if (!Array.isArray(roomStatusRows) || roomStatusRows.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const roomStatus = (roomStatusRows[0]?.status ?? '').toString().toLowerCase();
    if (roomStatus === 'inactive' || roomStatus === 'maintenance') {
      return res.status(400).json({
        message: 'Für inaktive oder gewartete Räume können keine Buchungen erstellt werden.'
      });
    }

    // CRITICAL: Server-side conflict check to prevent booking overwrites
    // Check for overlapping bookings before inserting
    // A booking overlaps if:
    // 1. It starts before the requested end time AND
    // 2. It ends after the requested start time
    const [existingBookings] = await pool.query<any[]>(
      `SELECT id, room_id, name AS title, start_time, end_time
       FROM booking
       WHERE room_id = ?
       AND start_time < ?
       AND end_time > ?
       AND status = 'confirmed'`,
      [room_id, end_time, start_time]
    );

    // If any overlapping booking exists, reject the request
    if (existingBookings.length > 0) {
      const conflict = existingBookings[0];
      console.log(`Booking conflict detected for room ${room_id}:`, conflict);
      return res.status(409).json({
        message: 'Dieser Zeitraum ist bereits gebucht.',
        conflict: {
          title: conflict.title ?? conflict.name,
          name: conflict.title ?? conflict.name,
          start_time: conflict.start_time,
          end_time: conflict.end_time
        }
      });
    }

    // No conflict - proceed with insertion
    const [result] = await pool.query<any>(
      `INSERT INTO booking (
        room_id,
        name,
        start_time,
        end_time,
        comment,
        created_by,
        status,
        canceled_by,
        canceled_reason,
        canceled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        room_id,
        bookingTitle,
        start_time,
        end_time,
        comment ?? null,
        createdBy,
        status,
        canceled_by ?? null,
        canceled_reason ?? null,
        canceled_at ?? null,
      ]
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
      `SELECT id, room_id, name AS title, start_time, end_time, comment
       FROM booking
       WHERE room_id = ?
       AND start_time < ?
       AND end_time > ?
       AND status = 'confirmed'`,
      [roomId, requestedEnd, requestedStart]
    );

    if (rows.length > 0) {
      const conflict = rows[0];
      console.log(`Conflict found for room ${roomId}:`, conflict);
      // Return the first conflicting booking
      const normalizedTitle = conflict.title ?? conflict.name;
      res.json({
        ...conflict,
        title: normalizedTitle,
        name: normalizedTitle
      });
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
    const [result] = await pool.query<any>('DELETE FROM booking WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
