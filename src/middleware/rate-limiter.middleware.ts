import rateLimit from 'express-rate-limit';

// Standard API limiter for most routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Lenient limiter for high-frequency, low-risk endpoints
export const checkConflictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests for this endpoint, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
