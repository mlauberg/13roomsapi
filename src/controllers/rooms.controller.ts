import { Request, Response } from 'express';
import pool from '../models/db';

// Interface for Room data
interface Room {
  id: number;
  name: string;
  capacity: number;
  status: string;
  location?: string | null;
  amenities?: string[] | null;
  icon?: string | null;
}

/**
 * @route GET /api/rooms
 * @desc Get all rooms
 * @access Public
 */
export const getAllRooms = async (req: Request, res: Response) => {
  console.log('Attempting to get all rooms...');
  try {
    const [rows] = await pool.query<any[]>('SELECT id, name, capacity, status, location, JSON_UNQUOTE(amenities) AS amenities, icon FROM rooms');
    const rooms: Room[] = rows.map((row: any) => ({
      ...row,
      amenities: row.amenities ? JSON.parse(row.amenities) : null,
    }));
    console.log('Successfully fetched rooms:', rooms.length, 'rooms found.');
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @route POST /api/rooms
 * @desc Create a new room
 * @access Public
 */
export const createRoom = async (req: Request, res: Response) => {
  const { name, capacity, status, location, amenities, icon } = req.body;
  console.log('Attempting to create room with data:', { name, capacity, status, location, amenities, icon });
  console.log('Type of amenities before stringify (createRoom):', typeof amenities, amenities);
  if (!name || !capacity || !status) {
    console.warn('Missing required fields for room creation.');
    return res.status(400).json({ message: 'Please enter all required fields (name, capacity, status)' });
  }
  try {
    const amenitiesJson = amenities ? JSON.stringify(amenities) : null;
    console.log('Amenities after stringify (createRoom):', amenitiesJson);
    const [result] = await pool.query<any>(
      'INSERT INTO rooms (name, capacity, status, location, amenities, icon) VALUES (?, ?, ?, ?, CAST(? AS JSON), ?)',
      [name, capacity, status, location, amenitiesJson, icon]
    );
    console.log('Room created successfully with ID:', result.insertId);
    res.status(201).json({ message: 'Room created successfully', roomId: result.insertId });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @route PUT /api/rooms/:id
 * @desc Update a room by ID
 * @access Public
 */
export const updateRoom = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, capacity, status, location, amenities, icon } = req.body;
  console.log('Attempting to update room ID:', id, 'with data:', { name, capacity, status, location, amenities, icon });
  console.log('Type of amenities before stringify (updateRoom):', typeof amenities, amenities);

  const fieldsToUpdate: string[] = [];
  const values: any[] = [];

  if (name !== undefined) { fieldsToUpdate.push('name = ?'); values.push(name); }
  if (capacity !== undefined) { fieldsToUpdate.push('capacity = ?'); values.push(capacity); }
  if (status !== undefined) { fieldsToUpdate.push('status = ?'); values.push(status); }
  if (location !== undefined) { fieldsToUpdate.push('location = ?'); values.push(location); }
  if (amenities !== undefined) { fieldsToUpdate.push('amenities = CAST(? AS JSON)'); values.push(JSON.stringify(amenities)); }
  if (icon !== undefined) { fieldsToUpdate.push('icon = ?'); values.push(icon); }

  if (fieldsToUpdate.length === 0) {
    return res.status(400).json({ message: 'No fields provided for update' });
  }

  values.push(id);

  try {
    const [result] = await pool.query<any>(
      `UPDATE rooms SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      console.warn('Room not found for update with ID:', id);
      return res.status(404).json({ message: 'Room not found' });
    }
    console.log('Room updated successfully for ID:', id);
    res.json({ message: 'Room updated successfully' });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @route DELETE /api/rooms/:id
 * @desc Delete a room by ID
 * @access Public
 */
export const deleteRoom = async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log('Attempting to delete room ID:', id);
  try {
    const [result] = await pool.query<any>('DELETE FROM rooms WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      console.warn('Room not found for deletion with ID:', id);
      return res.status(404).json({ message: 'Room not found' });
    }
    console.log('Room deleted successfully for ID:', id);
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
