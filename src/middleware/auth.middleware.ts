import { NextFunction, Request, Response } from 'express';
import { verifyToken, TokenPayload } from '../utils/token';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or malformed' });
  }

  const token = authHeader.slice('Bearer '.length);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.user = payload;
  next();
};

/**
 * Optional authentication middleware
 * Allows requests to proceed whether authenticated or not
 * If a valid token is found, attaches user to req.user
 * If no token or invalid token, req.user remains undefined
 */
export const authenticateOptional = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  // No auth header - proceed as guest
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = undefined;
    return next();
  }

  const token = authHeader.slice('Bearer '.length);
  const payload = verifyToken(token);

  // Invalid/expired token - proceed as guest
  if (!payload) {
    req.user = undefined;
    return next();
  }

  // Valid token - attach user and proceed as authenticated
  req.user = payload;
  next();
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin privileges required' });
  }

  next();
};
