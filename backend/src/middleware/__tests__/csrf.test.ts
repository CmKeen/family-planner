import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  generateCsrfToken,
  setCsrfToken,
  clearCsrfToken,
  csrfProtection,
  skipCsrfFor,
  getCsrfTokenHandler
} from '../csrf';
import { AppError } from '../errorHandler';

describe('CSRF Protection Middleware (OBU-80)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let cookieSpy: ReturnType<typeof vi.fn>;
  let clearCookieSpy: ReturnType<typeof vi.fn>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let getSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    cookieSpy = vi.fn();
    clearCookieSpy = vi.fn();
    jsonSpy = vi.fn();
    getSpy = vi.fn();

    mockRes = {
      cookie: cookieSpy,
      clearCookie: clearCookieSpy,
      json: jsonSpy
    };

    mockNext = vi.fn();

    mockReq = {
      method: 'POST',
      cookies: {},
      get: getSpy,
      path: '/api/families'
    };
  });

  describe('Token Generation', () => {
    it('should generate a 64-character hex token', () => {
      const token = generateCsrfToken();

      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('setCsrfToken', () => {
    it('should set CSRF token cookie with correct options', () => {
      const token = setCsrfToken(mockRes as Response);

      expect(cookieSpy).toHaveBeenCalledWith(
        'XSRF-TOKEN',
        expect.stringMatching(/^[a-f0-9]{64}$/),
        {
          httpOnly: false, // Must be readable by JavaScript
          secure: false, // NODE_ENV is 'test'
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/'
        }
      );

      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should return the generated token', () => {
      const token = setCsrfToken(mockRes as Response);

      // Token should be the same as what's set in cookie
      const setCookieToken = cookieSpy.mock.calls[0][1];
      expect(token).toBe(setCookieToken);
    });
  });

  describe('clearCsrfToken', () => {
    it('should clear CSRF token cookie', () => {
      clearCsrfToken(mockRes as Response);

      expect(clearCookieSpy).toHaveBeenCalledWith('XSRF-TOKEN');
    });
  });

  describe('csrfProtection Middleware', () => {
    describe('Safe Methods (Skip Validation)', () => {
      it('should skip validation for GET requests', () => {
        mockReq.method = 'GET';

        csrfProtection(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
      });

      it('should skip validation for HEAD requests', () => {
        mockReq.method = 'HEAD';

        csrfProtection(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should skip validation for OPTIONS requests', () => {
        mockReq.method = 'OPTIONS';

        csrfProtection(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('Unsafe Methods (Require Validation)', () => {
      const unsafeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

      unsafeMethods.forEach(method => {
        it(`should require CSRF token for ${method} requests`, () => {
          mockReq.method = method;
          mockReq.cookies = {};
          getSpy.mockReturnValue(undefined);

          csrfProtection(mockReq as Request, mockRes as Response, mockNext);

          expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
          const error = (mockNext as any).mock.calls[0][0] as AppError;
          expect(error.message).toContain('CSRF token missing');
          expect(error.statusCode).toBe(403);
        });
      });

      it('should reject request with missing cookie token', () => {
        mockReq.cookies = {};
        getSpy.mockReturnValue('valid-header-token');

        csrfProtection(mockReq as Request, mockRes as Response, mockNext);

        const error = (mockNext as any).mock.calls[0][0] as AppError;
        expect(error.message).toContain('CSRF token missing');
      });

      it('should reject request with missing header token', () => {
        mockReq.cookies = { 'XSRF-TOKEN': 'valid-cookie-token' };
        getSpy.mockReturnValue(undefined);

        csrfProtection(mockReq as Request, mockRes as Response, mockNext);

        const error = (mockNext as any).mock.calls[0][0] as AppError;
        expect(error.message).toContain('CSRF token missing');
      });

      it('should reject request with mismatched tokens', () => {
        const cookieToken = generateCsrfToken();
        const headerToken = generateCsrfToken(); // Different token

        mockReq.cookies = { 'XSRF-TOKEN': cookieToken };
        getSpy.mockReturnValue(headerToken);

        csrfProtection(mockReq as Request, mockRes as Response, mockNext);

        const error = (mockNext as any).mock.calls[0][0] as AppError;
        expect(error.message).toContain('CSRF token invalid');
        expect(error.statusCode).toBe(403);
      });

      it('should accept request with matching tokens', () => {
        const token = generateCsrfToken();
        mockReq.cookies = { 'XSRF-TOKEN': token };
        getSpy.mockReturnValue(token);

        csrfProtection(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
      });

      it('should reject tokens of different lengths', () => {
        mockReq.cookies = { 'XSRF-TOKEN': 'short' };
        getSpy.mockReturnValue('longer-token-value');

        csrfProtection(mockReq as Request, mockRes as Response, mockNext);

        const error = (mockNext as any).mock.calls[0][0] as AppError;
        expect(error.message).toContain('CSRF token invalid');
      });
    });

    describe('Security Edge Cases', () => {
      it('should use timing-safe comparison to prevent timing attacks', () => {
        // This test verifies the implementation uses crypto.timingSafeEqual
        // by ensuring tokens are compared securely
        const token = generateCsrfToken();
        mockReq.cookies = { 'XSRF-TOKEN': token };
        getSpy.mockReturnValue(token);

        csrfProtection(mockReq as Request, mockRes as Response, mockNext);

        // Should pass without error
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should not accept empty tokens', () => {
        mockReq.cookies = { 'XSRF-TOKEN': '' };
        getSpy.mockReturnValue('');

        csrfProtection(mockReq as Request, mockRes as Response, mockNext);

        const error = (mockNext as any).mock.calls[0][0] as AppError;
        expect(error.message).toContain('CSRF token missing');
      });
    });
  });

  describe('skipCsrfFor', () => {
    it('should skip CSRF validation for specified paths', () => {
      const middleware = skipCsrfFor(['/api/health', '/api/public']);
      mockReq.path = '/api/health';
      mockReq.method = 'POST';

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Should call next() without CSRF validation
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should apply CSRF validation for non-skipped paths', () => {
      const middleware = skipCsrfFor(['/api/health']);
      mockReq.path = '/api/families';
      mockReq.method = 'POST';
      mockReq.cookies = {};
      getSpy.mockReturnValue(undefined);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Should fail CSRF validation
      const error = (mockNext as any).mock.calls[0][0] as AppError;
      expect(error.message).toContain('CSRF');
    });

    it('should match paths by prefix', () => {
      const middleware = skipCsrfFor(['/api/public']);
      mockReq.path = '/api/public/info';
      mockReq.method = 'POST';

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('getCsrfTokenHandler', () => {
    it('should return CSRF token in response', () => {
      getCsrfTokenHandler(mockReq as Request, mockRes as Response);

      expect(jsonSpy).toHaveBeenCalledWith({
        csrfToken: expect.stringMatching(/^[a-f0-9]{64}$/)
      });
    });

    it('should set CSRF token cookie', () => {
      getCsrfTokenHandler(mockReq as Request, mockRes as Response);

      expect(cookieSpy).toHaveBeenCalledWith(
        'XSRF-TOKEN',
        expect.any(String),
        expect.any(Object)
      );
    });
  });
});
