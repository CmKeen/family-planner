import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { updateMemberSchema } from '../validators/family.validators';

const createFamilySchema = z.object({
  name: z.string().min(1),
  language: z.enum(['fr', 'en', 'nl']).optional(),
  units: z.enum(['metric', 'imperial']).optional(),
  dietProfile: z.object({
    kosher: z.boolean().optional(),
    kosherType: z.string().optional(),
    meatToMilkDelayHours: z.number().optional(),
    shabbatMode: z.boolean().optional(),
    halal: z.boolean().optional(),
    halalType: z.string().optional(),
    vegetarian: z.boolean().optional(),
    vegan: z.boolean().optional(),
    pescatarian: z.boolean().optional(),
    glutenFree: z.boolean().optional(),
    lactoseFree: z.boolean().optional(),
    allergies: z.array(z.string()).optional(),
    favoriteRatio: z.number().min(0).max(1).optional(),
    maxNovelties: z.number().optional(),
    diversityEnabled: z.boolean().optional()
  }).optional()
});

export const createFamily = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const data = createFamilySchema.parse(req.body);
    const userId = req.user!.id;

    const createData: any = {
      name: data.name,
      language: data.language || 'fr',
      units: data.units || 'metric',
      creator: {
        connect: { id: userId }
      },
      dietProfile: {
        create: data.dietProfile || {}
      },
      members: {
        create: {
          userId,
          name: `${req.user!.email}`,
          role: 'ADMIN'
        }
      }
    };

    const family = await prisma.family.create({
      data: createData,
      include: {
        dietProfile: true,
        members: true
      }
    });

    res.status(201).json({
      status: 'success',
      data: { family }
    });
  }
);

export const getFamilies = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const families = await prisma.family.findMany({
      where: {
        members: {
          some: {
            userId
          }
        }
      },
      include: {
        dietProfile: true,
        members: true,
        _count: {
          select: {
            recipes: true,
            weeklyPlans: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { families }
    });
  }
);

export const getFamily = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const family = await prisma.family.findFirst({
      where: {
        id,
        members: {
          some: {
            userId
          }
        }
      },
      include: {
        dietProfile: true,
        members: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!family) {
      throw new AppError('Family not found', 404);
    }

    res.json({
      status: 'success',
      data: { family }
    });
  }
);

export const updateFamily = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, language, units } = req.body;
    const userId = req.user!.id;

    // Check if user is admin
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: id,
        userId,
        role: 'ADMIN'
      }
    });

    if (!member) {
      throw new AppError('Not authorized', 403);
    }

    const family = await prisma.family.update({
      where: { id },
      data: { name, language, units },
      include: {
        dietProfile: true,
        members: true
      }
    });

    res.json({
      status: 'success',
      data: { family }
    });
  }
);

export const deleteFamily = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if user is admin
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: id,
        userId,
        role: 'ADMIN'
      }
    });

    if (!member) {
      throw new AppError('Not authorized', 403);
    }

    await prisma.family.delete({ where: { id } });

    res.json({
      status: 'success',
      message: 'Family deleted successfully'
    });
  }
);

export const addMember = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, email, role, age, portionFactor, aversions, favorites } = req.body;

    // Authorization check: Only ADMIN/PARENT can add members
    // req.member is populated by ensureFamilyMember middleware
    if (req.member!.role !== 'ADMIN' && req.member!.role !== 'PARENT') {
      throw new AppError('Only admins and parents can add members', 403);
    }

    // Additional check: Only ADMIN can create other ADMIN members
    if (role === 'ADMIN' && req.member!.role !== 'ADMIN') {
      throw new AppError('Only admins can create admin members', 403);
    }

    // If email is provided, try to link to existing user
    let userId: string | undefined;
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (user) {
        userId = user.id;

        // Check if user is already a member
        const existingMember = await prisma.familyMember.findFirst({
          where: {
            familyId: id,
            userId: user.id
          }
        });

        if (existingMember) {
          throw new AppError('This user is already a member of the family', 400);
        }
      }
    }

    const member = await prisma.familyMember.create({
      data: {
        familyId: id,
        userId,
        name,
        role: role || 'MEMBER',
        age,
        portionFactor: portionFactor || 1.0,
        aversions: aversions || [],
        favorites: favorites || []
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: { member }
    });
  }
);

export const updateMember = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { memberId } = req.params;

    // Validate and sanitize input - only allowed fields will be processed
    const validatedData = updateMemberSchema.parse(req.body);

    // Get target member
    const targetMember = await prisma.familyMember.findUnique({
      where: { id: memberId }
    });

    if (!targetMember) {
      throw new AppError('Member not found', 404);
    }

    // Authorization rules
    const isUpdatingSelf = req.member!.id === memberId;
    const isAdmin = req.member!.role === 'ADMIN';
    const isParent = req.member!.role === 'PARENT';
    const isRoleChange = validatedData.role && validatedData.role !== targetMember.role;

    // Only ADMIN/PARENT can update other members
    if (!isUpdatingSelf && !isAdmin && !isParent) {
      throw new AppError('Insufficient permissions to update other members', 403);
    }

    // Only ADMIN can change roles
    if (isRoleChange && !isAdmin) {
      throw new AppError('Only admins can change member roles', 403);
    }

    // Cannot demote self if last admin
    if (isUpdatingSelf && isRoleChange && isAdmin && validatedData.role !== 'ADMIN') {
      const adminCount = await prisma.familyMember.count({
        where: { familyId: targetMember.familyId, role: 'ADMIN' }
      });

      if (adminCount === 1) {
        throw new AppError('Cannot remove last admin from family', 400);
      }
    }

    // Proceed with update
    const member = await prisma.familyMember.update({
      where: { id: memberId },
      data: validatedData
    });

    res.json({
      status: 'success',
      data: { member }
    });
  }
);

export const removeMember = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { memberId } = req.params;

    // Get target member
    const targetMember = await prisma.familyMember.findUnique({
      where: { id: memberId }
    });

    if (!targetMember) {
      throw new AppError('Member not found', 404);
    }

    // Authorization rules
    const isRemovingSelf = req.member!.id === memberId;
    const isAdmin = req.member!.role === 'ADMIN';
    const isParent = req.member!.role === 'PARENT';

    // Only ADMIN/PARENT can remove members (except ADMIN members)
    if (!isAdmin && !isParent) {
      throw new AppError('Only admins and parents can remove members', 403);
    }

    // PARENT cannot remove ADMIN members
    if (isParent && targetMember.role === 'ADMIN') {
      throw new AppError('Parents cannot remove admin members', 403);
    }

    // Cannot remove last admin
    if (targetMember.role === 'ADMIN') {
      const adminCount = await prisma.familyMember.count({
        where: { familyId: targetMember.familyId, role: 'ADMIN' }
      });

      if (adminCount === 1) {
        throw new AppError('Cannot remove last admin from family', 400);
      }
    }

    await prisma.familyMember.delete({
      where: { id: memberId }
    });

    res.json({
      status: 'success',
      message: 'Member removed successfully'
    });
  }
);

export const updateDietProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const family = await prisma.family.findUnique({
      where: { id },
      select: { dietProfileId: true }
    });

    if (!family) {
      throw new AppError('Family not found', 404);
    }

    const dietProfile = await prisma.dietProfile.update({
      where: { id: family.dietProfileId },
      data: req.body
    });

    res.json({
      status: 'success',
      data: { dietProfile }
    });
  }
);
