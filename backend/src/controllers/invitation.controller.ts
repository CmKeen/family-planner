import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import prisma from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';

const sendInvitationSchema = z.object({
  inviteeEmail: z.string().email(),
  role: z.enum(['ADMIN', 'PARENT', 'MEMBER', 'CHILD']).optional()
});

/**
 * Send an invitation to join a family
 * POST /api/families/:id/invitations
 */
export const sendInvitation = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id: familyId } = req.params;
    const data = sendInvitationSchema.parse(req.body);
    const userId = req.user!.id;

    // Check if user is admin or parent in the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId,
        role: {
          in: ['ADMIN', 'PARENT']
        }
      }
    });

    if (!member) {
      throw new AppError('Only admins and parents can send invitations', 403);
    }

    // Check if invitee is already a member
    const existingMember = await prisma.familyMember.findFirst({
      where: {
        familyId,
        user: {
          email: data.inviteeEmail
        }
      }
    });

    if (existingMember) {
      throw new AppError('User is already a member of this family', 400);
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.familyInvitation.findFirst({
      where: {
        familyId,
        inviteeEmail: data.inviteeEmail,
        status: 'PENDING'
      }
    });

    if (existingInvitation) {
      throw new AppError('An invitation has already been sent to this email', 400);
    }

    // Create invitation with 7-day expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.familyInvitation.create({
      data: {
        familyId,
        inviterUserId: userId,
        inviteeEmail: data.inviteeEmail,
        role: data.role || 'MEMBER',
        token: randomBytes(32).toString('hex'),
        expiresAt
      },
      include: {
        family: {
          select: {
            name: true
          }
        },
        inviter: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // TODO: Send email notification to invitee
    // This would integrate with an email service like SendGrid, AWS SES, etc.

    res.status(201).json({
      status: 'success',
      data: { invitation }
    });
  }
);

/**
 * Get invitations received by the current user
 * GET /api/families/invitations/received
 */
export const getReceivedInvitations = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userEmail = req.user!.email;

    const invitations = await prisma.familyInvitation.findMany({
      where: {
        inviteeEmail: userEmail,
        status: 'PENDING',
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            language: true,
            _count: {
              select: {
                members: true
              }
            }
          }
        },
        inviter: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      status: 'success',
      data: { invitations }
    });
  }
);

/**
 * Get invitations sent by the family
 * GET /api/families/:id/invitations/sent
 */
export const getSentInvitations = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id: familyId } = req.params;
    const userId = req.user!.id;

    // Check if user is admin in the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId,
        role: {
          in: ['ADMIN', 'PARENT']
        }
      }
    });

    if (!member) {
      throw new AppError('Not authorized to view invitations', 403);
    }

    const invitations = await prisma.familyInvitation.findMany({
      where: {
        familyId,
        status: {
          in: ['PENDING', 'ACCEPTED', 'DECLINED']
        }
      },
      include: {
        inviter: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      status: 'success',
      data: { invitations }
    });
  }
);

/**
 * Accept an invitation
 * POST /api/families/invitations/:id/accept
 */
export const acceptInvitation = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id: invitationId } = req.params;
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    const invitation = await prisma.familyInvitation.findUnique({
      where: { id: invitationId },
      include: {
        family: true
      }
    });

    if (!invitation) {
      throw new AppError('Invitation not found', 404);
    }

    if (invitation.inviteeEmail !== userEmail) {
      throw new AppError('This invitation is not for you', 403);
    }

    if (invitation.status !== 'PENDING') {
      throw new AppError(`Invitation has already been ${invitation.status.toLowerCase()}`, 400);
    }

    if (invitation.expiresAt < new Date()) {
      throw new AppError('Invitation has expired', 400);
    }

    // Check if user is already a member
    const existingMember = await prisma.familyMember.findFirst({
      where: {
        familyId: invitation.familyId,
        userId
      }
    });

    if (existingMember) {
      throw new AppError('You are already a member of this family', 400);
    }

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Create family member and update invitation status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.familyMember.create({
        data: {
          familyId: invitation.familyId,
          userId,
          name: `${user.firstName} ${user.lastName}`,
          role: invitation.role
        }
      });

      const updatedInvitation = await tx.familyInvitation.update({
        where: { id: invitationId },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date()
        }
      });

      return { member, invitation: updatedInvitation };
    });

    res.json({
      status: 'success',
      message: `You have joined ${invitation.family.name}`,
      data: result
    });
  }
);

/**
 * Decline an invitation
 * POST /api/families/invitations/:id/decline
 */
export const declineInvitation = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id: invitationId } = req.params;
    const userEmail = req.user!.email;

    const invitation = await prisma.familyInvitation.findUnique({
      where: { id: invitationId }
    });

    if (!invitation) {
      throw new AppError('Invitation not found', 404);
    }

    if (invitation.inviteeEmail !== userEmail) {
      throw new AppError('This invitation is not for you', 403);
    }

    if (invitation.status !== 'PENDING') {
      throw new AppError(`Invitation has already been ${invitation.status.toLowerCase()}`, 400);
    }

    const updatedInvitation = await prisma.familyInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'DECLINED'
      }
    });

    res.json({
      status: 'success',
      message: 'Invitation declined',
      data: { invitation: updatedInvitation }
    });
  }
);

/**
 * Cancel an invitation (admin only)
 * DELETE /api/families/:familyId/invitations/:invitationId
 */
export const cancelInvitation = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { familyId, invitationId } = req.params;
    const userId = req.user!.id;

    // Check if user is admin or parent in the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId,
        role: {
          in: ['ADMIN', 'PARENT']
        }
      }
    });

    if (!member) {
      throw new AppError('Only admins and parents can cancel invitations', 403);
    }

    const invitation = await prisma.familyInvitation.findUnique({
      where: { id: invitationId }
    });

    if (!invitation) {
      throw new AppError('Invitation not found', 404);
    }

    if (invitation.familyId !== familyId) {
      throw new AppError('Invitation does not belong to this family', 400);
    }

    if (invitation.status !== 'PENDING') {
      throw new AppError('Can only cancel pending invitations', 400);
    }

    await prisma.familyInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'CANCELLED'
      }
    });

    res.json({
      status: 'success',
      message: 'Invitation cancelled successfully'
    });
  }
);
