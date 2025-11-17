import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.utils';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { log } from '../config/logger';
import { passwordSchema, emailSchema } from '../utils/validation';
import { setCsrfToken, clearCsrfToken } from '../middleware/csrf';

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  language: z.enum(['fr', 'en', 'nl']).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export const register = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { email, password, firstName, lastName, language } = registerSchema.parse(req.body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      log.auth('Registration failed - user already exists', {
        email,
        ip: req.ip,
      });
      throw new AppError('User already exists', 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        language: language || 'fr'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        language: true,
        createdAt: true
      }
    });

    log.auth('New user registered successfully', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
    });

    // Generate token
    const token = generateToken({ id: user.id, email: user.email });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Set CSRF token for double-submit cookie pattern (OBU-80)
    setCsrfToken(res);

    // Do NOT include token in response body to prevent XSS attacks (OBU-79)
    res.status(201).json({
      status: 'success',
      data: {
        user
      }
    });
  }
);

export const login = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      log.auth('Login failed - user not found', {
        email,
        ip: req.ip,
      });
      throw new AppError('Invalid credentials', 401);
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      log.auth('Login failed - invalid password', {
        userId: user.id,
        email,
        ip: req.ip,
      });
      throw new AppError('Invalid credentials', 401);
    }

    log.auth('User logged in successfully', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
    });

    // Generate token
    const token = generateToken({ id: user.id, email: user.email });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Set CSRF token for double-submit cookie pattern (OBU-80)
    setCsrfToken(res);

    // Do NOT include token in response body to prevent XSS attacks (OBU-79)
    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          language: user.language
        }
      }
    });
  }
);

export const logout = asyncHandler(
  async (req: Request, res: Response) => {
    res.clearCookie('token');
    // Clear CSRF token on logout (OBU-80)
    clearCsrfToken(res);
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  }
);

export const getMe = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        language: true,
        units: true,
        createdAt: true,
        families: {
          include: {
            family: {
              include: {
                dietProfile: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      status: 'success',
      data: { user }
    });
  }
);
