import { Request, Response } from 'express';
import pool from '../models/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ActivityLogService } from '../services/activity-log.service';
import {
  cachedRoomsData,
  cacheTimestamp,
  CACHE_TTL_MS,
  invalidateRoomsCache,
  updateRoomsCache
} from '../services/cache.service';

// Interface for Room data
type RoomStatus = 'active' | 'maintenance' | 'inactive' | 'night_rest';

interface Room {
  id: number;
  name: string;
  capacity: number;
  status: RoomStatus;
  location?: string | null;
  amenities?: string[] | null;
  icon?: string | null;
  nextAvailableTime?: Date | null;
  remainingTimeMinutes?: number | null;
  totalBookingsToday?: number;
  totalBookedMinutesToday?: number;
  allBookingsToday?: Booking[];
}

interface Booking {
  id: number;
  room_id: number;
  title: string;
  start_time: Date;
  end_time: Date;
  comment: string | null;
}

const normalizeRoomStatus = (status?: string | null): RoomStatus => {
  const normalized = status?.toLowerCase();
  switch (normalized) {
    case 'active':
    case 'available':
      return 'active';
    case 'maintenance':
      return 'maintenance';
    case 'inactive':
    case 'occupied':
      return 'inactive';
    default:
      return 'active';
  }
};

/**
 * Converts a Date object to timezone-naive YYYY-MM-DD HH:mm:ss string format.
 * This ensures "What You See Is What You Get" - the exact string stored in the database
 * is what the frontend receives, with no timezone conversions.
 */
const formatToNaiveString = (date: Date | null | undefined): string => {
  if (!date) return '';
  return date.getFullYear() + '-' +
         String(date.getMonth() + 1).padStart(2, '0') + '-' +
         String(date.getDate()).padStart(2, '0') + ' ' +
         String(date.getHours()).padStart(2, '0') + ':' +
         String(date.getMinutes()).padStart(2, '0') + ':' +
         String(date.getSeconds()).padStart(2, '0');
};

/**
 * @route GET /api/rooms
 * @desc Get all rooms
 * @access Public (with optional authentication for privacy)
 */
