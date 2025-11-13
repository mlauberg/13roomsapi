import pool from '../models/db';

export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
export type EntityType = 'BOOKING' | 'ROOM' | 'USER';

interface ActivityLogDetails {
  [key: string]: any;
}

/**
 * Centralized Activity Log Service
 * Provides a single method to log all significant actions in the system
 */
export class ActivityLogService {
  /**
   * Generates a timezone-naive timestamp string in 'YYYY-MM-DD HH:mm:ss' format.
   * This is the ONLY approved method for creating timestamps for the activity log.
   * Uses the server's local time without any UTC conversion to ensure "What You See Is What You Get".
   */
  private static generateTimezoneNaiveTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Log an activity to the activity_log table
   *
   * @param userId - ID of the user performing the action (null for system/guest actions)
   * @param actionType - Type of action: CREATE, UPDATE, DELETE, LOGIN, LOGOUT
   * @param entityType - Type of entity affected: BOOKING, ROOM, USER
   * @param entityId - ID of the affected entity
   * @param details - Additional context (stored as JSON)
   */
  static async logActivity(
    userId: number | null,
    actionType: ActionType,
    entityType: EntityType,
    entityId: number | null,
    details: ActivityLogDetails = {}
  ): Promise<void> {
    try {
      const timestamp = this.generateTimezoneNaiveTimestamp();

      await pool.query(
        `INSERT INTO activity_log (user_id, action_type, entity_type, entity_id, details, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, actionType, entityType, entityId, JSON.stringify(details), timestamp]
      );
      console.log(`[ActivityLog] ${actionType} ${entityType} (ID: ${entityId}) by user ${userId ?? 'GUEST'} at ${timestamp}`);
    } catch (error) {
      // Log the error but don't throw - we don't want activity logging to break the main operation
      console.error('[ActivityLog] Failed to log activity:', error);
    }
  }
}
