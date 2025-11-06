import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/admin';
import { AppError } from './errorHandler';

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
    try {
      console.log('[AdminAuth] Attempting authentication for:', email);

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        console.log('[AdminAuth] User not found');
        return null;
      }

      console.log('[AdminAuth] User found, isAdmin:', user.isAdmin);

      // Check if user is an admin
      if (!user.isAdmin) {
        console.log('[AdminAuth] User is not an admin');
        return null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('[AdminAuth] Password valid:', isPasswordValid);

      if (!isPasswordValid) {
        return null;
      }

      console.log('[AdminAuth] Authentication successful');

      // Return user object without password
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin
      };
    } catch (error) {
      console.error('[AdminAuth] Error during authentication:', error);
      return null;
    }
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
