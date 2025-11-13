import { Response } from 'express';
import pool from '../models/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * @route GET /api/logs
 * @desc Get activity logs with pagination
 * @access Private (requires admin)
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 50, max: 100)
 */
export const getActivityLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;


    // Fetch logs with user details (LEFT JOIN to handle null user_id)
    const [logs] = await pool.query<any[]>(
      `SELECT
         activity_log.id,
         activity_log.user_id,
         activity_log.action_type,
         activity_log.entity_type,
         activity_log.entity_id,
         activity_log.details,
         activity_log.timestamp,
         user.firstname,
         user.surname,
         user.email
       FROM activity_log
       LEFT JOIN \`user\` ON \`user\`.id = activity_log.user_id
       ORDER BY activity_log.timestamp DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Get total count for pagination
    const [countResult] = await pool.query<any[]>(
      'SELECT COUNT(*) as total FROM activity_log'
    );

    const total = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);


    // Process logs: MySQL already parses JSON columns, so no need to call JSON.parse()
    const processedLogs = logs.map(log => ({
      ...log,
      details: log.details ?? null,
      user: log.user_id ? {
        id: log.user_id,
        firstname: log.firstname,
        surname: log.surname,
        email: log.email
      } : null
    }));

    res.json({
      logs: processedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('[ActivityLogs] Error fetching activity logs:', error);
    res.status(500).json({ message: 'Unable to fetch activity logs at this time.' });
  }
};