export const getAllRooms = async (req: AuthenticatedRequest, res: Response) => {
  const now = Date.now();
  if (cachedRoomsData && (now - cacheTimestamp) < CACHE_TTL_MS) {
    console.log(`[CACHE HIT] Returning cached rooms data. Age: ${Math.round((now - cacheTimestamp) / 1000)}s`);
    return res.json(cachedRoomsData);
  }
  console.log('[CACHE MISS] Fetching fresh rooms data from database...');
  try {
    const [roomRows] = await pool.query<any[]>('SELECT id, name, capacity, status, location, JSON_UNQUOTE(amenities) AS amenities, icon FROM room');
    const rooms: Room[] = roomRows.map((row: any) => ({
      ...row,
      status: normalizeRoomStatus(row.status),
      amenities: row.amenities ? JSON.parse(row.amenities) : null,
    }));

    const now = new Date();

    // Format dates for MySQL (YYYY-MM-DD HH:MM:SS)
    const formatMySQLDateTime = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Fetch all bookings that overlap with today
    const [bookingRows] = await pool.query<any[]>(
      `SELECT id, room_id, name AS title, start_time, end_time, comment
       FROM booking
       WHERE (DATE(start_time) = CURDATE() OR DATE(end_time) = CURDATE())
       AND status = 'confirmed'
       ORDER BY start_time ASC`
    );

    // PRIVACY: Check if user is authenticated
    const isGuest = !req.user;

    let allBookings: Booking[];

    if (isGuest) {
      // Guest user - anonymize booking details
      allBookings = bookingRows.map((row: any) => ({
        id: row.id,
        room_id: row.room_id,
        title: 'Belegt',
        start_time: new Date(row.start_time),
        end_time: new Date(row.end_time),
        comment: null,
      }));
    } else {
      // Authenticated user - return full details
      allBookings = bookingRows.map((row: any) => ({
        ...row,
        title: row.title ?? row.name,
        start_time: new Date(row.start_time),
        end_time: new Date(row.end_time),
        comment: row.comment ?? null,
      }));
    }

    // BUSINESS HOURS LOGIC
    // Define business hours: 08:00 to 20:00
    const currentHour = now.getHours();
    const isOutsideBusinessHours = currentHour < 8 || currentHour >= 20;

    const roomsWithBookingInfo = rooms.map(room => {
      const roomBookings = allBookings.filter(booking => booking.room_id === room.id);

      let currentBooking: Booking | undefined = undefined;
      let nextBooking: Booking | undefined = undefined;

      // Find current booking (ongoing right now)
      currentBooking = roomBookings.find(booking => {
        const isCurrentlyBooked = booking.start_time <= now && booking.end_time > now;
        return isCurrentlyBooked;
      });

      // Find next booking for today
      const futureBookingsToday = roomBookings
        .filter(booking => {
          const isFuture = booking.start_time > now;
          return isFuture;
        })
        .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());

      if (futureBookingsToday.length > 0) {
        nextBooking = futureBookingsToday[0];
      }

      // Calculate total bookings and booked minutes for today
      const totalBookingsToday = roomBookings.length;
      const totalBookedMinutesToday = roomBookings.reduce((total, booking) => {
        // Calculate the duration of each booking in minutes
        const durationMs = booking.end_time.getTime() - booking.start_time.getTime();
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        return total + durationMinutes;
      }, 0);

      // Sort all room bookings by start time for frontend block detection
      const sortedRoomBookings = roomBookings.sort((a, b) =>
        a.start_time.getTime() - b.start_time.getTime()
      );

      // APPLY BUSINESS HOURS OVERRIDE
      let finalStatus = room.status;
      if (isOutsideBusinessHours) {
        // Override status to 'night_rest' if outside business hours
        finalStatus = 'night_rest';
      }

      return {
        ...room,
        status: finalStatus,
        currentBooking: currentBooking || null,
        nextBooking: nextBooking || null,
        totalBookingsToday,
        totalBookedMinutesToday,
        allBookingsToday: sortedRoomBookings,
      };
    });

    // CRITICAL: Convert all Date objects to timezone-naive strings before sending to frontend
    // This ensures "What You See Is What You Get" - no timezone conversions
    const finalRoomsWithBookingInfo = roomsWithBookingInfo.map(room => ({
      ...room,
      currentBooking: room.currentBooking
        ? {
            ...room.currentBooking,
            start_time: formatToNaiveString(room.currentBooking.start_time) as any,
            end_time: formatToNaiveString(room.currentBooking.end_time) as any
          }
        : null,
      nextBooking: room.nextBooking
        ? {
            ...room.nextBooking,
            start_time: formatToNaiveString(room.nextBooking.start_time) as any,
            end_time: formatToNaiveString(room.nextBooking.end_time) as any
          }
        : null,
      allBookingsToday: room.allBookingsToday?.map(booking => ({
        ...booking,
        start_time: formatToNaiveString(booking.start_time) as any,
        end_time: formatToNaiveString(booking.end_time) as any
      })) || []
    }));

    updateRoomsCache(finalRoomsWithBookingInfo);

    res.json(finalRoomsWithBookingInfo);
  } catch (error) {
    console.error('Error fetching rooms with booking info:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @route GET /api/rooms/:id
 * @desc Get a single room by ID
 * @access Public
 */
export const getRoomById = async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`Attempting to get room with ID: ${id}`);
  try {
    const [rows] = await pool.query<any[]>(
      'SELECT id, name, capacity, status, location, JSON_UNQUOTE(amenities) AS amenities, icon FROM room WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      console.warn(`Room with ID: ${id} not found.`);
      return res.status(404).json({ message: 'Room not found' });
    }

    const room: Room = {
      ...rows[0],
      status: normalizeRoomStatus(rows[0].status),
      amenities: rows[0].amenities ? JSON.parse(rows[0].amenities) : null,
    };

    console.log(`Successfully fetched room with ID: ${id}`);
    res.json(room);
  } catch (error) {
    console.error(`Error fetching room with ID: ${id}:`, error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @route POST /api/rooms
 * @desc Create a new room
 * @access Private (requires admin)
 */
export const createRoom = async (req: AuthenticatedRequest, res: Response) => {
  const { name, capacity, status, location, amenities, icon } = req.body;
  console.log('Attempting to create room with data:', { name, capacity, status, location, amenities, icon });
  console.log('Type of amenities before stringify (createRoom):', typeof amenities, amenities);
  if (!name || !capacity) {
    console.warn('Missing required fields for room creation.');
    return res.status(400).json({ message: 'Please enter all required fields (name, capacity)' });
  }

  const normalizedStatus = normalizeRoomStatus(status);

  try {
    const amenitiesJson = amenities ? JSON.stringify(amenities) : null;
    console.log('Amenities after stringify (createRoom):', amenitiesJson);
    const [result] = await pool.query<any>(
      'INSERT INTO room (name, capacity, status, location, amenities, icon) VALUES (?, ?, ?, ?, CAST(? AS JSON), ?)',
      [name, capacity, normalizedStatus, location, amenitiesJson, icon]
    );
    console.log('Room created successfully with ID:', result.insertId);

    // Log the activity
    await ActivityLogService.logActivity(
      req.user?.id ?? null,
      'CREATE',
      'ROOM',
      result.insertId,
      {
        name,
        capacity,
        status: normalizedStatus,
        location: location ?? null,
        amenities: amenities ?? null,
        icon: icon ?? null
      }
    );

    invalidateRoomsCache();
    res.status(201).json({ message: 'Room created successfully', roomId: result.insertId });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @route PUT /api/rooms/:id
 * @desc Update a room by ID
 * @access Private (requires admin)
 */
export const updateRoom = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, capacity, status, location, amenities, icon } = req.body ?? {};
  console.log('Attempting to update room ID:', id, 'with data:', { name, capacity, status, location, amenities, icon });

  if (!id) {
    return res.status(400).json({ message: 'Room ID is required' });
  }

  // Fetch old room data for logging
  const [oldRoomRows] = await pool.query<any[]>(
    'SELECT name, capacity, status, location, amenities, icon FROM room WHERE id = ?',
    [Number(id)]
  );

  if (oldRoomRows.length === 0) {
    return res.status(404).json({ message: 'Room not found' });
  }

  const oldRoomData = oldRoomRows[0];

  const fieldsToUpdate: string[] = [];
  const values: any[] = [];

  if (name !== undefined) {
    const trimmedName = typeof name === 'string' ? name.trim() : name;
    fieldsToUpdate.push('name = ?');
    values.push(trimmedName);
  }

  if (capacity !== undefined) {
    const numericCapacity = Number(capacity);
    if (!Number.isFinite(numericCapacity) || numericCapacity < 1) {
      return res.status(400).json({ message: 'Capacity must be a positive number' });
    }
    fieldsToUpdate.push('capacity = ?');
    values.push(numericCapacity);
  }

  if (status !== undefined) {
    const normalizedStatus = normalizeRoomStatus(status);
    fieldsToUpdate.push('status = ?');
    values.push(normalizedStatus);
  }

  if (location !== undefined) {
    const sanitizedLocation = typeof location === 'string' ? location.trim() : null;
    fieldsToUpdate.push('location = ?');
    values.push(sanitizedLocation || null);
  }

  if (amenities !== undefined) {
    let amenitiesJson: string | null = null;
    if (Array.isArray(amenities)) {
      amenitiesJson = JSON.stringify(amenities);
    } else if (typeof amenities === 'string') {
      try {
        const parsed = JSON.parse(amenities);
        if (Array.isArray(parsed)) {
          amenitiesJson = JSON.stringify(parsed);
        }
      } catch (error) {
        console.warn('Failed to parse amenities JSON string, storing null', error);
      }
    }
    fieldsToUpdate.push('amenities = ?');
    values.push(amenitiesJson);
  }

  if (icon !== undefined) {
    const sanitizedIcon = typeof icon === 'string' && icon.trim().length > 0 ? icon.trim() : null;
    fieldsToUpdate.push('icon = ?');
    values.push(sanitizedIcon);
  }

  if (fieldsToUpdate.length === 0) {
    return res.status(400).json({ message: 'No fields provided for update' });
  }

  values.push(Number(id));

  try {
    const [result] = await pool.query<any>(
      `UPDATE room SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      console.warn('Room not found for update with ID:', id);
      return res.status(404).json({ message: 'Room not found' });
    }

    const [rows] = await pool.query<any[]>(
      'SELECT id, name, capacity, status, location, amenities, icon FROM room WHERE id = ?',
      [Number(id)]
    );

    const updatedRoom = rows[0] ?? null;

    if (updatedRoom && updatedRoom.amenities) {
      try {
        updatedRoom.amenities = JSON.parse(updatedRoom.amenities);
      } catch (error) {
        console.warn('Failed to parse stored amenities JSON for room', updatedRoom.amenities);
      }
    }

    console.log('Room updated successfully for ID:', id);

    // Log the activity with old and new values
    const logDetails: any = {};
    if (name !== undefined) logDetails.old_name = oldRoomData.name, logDetails.new_name = name;
    if (capacity !== undefined) logDetails.old_capacity = oldRoomData.capacity, logDetails.new_capacity = capacity;
    if (status !== undefined) logDetails.old_status = oldRoomData.status, logDetails.new_status = normalizeRoomStatus(status);
    if (location !== undefined) logDetails.old_location = oldRoomData.location, logDetails.new_location = location;
    if (amenities !== undefined) logDetails.old_amenities = oldRoomData.amenities, logDetails.new_amenities = amenities;
    if (icon !== undefined) logDetails.old_icon = oldRoomData.icon, logDetails.new_icon = icon;

    await ActivityLogService.logActivity(
      req.user?.id ?? null,
      'UPDATE',
      'ROOM',
      Number(id),
      logDetails
    );

    invalidateRoomsCache();
    res.json({ message: 'Room updated successfully', room: updatedRoom });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @route DELETE /api/rooms/:id
 * @desc Delete a room by ID
 * @access Private (requires admin)
 */
export const deleteRoom = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  console.log('Attempting to delete room ID:', id);
  try {
    // Fetch room data before deleting for logging
    const [roomRows] = await pool.query<any[]>(
      'SELECT name, capacity, status, location, amenities, icon FROM room WHERE id = ?',
      [id]
    );

    if (roomRows.length === 0) {
      console.warn('Room not found for deletion with ID:', id);
      return res.status(404).json({ message: 'Room not found' });
    }

    const roomData = roomRows[0];

    const [result] = await pool.query<any>('DELETE FROM room WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      console.warn('Room not found for deletion with ID:', id);
      return res.status(404).json({ message: 'Room not found' });
    }
    console.log('Room deleted successfully for ID:', id);

    // Log the activity with details about the deleted room
    await ActivityLogService.logActivity(
      req.user?.id ?? null,
      'DELETE',
      'ROOM',
      Number(id),
      {
        name: roomData.name,
        capacity: roomData.capacity,
        status: roomData.status,
        location: roomData.location,
        amenities: roomData.amenities,
        icon: roomData.icon
      }
    );

    invalidateRoomsCache();
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * PHASE 3: Smart Failure Recovery
 * @route GET /api/rooms/available
 * @desc Get all rooms available for a specific time slot
 * @access Public
 * @query date - Date in YYYY-MM-DD format
 * @query startTime - Start time in HH:mm format
 * @query endTime - End time in HH:mm format
 */
export const getAvailableRooms = async (req: Request, res: Response) => {
  const { date, startTime, endTime } = req.query;

  console.log('[AvailableRooms] Searching for available rooms:', { date, startTime, endTime });

  // Validation
  if (!date || !startTime || !endTime) {
    return res.status(400).json({ message: 'Missing required parameters: date, startTime, endTime' });
  }

  try {
    // Combine date and time to create full datetime strings
    const requestedStart = `${date} ${startTime}:00`;
    const requestedEnd = `${date} ${endTime}:00`;

    console.log('[AvailableRooms] Searching for rooms available between:', requestedStart, 'and', requestedEnd);

    // Get all rooms
    const [roomRows] = await pool.query<any[]>(
      'SELECT id, name, capacity, status, location, JSON_UNQUOTE(amenities) AS amenities, icon FROM room'
    );

    // Get all bookings that overlap with the requested time slot
    const [conflictingBookings] = await pool.query<any[]>(
      `SELECT room_id FROM booking
       WHERE (start_time < ? AND end_time > ?)
       AND status = 'confirmed'`,
      [requestedEnd, requestedStart]
    );

    console.log('[AvailableRooms] Found', conflictingBookings.length, 'conflicting bookings');

    // Extract room IDs that are occupied during the requested time
    const occupiedRoomIds = new Set(conflictingBookings.map((booking: any) => booking.room_id));

    // Filter out occupied rooms
    const availableRooms: Room[] = roomRows
      .filter((row: any) => !occupiedRoomIds.has(row.id))
      .map((row: any) => ({
        ...row,
        status: normalizeRoomStatus(row.status),
        amenities: row.amenities ? JSON.parse(row.amenities) : null,
      }))
      .filter(room => room.status === 'active');

    console.log('[AvailableRooms] Found', availableRooms.length, 'available rooms');

    res.json(availableRooms);
  } catch (error) {
    console.error('[AvailableRooms] Error searching for available rooms:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
