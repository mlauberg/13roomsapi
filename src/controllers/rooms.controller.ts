import { Request, Response } from 'express';
import pool from '../models/db';

// Interface for Room data
interface Room {
  id: number;
  name: string;
  capacity: number;
  status: string;
}

/**
 * @route GET /api/rooms
 * @desc Get all rooms
 * @access Public
 */
export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<Room[]>('SELECT * FROM rooms');
    res.json(rows);
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
  const { name, capacity, status } = req.body;
  if (!name || !capacity || !status) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }
  try {
    const [result] = await pool.query<any>(
      'INSERT INTO rooms (name, capacity, status) VALUES (?, ?, ?)',
      [name, capacity, status]
    );
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
  const { name, capacity, status } = req.body;
  if (!name || !capacity || !status) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }
  try {
    const [result] = await pool.query<any>(
      'UPDATE rooms SET name = ?, capacity = ?, status = ? WHERE id = ?',
      [name, capacity, status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }
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
  try {
    const [result] = await pool.query<any>('DELETE FROM rooms WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
