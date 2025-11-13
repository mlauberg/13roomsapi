import pool from '../models/db';
import { getCurrentTimezoneNaiveTimestamp } from '../utils/date-utils';

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
      const timestamp = getCurrentTimezoneNaiveTimestamp();

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
