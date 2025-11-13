import rateLimit from 'express-rate-limit';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * MULTI-TIERED RATE-LIMITING ARCHITECTURE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This file implements a granular, context-aware rate-limiting strategy that
 * distinguishes between read-heavy and write-heavy operations to prevent
 * "friendly fire" where the application's own heartbeat mechanism blocks
 * legitimate user actions.
 */

/**
 * READ LIMITER - For high-frequency, low-risk GET requests
 *
 * Used for: GET /api/rooms, GET /api/bookings, etc.
 * Purpose: Prevent abuse while allowing the frontend heartbeat to function
 *
 * Configuration: 200 requests per 1 minute window
 * - Accommodates frontend heartbeat (every 60 seconds)
 * - Allows multiple concurrent users refreshing dashboards
 * - Still provides protection against DoS attacks
 */
export const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // Allow a high burst of read requests
  message: 'Too many read requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * WRITE LIMITER - For data-modifying operations
 *
 * Used for: POST, PUT, DELETE on all resources
 * Purpose: Strict protection for operations that modify database state
 *
 * Configuration: 100 requests per 15 minutes
 * - Prevents rapid-fire creation/deletion attacks
 * - Protects database integrity
 * - Reasonable limit for normal user behavior
 */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many write requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * CONFLICT CHECK LIMITER - For booking conflict validation
 *
 * Used for: GET /api/bookings/check-conflict/:roomId
 * Purpose: Ultra-lenient for real-time form validation as user types
 *
 * Configuration: 100 requests per 1 minute
 * - Allows real-time validation without blocking UX
 * - User typing in form triggers multiple checks
 * - Low risk: read-only operation
 */
export const checkConflictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many conflict check requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});
