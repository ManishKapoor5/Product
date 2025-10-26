import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

interface JwtPayload {
  userId: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export class AuthMiddleware {
  /**
   * Verify JWT token and attach user to request
   */
  static authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const token = AuthMiddleware.extractToken(req);

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as JwtPayload;

      // Optionally verify user still exists in database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true }
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Attach user info to request
      req.user = {
        userId: user.id,
        email: user.email
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token expired' });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      return res.status(500).json({ error: 'Token verification failed' });
    }
  };

  /**
   * Optional auth - continues even if no valid token
   */
  static optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const token = AuthMiddleware.extractToken(req);

      if (token) {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'your-secret-key'
        ) as JwtPayload;

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true }
        });

        if (user) {
          req.user = {
            userId: user.id,
            email: user.email
          };
        }
      }
      next();
    } catch (error) {
      // Continue without user
      next();
    }
  };

  /**
   * Check if user owns the resource (for broker accounts, trades, etc.)
   */
  static authorizeOwner = (resourceUserIdParam: string = 'userId') => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const resourceUserId = req.params[resourceUserIdParam] || req.body.userId;

      if (req.user.userId !== resourceUserId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    };
  };

  /**
   * Verify user owns a broker account
   */
  static authorizeBrokerAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const brokerAccountId = req.params.brokerAccountId || req.body.brokerAccountId;

      if (!brokerAccountId) {
        return res.status(400).json({ error: 'Broker account ID required' });
      }

      const brokerAccount = await prisma.brokerAccount.findUnique({
        where: { id: brokerAccountId },
        select: { userId: true }
      });

      if (!brokerAccount) {
        return res.status(404).json({ error: 'Broker account not found' });
      }

      if (brokerAccount.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Authorization failed' });
    }
  };

  /**
   * Extract token from Authorization header or query parameter
   */
  private static extractToken(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check query parameter (useful for WebSocket connections)
    if (req.query.token && typeof req.query.token === 'string') {
      return req.query.token;
    }

    return null;
  }

  /**
   * Rate limiting middleware (optional)
   */
  static rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      const identifier = req.user?.userId || req.ip || 'anonymous';;
      const now = Date.now();

      const userRequests = requests.get(identifier);

      if (!userRequests || now > userRequests.resetTime) {
        requests.set(identifier, {
          count: 1,
          resetTime: now + windowMs
        });
        return next();
      }

      if (userRequests.count >= maxRequests) {
        return res.status(429).json({ 
          error: 'Too many requests', 
          retryAfter: Math.ceil((userRequests.resetTime - now) / 1000) 
        });
      }

      userRequests.count++;
      next();
    };
  };
}

// Export individual middleware functions for convenience
export const authenticate = AuthMiddleware.authenticate;
export const optionalAuth = AuthMiddleware.optionalAuth;
export const authorizeOwner = AuthMiddleware.authorizeOwner;
export const authorizeBrokerAccount = AuthMiddleware.authorizeBrokerAccount;
export const rateLimit = AuthMiddleware.rateLimit;

export const authMiddleware = AuthMiddleware.authenticate;