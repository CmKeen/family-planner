import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';

// Type aliases for Prisma enums
type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
type MemberRole = 'ADMIN' | 'PARENT' | 'MEMBER' | 'CHILD';

// Mock Prisma client with proper typing
const mockFamilyMember = {
  findFirst: jest.fn() as any,
  create: jest.fn() as any
};

const mockFamilyInvitation = {
  findFirst: jest.fn() as any,
  findUnique: jest.fn() as any,
  findMany: jest.fn() as any,
  create: jest.fn() as any,
  update: jest.fn() as any
};

const mockUser = {
  findUnique: jest.fn() as any
};

const mockTransaction = jest.fn() as any;

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    familyMember: mockFamilyMember,
    familyInvitation: mockFamilyInvitation,
    user: mockUser,
    $transaction: mockTransaction
  }
}));

import prisma from '../../lib/prisma.js';
import {
  sendInvitation,
  getReceivedInvitations,
  getSentInvitations,
  acceptInvitation,
  declineInvitation,
  cancelInvitation
} from '../invitation.controller.js';
import { AuthRequest } from '../../middleware/auth.js';

// Helper to wait for async operations
const waitForAsync = () => new Promise(resolve => setImmediate(resolve));

describe('Invitation Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      params: {},
      body: {},
      user: {
        id: 'user-1',
        email: 'test@example.com'
      }
    } as any;

    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any
    };

    nextFunction = jest.fn();
  });

  describe('sendInvitation', () => {
    it('should successfully send an invitation when user is admin', async () => {
      mockRequest.params = { id: 'family-1' };
      mockRequest.body = {
        inviteeEmail: 'invitee@example.com',
        role: 'MEMBER'
      };

      const mockMember = { id: 'member-1', role: 'ADMIN' as MemberRole };
      const mockInvitation = {
        id: 'invitation-1',
        familyId: 'family-1',
        inviterUserId: 'user-1',
        inviteeEmail: 'invitee@example.com',
        role: 'MEMBER',
        status: 'PENDING' as InvitationStatus,
        token: 'token-123',
        family: { name: 'Test Family' },
        inviter: { firstName: 'Test', lastName: 'User', email: 'test@example.com' }
      };

      mockFamilyMember.findFirst.mockResolvedValueOnce(mockMember);
      mockFamilyMember.findFirst.mockResolvedValueOnce(null); // No existing member
      mockFamilyInvitation.findFirst.mockResolvedValue(null); // No existing invitation
      mockFamilyInvitation.create.mockResolvedValue(mockInvitation);

      sendInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      // Wait for async operations to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { invitation: mockInvitation }
      });
    });

    it('should throw error when user is not admin or parent', async () => {
      mockRequest.params = { id: 'family-1' };
      mockRequest.body = {
        inviteeEmail: 'invitee@example.com',
        role: 'MEMBER'
      };

      mockFamilyMember.findFirst.mockResolvedValue(null);

      sendInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      await waitForAsync();

      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0] as any;
      expect(error.message).toBe('Only admins and parents can send invitations');
      expect(error.statusCode).toBe(403);
    });

    it('should throw error when invitee is already a member', async () => {
      mockRequest.params = { id: 'family-1' };
      mockRequest.body = {
        inviteeEmail: 'existing@example.com',
        role: 'MEMBER'
      };

      const mockMember = { id: 'member-1', role: 'ADMIN' as MemberRole };
      const mockExistingMember = { id: 'member-2', userId: 'user-2' };

      mockFamilyMember.findFirst
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(mockExistingMember);

      sendInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      await waitForAsync();

      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0] as any;
      expect(error.message).toBe('User is already a member of this family');
      expect(error.statusCode).toBe(400);
    });

    it('should throw error when pending invitation already exists', async () => {
      mockRequest.params = { id: 'family-1' };
      mockRequest.body = {
        inviteeEmail: 'invitee@example.com',
        role: 'MEMBER'
      };

      const mockMember = { id: 'member-1', role: 'ADMIN' as MemberRole };
      const mockExistingInvitation = { id: 'invitation-1', status: 'PENDING' };

      mockFamilyMember.findFirst
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(null);
      mockFamilyInvitation.findFirst.mockResolvedValue(mockExistingInvitation);

      sendInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      await waitForAsync();

      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0] as any;
      expect(error.message).toBe('An invitation has already been sent to this email');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('getReceivedInvitations', () => {
    it('should return pending invitations for the user', async () => {
      const mockInvitations = [
        {
          id: 'invitation-1',
          inviteeEmail: 'test@example.com',
          status: 'PENDING' as InvitationStatus,
          family: {
            id: 'family-1',
            name: 'Test Family',
            language: 'fr',
            _count: { members: 3 }
          },
          inviter: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com'
          }
        }
      ];

      mockFamilyInvitation.findMany.mockResolvedValue(mockInvitations);

      getReceivedInvitations(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      await waitForAsync();

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: { invitations: mockInvitations }
      });
    });
  });

  describe('acceptInvitation', () => {
    it('should successfully accept an invitation', async () => {
      mockRequest.params = { id: 'invitation-1' };

      const mockInvitation = {
        id: 'invitation-1',
        familyId: 'family-1',
        inviteeEmail: 'test@example.com',
        status: 'PENDING' as InvitationStatus,
        role: 'MEMBER' as MemberRole,
        expiresAt: new Date(Date.now() + 86400000), // Expires tomorrow
        family: { name: 'Test Family' }
      };

      const mockUserDetails = { firstName: 'John', lastName: 'Doe' };
      const mockMember = { id: 'member-1', familyId: 'family-1', userId: 'user-1' };
      const mockUpdatedInvitation = { ...mockInvitation, status: 'ACCEPTED' as InvitationStatus };

      mockFamilyInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockFamilyMember.findFirst.mockResolvedValue(null);
      mockUser.findUnique.mockResolvedValue(mockUserDetails);
      mockTransaction.mockResolvedValue({
        member: mockMember,
        invitation: mockUpdatedInvitation
      });

      acceptInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      await waitForAsync();

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'You have joined Test Family',
        data: { member: mockMember, invitation: mockUpdatedInvitation }
      });
    });

    it('should throw error when invitation is not found', async () => {
      mockRequest.params = { id: 'invalid-id' };

      mockFamilyInvitation.findUnique.mockResolvedValue(null);

      acceptInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      await waitForAsync();

      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0] as any;
      expect(error.message).toBe('Invitation not found');
      expect(error.statusCode).toBe(404);
    });

    it('should throw error when invitation is for different email', async () => {
      mockRequest.params = { id: 'invitation-1' };

      const mockInvitation = {
        id: 'invitation-1',
        inviteeEmail: 'other@example.com',
        status: 'PENDING' as InvitationStatus
      };

      mockFamilyInvitation.findUnique.mockResolvedValue(mockInvitation);

      acceptInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      await waitForAsync();

      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0] as any;
      expect(error.message).toBe('This invitation is not for you');
      expect(error.statusCode).toBe(403);
    });

    it('should throw error when invitation has expired', async () => {
      mockRequest.params = { id: 'invitation-1' };

      const mockInvitation = {
        id: 'invitation-1',
        inviteeEmail: 'test@example.com',
        status: 'PENDING' as InvitationStatus,
        expiresAt: new Date(Date.now() - 86400000) // Expired yesterday
      };

      mockFamilyInvitation.findUnique.mockResolvedValue(mockInvitation);

      acceptInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      await waitForAsync();

      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0] as any;
      expect(error.message).toBe('Invitation has expired');
      expect(error.statusCode).toBe(400);
    });

    it('should throw error when user is already a member', async () => {
      mockRequest.params = { id: 'invitation-1' };

      const mockInvitation = {
        id: 'invitation-1',
        familyId: 'family-1',
        inviteeEmail: 'test@example.com',
        status: 'PENDING' as InvitationStatus,
        expiresAt: new Date(Date.now() + 86400000)
      };

      const mockExistingMember = { id: 'member-1' };

      mockFamilyInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockFamilyMember.findFirst.mockResolvedValue(mockExistingMember);

      acceptInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      await waitForAsync();

      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0] as any;
      expect(error.message).toBe('You are already a member of this family');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('declineInvitation', () => {
    it('should successfully decline an invitation', async () => {
      mockRequest.params = { id: 'invitation-1' };

      const mockInvitation = {
        id: 'invitation-1',
        inviteeEmail: 'test@example.com',
        status: 'PENDING' as InvitationStatus
      };

      const mockUpdatedInvitation = { ...mockInvitation, status: 'DECLINED' as InvitationStatus };

      mockFamilyInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockFamilyInvitation.update.mockResolvedValue(mockUpdatedInvitation);

      declineInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      await waitForAsync();

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Invitation declined',
        data: { invitation: mockUpdatedInvitation }
      });
    });
  });

  describe('cancelInvitation', () => {
    it('should successfully cancel an invitation when user is admin', async () => {
      mockRequest.params = { familyId: 'family-1', invitationId: 'invitation-1' };

      const mockMember = { id: 'member-1', role: 'ADMIN' as MemberRole };
      const mockInvitation = {
        id: 'invitation-1',
        familyId: 'family-1',
        status: 'PENDING' as InvitationStatus
      };

      mockFamilyMember.findFirst.mockResolvedValue(mockMember);
      mockFamilyInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockFamilyInvitation.update.mockResolvedValue({
        ...mockInvitation,
        status: 'CANCELLED' as InvitationStatus
      });

      cancelInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      await waitForAsync();

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Invitation cancelled successfully'
      });
    });

    it('should throw error when user is not admin or parent', async () => {
      mockRequest.params = { familyId: 'family-1', invitationId: 'invitation-1' };

      mockFamilyMember.findFirst.mockResolvedValue(null);

      cancelInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      await waitForAsync();

      expect(nextFunction).toHaveBeenCalled();
      const error = nextFunction.mock.calls[0][0] as any;
      expect(error.message).toBe('Only admins and parents can cancel invitations');
      expect(error.statusCode).toBe(403);
    });
  });
});
