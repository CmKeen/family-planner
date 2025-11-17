import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { register, login, logout } from '../auth.controller';
import prisma from '../../lib/prisma';

// Mock prisma
vi.mock('../../lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }
}));

// Mock auth utils
vi.mock('../../utils/auth.utils', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
  comparePassword: vi.fn().mockResolvedValue(true),
  generateToken: vi.fn().mockReturnValue('test_jwt_token')
}));

// Mock logger
vi.mock('../../config/logger', () => ({
  log: {
    auth: vi.fn()
  }
}));

describe('Authentication Security - Cookie-Based Auth (OBU-79)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let cookieSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;
  let clearCookieSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    jsonSpy = vi.fn();
    cookieSpy = vi.fn();
    statusSpy = vi.fn().mockReturnThis();
    clearCookieSpy = vi.fn();

    mockRes = {
      json: jsonSpy,
      cookie: cookieSpy,
      status: statusSpy,
      clearCookie: clearCookieSpy
    };

    mockNext = vi.fn();

    mockReq = {
      body: {},
      ip: '127.0.0.1'
    };
  });

  describe('Register - Token Not in Response Body', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        firstName: 'Test',
        lastName: 'User'
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        language: 'fr',
        createdAt: new Date()
      });
    });

    it('should set HTTP-only cookie with token', async () => {
      // Call the handler directly - asyncHandler returns middleware function
      const handler = register;
      await handler(mockReq as Request, mockRes as Response, mockNext);

      // Wait for any pending promises
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cookieSpy).toHaveBeenCalledWith('token', 'test_jwt_token', {
        httpOnly: true,
        secure: false, // NODE_ENV is not 'production' in test
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    });

    it('should NOT include token in response body (XSS prevention)', async () => {
      const handler = register;
      await handler(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(jsonSpy).toHaveBeenCalled();
      const responseBody = jsonSpy.mock.calls[0][0];

      // Token should NOT be in response
      expect(responseBody.data.token).toBeUndefined();
      expect(responseBody.token).toBeUndefined();

      // User data should still be present
      expect(responseBody.data.user).toBeDefined();
      expect(responseBody.data.user.id).toBe('user-123');
    });

    it('should set cookie security flags correctly', async () => {
      const handler = register;
      await handler(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cookieSpy).toHaveBeenCalled();
      const cookieOptions = cookieSpy.mock.calls[0][2];

      expect(cookieOptions.httpOnly).toBe(true);
      expect(cookieOptions.sameSite).toBe('lax');
      expect(cookieOptions.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('Login - Token Not in Response Body', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'ValidPass123!'
      };

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        language: 'fr'
      });
    });

    it('should set HTTP-only cookie with token', async () => {
      const handler = login;
      await handler(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cookieSpy).toHaveBeenCalledWith('token', 'test_jwt_token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    });

    it('should NOT include token in response body (XSS prevention)', async () => {
      const handler = login;
      await handler(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(jsonSpy).toHaveBeenCalled();
      const responseBody = jsonSpy.mock.calls[0][0];

      // Token should NOT be in response
      expect(responseBody.data.token).toBeUndefined();
      expect(responseBody.token).toBeUndefined();

      // User data should still be present
      expect(responseBody.data.user).toBeDefined();
      expect(responseBody.data.user.id).toBe('user-123');
      expect(responseBody.data.user.email).toBe('test@example.com');
    });

    it('should not expose sensitive user data in response', async () => {
      const handler = login;
      await handler(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(jsonSpy).toHaveBeenCalled();
      const responseBody = jsonSpy.mock.calls[0][0];

      // Password should never be in response
      expect(responseBody.data.user.password).toBeUndefined();
    });
  });

  describe('Logout - Cookie Clearing', () => {
    it('should clear the token cookie', async () => {
      await logout(mockReq as Request, mockRes as Response);

      expect(clearCookieSpy).toHaveBeenCalledWith('token');
    });

    it('should return success message', async () => {
      await logout(mockReq as Request, mockRes as Response);

      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'Logged out successfully'
      });
    });
  });

  describe('Cookie Security Headers', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'ValidPass123!'
      };

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        language: 'fr'
      });
    });

    it('should set sameSite to lax for CSRF protection', async () => {
      const handler = login;
      await handler(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cookieSpy).toHaveBeenCalled();
      const cookieOptions = cookieSpy.mock.calls[0][2];
      expect(cookieOptions.sameSite).toBe('lax');
    });

    it('should set httpOnly to prevent XSS access', async () => {
      const handler = login;
      await handler(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cookieSpy).toHaveBeenCalled();
      const cookieOptions = cookieSpy.mock.calls[0][2];
      expect(cookieOptions.httpOnly).toBe(true);
    });

    it('should set 7-day expiration', async () => {
      const handler = login;
      await handler(mockReq as Request, mockRes as Response, mockNext);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cookieSpy).toHaveBeenCalled();
      const cookieOptions = cookieSpy.mock.calls[0][2];
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      expect(cookieOptions.maxAge).toBe(sevenDaysInMs);
    });
  });
});
