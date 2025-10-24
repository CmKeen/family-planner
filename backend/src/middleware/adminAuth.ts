import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/admin.js';
import { AppError } from './errorHandler.js';

export interface AdminAuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    isAdmin: boolean;
  };
}

/**
 * Middleware to authenticate and verify admin access
 */
export const authenticateAdmin = async (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
    };

    // Fetch user from database to check admin status
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, isAdmin: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.isAdmin) {
      throw new AppError('Admin access required', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

/**
 * AdminJS authentication provider
 * This is used by AdminJS to authenticate users accessing the admin panel
 */
export const adminAuthProvider = {
  authenticate: async (email: string, password: string) => {
    // This is handled by our JWT system, so we return null
    // Users must be authenticated via the API and then access the admin panel
    return null;
  },

  /**
   * Check if the current session is authenticated
   */
  isAuthenticated: async (req: AdminAuthRequest) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;

      if (!token) {
        return false;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        email: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, isAdmin: true },
      });

      return user?.isAdmin || false;
    } catch (error) {
      return false;
    }
  },
};
