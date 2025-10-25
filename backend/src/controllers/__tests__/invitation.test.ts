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

      await sendInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

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

      await expect(
        sendInvitation(
          mockRequest as AuthRequest,
          mockResponse as Response,
          nextFunction
        )
      ).rejects.toThrow('Only admins and parents can send invitations');
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

      await expect(
        sendInvitation(
          mockRequest as AuthRequest,
          mockResponse as Response,
          nextFunction
        )
      ).rejects.toThrow('User is already a member of this family');
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

      await expect(
        sendInvitation(
          mockRequest as AuthRequest,
          mockResponse as Response,
          nextFunction
        )
      ).rejects.toThrow('An invitation has already been sent to this email');
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

      await getReceivedInvitations(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

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

      const mockMember = { id: 'member-1', familyId: 'family-1', userId: 'user-1' };
      const mockUpdatedInvitation = { ...mockInvitation, status: 'ACCEPTED' as InvitationStatus };

      mockFamilyInvitation.findUnique.mockResolvedValue(mockInvitation);
      mockFamilyMember.findFirst.mockResolvedValue(null);
      mockTransaction.mockResolvedValue({
        member: mockMember,
        invitation: mockUpdatedInvitation
      });

      await acceptInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'You have joined Test Family',
        data: { member: mockMember, invitation: mockUpdatedInvitation }
      });
    });

    it('should throw error when invitation is not found', async () => {
      mockRequest.params = { id: 'invalid-id' };

      mockFamilyInvitation.findUnique.mockResolvedValue(null);

      await expect(
        acceptInvitation(
          mockRequest as AuthRequest,
          mockResponse as Response,
          nextFunction
        )
      ).rejects.toThrow('Invitation not found');
    });

    it('should throw error when invitation is for different email', async () => {
      mockRequest.params = { id: 'invitation-1' };

      const mockInvitation = {
        id: 'invitation-1',
        inviteeEmail: 'other@example.com',
        status: 'PENDING' as InvitationStatus
      };

      mockFamilyInvitation.findUnique.mockResolvedValue(mockInvitation);

      await expect(
        acceptInvitation(
          mockRequest as AuthRequest,
          mockResponse as Response,
          nextFunction
        )
      ).rejects.toThrow('This invitation is not for you');
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

      await expect(
        acceptInvitation(
          mockRequest as AuthRequest,
          mockResponse as Response,
          nextFunction
        )
      ).rejects.toThrow('Invitation has expired');
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

      await expect(
        acceptInvitation(
          mockRequest as AuthRequest,
          mockResponse as Response,
          nextFunction
        )
      ).rejects.toThrow('You are already a member of this family');
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

      await declineInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

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

      await cancelInvitation(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Invitation cancelled successfully'
      });
    });

    it('should throw error when user is not admin or parent', async () => {
      mockRequest.params = { familyId: 'family-1', invitationId: 'invitation-1' };

      mockFamilyMember.findFirst.mockResolvedValue(null);

      await expect(
        cancelInvitation(
          mockRequest as AuthRequest,
          mockResponse as Response,
          nextFunction
        )
      ).rejects.toThrow('Only admins and parents can cancel invitations');
    });
  });
});
