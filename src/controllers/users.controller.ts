import { Response } from 'express';
import pool from '../models/db';
import { hashPassword } from '../utils/password';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ActivityLogService } from '../services/activity-log.service';

const sanitizeEmail = (email: string): string => email.trim().toLowerCase();

const normalizeRole = (role?: string): 'user' | 'admin' => {
  if (role && role.toLowerCase() === 'admin') {
    return 'admin';
  }
  return 'user';
};

/**
 * GET /api/users
 * Get all users (admin only)
 */
export const getAllUsers = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT id, email, firstname, surname, role, is_active, created_at, updated_at
       FROM \`user\`
       ORDER BY created_at DESC`
    );

    res.json({
      message: 'Users retrieved successfully.',
      users: rows
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ message: 'Unable to fetch users at this time.' });
  }
};

/**
 * GET /api/users/:id
 * Get single user by ID (admin only)
 */
export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query<any[]>(
      `SELECT id, email, firstname, surname, role, is_active, created_at, updated_at
       FROM \`user\`
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      message: 'User retrieved successfully.',
      user: rows[0]
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    res.status(500).json({ message: 'Unable to fetch user at this time.' });
  }
};

/**
 * POST /api/users
 * Create a new user (admin only)
 */
export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  const { email, firstname, surname, password, role, is_active } = req.body ?? {};

  if (!email || !firstname || !surname || !password) {
    return res.status(400).json({
      message: 'Please provide email, firstname, surname, and password.'
    });
  }

  try {
    const normalizedEmail = sanitizeEmail(email);
    const normalizedRole = normalizeRole(role);
    const passwordHash = hashPassword(password);
    const activeStatus = typeof is_active === 'boolean' ? is_active : true;

    // Check if email already exists
    const [existingRows] = await pool.query<any[]>(
      'SELECT id FROM `user` WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (existingRows.length > 0) {
      return res.status(409).json({
        message: 'An account with this email already exists.'
      });
    }

    // Create user
    const [result] = await pool.query<any>(
      `INSERT INTO \`user\` (email, firstname, surname, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [normalizedEmail, firstname.trim(), surname.trim(), passwordHash, normalizedRole, activeStatus]
    );

    const userId = result.insertId;

    // Log the activity
    await ActivityLogService.logActivity(
      req.user?.id ?? null,
      'CREATE',
      'USER',
      userId,
      {
        email: normalizedEmail,
        firstname: firstname.trim(),
        surname: surname.trim(),
        role: normalizedRole,
        is_active: activeStatus
      }
    );

    res.status(201).json({
      message: 'User successfully created.',
      user: {
        id: userId,
        email: normalizedEmail,
        firstname: firstname.trim(),
        surname: surname.trim(),
        role: normalizedRole,
        is_active: activeStatus
      }
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    res.status(500).json({ message: 'Unable to create user at this time.' });
  }
};

/**
 * PUT /api/users/:id
 * Update user details (admin only)
 */
export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { email, firstname, surname, password, role, is_active } = req.body ?? {};

  if (!email && !firstname && !surname && !password && role === undefined && is_active === undefined) {
    return res.status(400).json({
      message: 'Please provide at least one field to update.'
    });
  }

  try {
    // Check if user exists and fetch old data for logging
    const [existingRows] = await pool.query<any[]>(
      'SELECT id, email, firstname, surname, role, is_active FROM `user` WHERE id = ? LIMIT 1',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const oldUserData = existingRows[0];

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (email) {
      const normalizedEmail = sanitizeEmail(email);

      // Check if new email already exists for a different user
      const [emailCheck] = await pool.query<any[]>(
        'SELECT id FROM `user` WHERE email = ? AND id != ? LIMIT 1',
        [normalizedEmail, id]
      );

      if (emailCheck.length > 0) {
        return res.status(409).json({
          message: 'An account with this email already exists.'
        });
      }

      updates.push('email = ?');
      values.push(normalizedEmail);
    }

    if (firstname) {
      updates.push('firstname = ?');
      values.push(firstname.trim());
    }

    if (surname) {
      updates.push('surname = ?');
      values.push(surname.trim());
    }

    if (password) {
      updates.push('password_hash = ?');
      values.push(hashPassword(password));
    }

    if (role) {
      updates.push('role = ?');
      values.push(normalizeRole(role));
    }

    if (typeof is_active === 'boolean') {
      updates.push('is_active = ?');
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    values.push(id);

    await pool.query(
      `UPDATE \`user\` SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Fetch updated user
    const [updatedRows] = await pool.query<any[]>(
      `SELECT id, email, firstname, surname, role, is_active, created_at, updated_at
       FROM \`user\`
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    // Log the activity with old and new values
    const logDetails: any = {};
    if (email) logDetails.old_email = oldUserData.email, logDetails.new_email = sanitizeEmail(email);
    if (firstname) logDetails.old_firstname = oldUserData.firstname, logDetails.new_firstname = firstname.trim();
    if (surname) logDetails.old_surname = oldUserData.surname, logDetails.new_surname = surname.trim();
    if (password) logDetails.password_changed = true;
    if (role) logDetails.old_role = oldUserData.role, logDetails.new_role = normalizeRole(role);
    if (typeof is_active === 'boolean') logDetails.old_is_active = oldUserData.is_active, logDetails.new_is_active = is_active;

    await ActivityLogService.logActivity(
      req.user?.id ?? null,
      'UPDATE',
      'USER',
      parseInt(id, 10),
      logDetails
    );

    res.json({
      message: 'User successfully updated.',
      user: updatedRows[0]
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    res.status(500).json({ message: 'Unable to update user at this time.' });
  }
};

/**
 * DELETE /api/users/:id
 * Delete a user (admin only)
 */
export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Prevent admin from deleting themselves
    if (req.user && req.user.id === parseInt(id, 10)) {
      return res.status(403).json({
        message: 'You cannot delete your own account.'
      });
    }

    // Check if user exists and fetch data for logging
    const [existingRows] = await pool.query<any[]>(
      'SELECT id, email, firstname, surname, role, is_active FROM `user` WHERE id = ? LIMIT 1',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const userData = existingRows[0];

    // Delete user (CASCADE will handle related bookings)
    await pool.query('DELETE FROM `user` WHERE id = ?', [id]);

    // Log the activity with details about the deleted user
    await ActivityLogService.logActivity(
      req.user?.id ?? null,
      'DELETE',
      'USER',
      parseInt(id, 10),
      {
        email: userData.email,
        firstname: userData.firstname,
        surname: userData.surname,
        role: userData.role,
        is_active: userData.is_active
      }
    );

    res.json({
      message: 'User successfully deleted.',
      deletedUser: {
        id: parseInt(id, 10),
        email: userData.email
      }
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ message: 'Unable to delete user at this time.' });
  }
};
