// Mock logger
jest.mock('../../config/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    auth: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock prisma
const mockPrismaUser = {
  findUnique: jest.fn()
};

jest.mock('../../config/admin', () => ({
  prisma: {
    user: mockPrismaUser
  }
}));

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: mockPrismaUser
  }
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

import { adminAuthProvider } from '../adminAuth';
import bcrypt from 'bcryptjs';

const prisma = {
  user: mockPrismaUser
};

describe('AdminJS Authentication Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

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
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

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

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

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

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await adminAuthProvider.authenticate('user@example.com', 'correct-password');

      expect(result).toBeNull();
    });

    it('should return null if database query fails', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

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

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Comparison error'));

      const result = await adminAuthProvider.authenticate('admin@example.com', 'password');

      expect(result).toBeNull();
    });
  });
});
