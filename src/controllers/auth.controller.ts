import { Request, Response } from 'express';
import pool from '../models/db';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateToken } from '../utils/token';
import { ActivityLogService } from '../services/activity-log.service';

const sanitizeEmail = (email: string): string => email.trim().toLowerCase();

const normalizeRole = (role?: string): 'user' | 'admin' => {
  if (role && role.toLowerCase() === 'admin') {
    return 'admin';
  }
  return 'user';
};

export const register = async (req: Request, res: Response) => {
  const { email, firstname, surname, password, role } = req.body ?? {};

  if (!email || !firstname || !surname || !password) {
    return res.status(400).json({ message: 'Please provide email, firstname, surname, and password.' });
  }

  try {
    const normalizedEmail = sanitizeEmail(email);
    const normalizedRole = normalizeRole(role);
    const passwordHash = hashPassword(password);

    const [existingRows] = await pool.query<any[]>(
      'SELECT id FROM `user` WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const [result] = await pool.query<any>(
      `INSERT INTO \`user\` (email, firstname, surname, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [normalizedEmail, firstname.trim(), surname.trim(), passwordHash, normalizedRole]
    );

    const userId = result.insertId;
    const token = generateToken({ id: userId, email: normalizedEmail, role: normalizedRole });

    // Log the activity (user registers themselves)
    await ActivityLogService.logActivity(
      userId,
      'CREATE',
      'USER',
      userId,
      {
        email: normalizedEmail,
        firstname: firstname.trim(),
        surname: surname.trim(),
        role: normalizedRole,
        self_registration: true
      }
    );

    res.status(201).json({
      message: 'Account successfully created.',
      token,
      user: {
        id: userId,
        email: normalizedEmail,
        firstname: firstname.trim(),
        surname: surname.trim(),
        role: normalizedRole
      }
    });
  } catch (error) {
    console.error('Registration failed:', error);
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Unable to register at this time.' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide both email and password.' });
  }

  try {
    const normalizedEmail = sanitizeEmail(email);
    const [rows] = await pool.query<any[]>(
      'SELECT id, email, firstname, surname, password_hash, role, is_active FROM `user` WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is disabled. Please contact support.' });
    }

    const isValidPassword = verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    // Log the login activity
    await ActivityLogService.logActivity(
      user.id,
      'LOGIN',
      'USER',
      user.id,
      {
        email: user.email,
        role: user.role
      }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        surname: user.surname,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ message: 'Unable to login at this time.' });
  }
};
