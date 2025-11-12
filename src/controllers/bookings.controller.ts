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
  creator_firstname: string | null;
  creator_surname: string | null;
  creator_email: string | null;
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
         booking.id,
         booking.room_id,
         booking.name AS title,
         booking.start_time,
         booking.end_time,
         booking.comment,
         booking.created_by,
         creator.firstname AS creator_firstname,
         creator.surname AS creator_surname,
         creator.email AS creator_email,
         room.name AS room_name,
         booking.status,
         booking.canceled_by,
         booking.canceled_reason,
         booking.canceled_at
       FROM booking
       LEFT JOIN \`user\` AS creator ON creator.id = booking.created_by
       LEFT JOIN room ON room.id = booking.room_id
       ORDER BY booking.start_time DESC`
    );
    const bookings: Booking[] = rows.map((row: any) => ({
      ...row,
      title: row.title ?? row.name,
      start_time: row.start_time,
      end_time: row.end_time,
      comment: row.comment ?? null,
      canceled_at: row.canceled_at || null,
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
                   booking.id,
                   booking.room_id,
                   booking.name AS title,
                   booking.start_time,
                   booking.end_time,
                   booking.comment,
                   booking.created_by,
                   creator.firstname AS creator_firstname,
                   creator.surname AS creator_surname,
                   creator.email AS creator_email,
                   booking.status,
                   booking.canceled_by,
                   booking.canceled_reason,
                   booking.canceled_at
                 FROM booking
                 LEFT JOIN \`user\` AS creator ON creator.id = booking.created_by
                 WHERE booking.room_id = ?
                 AND booking.status = 'confirmed'`;
    const params: any[] = [roomId];

    // If date is provided, filter bookings for that specific date
    if (date) {
      const dateStr = date as string;
      const startOfDay = `${dateStr} 00:00:00`;
      const endOfDay = `${dateStr} 23:59:59`;
      query += ' AND booking.start_time >= ? AND booking.start_time <= ?';
      params.push(startOfDay, endOfDay);
      console.log(`Fetching bookings for room ${roomId} on ${dateStr}`);
    } else {
      console.log(`Fetching all bookings for room ${roomId}`);
    }

    query += ' ORDER BY booking.start_time ASC';

    const [rows] = await pool.query<any[]>(query, params);
    const bookings: Booking[] = rows.map((row: any) => ({
      ...row,
      title: row.title ?? row.name,
      start_time: row.start_time,
      end_time: row.end_time,
      comment: row.comment ?? null,
      canceled_at: row.canceled_at || null,
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
 * @desc Create a new booking (supports both authenticated users and guests)
 * @access Public (with optional authentication)
 */
export const createBooking = async (req: AuthenticatedRequest, res: Response) => {
  const {
    room_id,
    title,
    name,
    guestName,
    start_time,
    end_time,
    date,
    startTime,
    endTime,
    comment,
  } = req.body ?? {};

  // Optional authentication - can be null for guest bookings
  const createdBy = req.user?.id ?? null;

  // Determine the booking title based on authentication status
  // For authenticated users: use 'title' field
  // For guests: use 'guestName' field (fallback to 'name' or 'title' for backwards compatibility)
  const bookingTitle: string =
    createdBy !== null
      ? // Authenticated user - prefer 'title'
        (typeof title === 'string' && title.trim().length > 0
          ? title.trim()
          : typeof name === 'string' && name.trim().length > 0
            ? name.trim()
            : '')
      : // Guest user - prefer 'guestName', fallback to 'name' or 'title'
        (typeof guestName === 'string' && guestName.trim().length > 0
          ? guestName.trim()
          : typeof title === 'string' && title.trim().length > 0
            ? title.trim()
            : typeof name === 'string' && name.trim().length > 0
              ? name.trim()
              : '');

  // --- CRITICAL FIX: Support both combined (start_time/end_time) and separate (date/startTime/endTime) formats ---
  // This ensures backwards compatibility while fixing timezone issues
  let start_time_string: string;
  let end_time_string: string;

  if (date && startTime && endTime) {
    // NEW FORMAT: Separate date and time fields - combine them directly as strings
    // This prevents any timezone conversion by avoiding Date object creation
    start_time_string = `${date} ${startTime}:00`;
    end_time_string = `${date} ${endTime}:00`;
  } else if (start_time && end_time) {
    // OLD FORMAT: Combined datetime strings - use them directly
    start_time_string = start_time;
    end_time_string = end_time;
  } else {
    return res.status(400).json({ message: 'Please enter all required fields (room_id, title/guestName, start_time, end_time) or (room_id, title/guestName, date, startTime, endTime)' });
  }

  if (!room_id || !bookingTitle) {
    return res.status(400).json({ message: 'Please enter all required fields (room_id, title/guestName, start_time, end_time)' });
  }

  if (bookingTitle.length < 2) {
    return res.status(400).json({ message: 'Der Titel muss mindestens 2 Zeichen lang sein.' });
  }

  // Validation: Create Date objects ONLY for validation, not for database insertion
  const startDate = new Date(start_time_string);
  const endDate = new Date(end_time_string);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return res.status(400).json({ message: 'Ungültiges Start- oder Enddatum.' });
  }

  if (endDate.getTime() <= startDate.getTime()) {
    return res.status(400).json({ message: 'Die Endzeit muss nach der Startzeit liegen.' });
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
      [room_id, end_time_string, start_time_string]
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

    // No conflict - proceed with insertion using literal time strings
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
        start_time_string,
        end_time_string,
        comment ?? null,
        createdBy,
        status,
        canceled_by ?? null,
        canceled_reason ?? null,
        canceled_at ?? null,
      ]
    );

    console.log(`Booking created successfully for room ${room_id}: ${start_time_string} - ${end_time_string}`);
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
 * @route GET /api/bookings/my-bookings
 * @desc Get all bookings created by the currently authenticated user
 * @access Private (requires authentication)
 */
export const getMyBookings = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT
         booking.id,
         booking.room_id,
         booking.name AS title,
         booking.start_time,
         booking.end_time,
         booking.comment,
         booking.created_by,
         booking.status,
         room.name AS room_name,
         room.icon AS room_icon
       FROM booking
       INNER JOIN room ON room.id = booking.room_id
       WHERE booking.created_by = ?
       AND booking.status = 'confirmed'
       ORDER BY booking.start_time ASC`,
      [user.id]
    );

    const bookings = rows.map((row: any) => ({
      id: row.id,
      room_id: row.room_id,
      room_name: row.room_name,
      room_icon: row.room_icon,
      title: row.title,
      start_time: row.start_time,
      end_time: row.end_time,
      comment: row.comment ?? null,
      created_by: row.created_by,
      status: row.status
    }));

    console.log(`Found ${bookings.length} bookings for user ${user.id}`);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @route PUT /api/bookings/:id
 * @desc Update a booking (supports full reschedule with time updates and conflict checking)
 * @access Private (requires authentication and ownership)
 */
export const updateBooking = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  const { title, comment, room_id, start_time, end_time, date, startTime, endTime } = req.body;

  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    return res.status(400).json({ message: 'Der Titel muss mindestens 2 Zeichen lang sein.' });
  }

  try {
    // Check if booking exists and verify ownership
    const [rows] = await pool.query<any[]>(
      `SELECT created_by, room_id, start_time, end_time FROM booking WHERE id = ?`,
      [id]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = rows[0];
    const ownerId = booking?.created_by;
    const isOwner = ownerId === user.id;
    const isAdmin = user.role === 'admin';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'You may only update your own bookings.' });
    }

    // --- CRITICAL FIX: Support both combined and separate time formats for rescheduling ---
    let start_time_string: string | undefined;
    let end_time_string: string | undefined;

    if (date && startTime && endTime) {
      // NEW FORMAT: Separate date and time fields
      start_time_string = `${date} ${startTime}:00`;
      end_time_string = `${date} ${endTime}:00`;
    } else if (start_time && end_time) {
      // OLD FORMAT: Combined datetime strings
      start_time_string = start_time;
      end_time_string = end_time;
    }

    // Determine if this is a full reschedule (time/room update) or just a title/comment update
    const isReschedule = start_time_string && end_time_string;

    if (isReschedule) {
      // FULL RESCHEDULE: Validate times and check for conflicts
      // TypeScript type narrowing: At this point, both variables are guaranteed to be strings
      // Using non-null assertions since we've verified they exist with the isReschedule check
      const startTimeStr: string = start_time_string!;
      const endTimeStr: string = end_time_string!;

      console.log(`[Reschedule] Booking ${id}: Updating times from ${booking.start_time} - ${booking.end_time} to ${startTimeStr} - ${endTimeStr}`);

      const startDate = new Date(startTimeStr);
      const endDate = new Date(endTimeStr);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Ungültiges Start- oder Enddatum.' });
      }

      if (endDate.getTime() <= startDate.getTime()) {
        return res.status(400).json({ message: 'Die Endzeit muss nach der Startzeit liegen.' });
      }

      const targetRoomId = room_id ?? booking.room_id;

      // CRITICAL: Server-side conflict check (excluding the current booking)
      // Check for overlapping bookings before updating
      const [existingBookings] = await pool.query<any[]>(
        `SELECT id, room_id, name AS title, start_time, end_time
         FROM booking
         WHERE room_id = ?
         AND id != ?
         AND start_time < ?
         AND end_time > ?
         AND status = 'confirmed'`,
        [targetRoomId, id, endTimeStr, startTimeStr]
      );

      // If any overlapping booking exists, reject the request
      if (existingBookings.length > 0) {
        const conflict = existingBookings[0];
        console.log(`[Reschedule] Conflict detected for booking ${id} in room ${targetRoomId}:`, conflict);
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

      // No conflict - proceed with full update using literal time strings
      const [result] = await pool.query<any>(
        `UPDATE booking SET room_id = ?, name = ?, start_time = ?, end_time = ?, comment = ? WHERE id = ?`,
        [targetRoomId, title.trim(), startTimeStr, endTimeStr, comment ?? null, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      console.log(`[Reschedule] Booking ${id} rescheduled successfully by user ${user.id}`);
      res.json({ message: 'Booking rescheduled successfully' });
    } else {
      // SIMPLE UPDATE: Only update title and comment (legacy behavior)
      console.log(`[Update] Booking ${id}: Updating title/comment only`);

      const [result] = await pool.query<any>(
        `UPDATE booking SET name = ?, comment = ? WHERE id = ?`,
        [title.trim(), comment ?? null, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      console.log(`[Update] Booking ${id} updated successfully by user ${user.id}`);
      res.json({ message: 'Booking updated successfully' });
    }
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @route DELETE /api/bookings/:id
 * @desc Delete a booking by ID
 * @access Private (requires authentication and ownership or admin role)
 */
export const deleteBooking = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT created_by FROM booking WHERE id = ?`,
      [id]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const ownerId = rows[0]?.created_by;
    const isOwner = ownerId === user.id;
    const isAdmin = user.role === 'admin';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'You may only delete your own bookings.' });
    }

    const [result] = await pool.query<any>(
      `DELETE FROM booking WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
