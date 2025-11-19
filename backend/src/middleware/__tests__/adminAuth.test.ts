import { vi } from 'vitest';
// Mock logger
vi.mock('../../config/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    auth: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock prisma - use factory function to avoid hoisting issues
vi.mock('../../config/admin', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: vi.fn()
    }
  }
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn()
  },
  compare: vi.fn()
}));

import { adminAuthProvider } from '../adminAuth';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/admin';

describe('AdminJS Authentication Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should return user object for valid admin credentials', async () => {
      const mockUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        password: 'hashed-password',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true
      };

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await adminAuthProvider.authenticate('admin@example.com', 'correct-password');

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        isAdmin: true
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', 'hashed-password');
    });

    it('should return null for non-existent user', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await adminAuthProvider.authenticate('nonexistent@example.com', 'password');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null for invalid password', async () => {
      const mockUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        password: 'hashed-password',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true
      };

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await adminAuthProvider.authenticate('admin@example.com', 'wrong-password');

      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith('wrong-password', 'hashed-password');
    });

    it('should return null for non-admin user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        password: 'hashed-password',
        firstName: 'Regular',
        lastName: 'User',
        isAdmin: false
      };

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await adminAuthProvider.authenticate('user@example.com', 'correct-password');

      expect(result).toBeNull();
    });

    it('should return null if database query fails', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Database error'));

      const result = await adminAuthProvider.authenticate('admin@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null if password comparison fails', async () => {
      const mockUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        password: 'hashed-password',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true
      };

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Comparison error'));

      const result = await adminAuthProvider.authenticate('admin@example.com', 'password');

      expect(result).toBeNull();
    });
  });
});
