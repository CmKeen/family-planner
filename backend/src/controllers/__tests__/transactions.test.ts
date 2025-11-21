import { vi, describe, it, expect, beforeEach } from 'vitest';
import { validatePlan, generateExpressPlan } from '../weeklyPlan.controller';
import prisma from '../../lib/prisma';
import { Request, Response } from 'express';

// Mock Prisma
vi.mock('../../lib/prisma', () => {
    const mockTx = {
        weeklyPlan: {
            create: vi.fn(),
            update: vi.fn(),
            findUnique: vi.fn(),
        },
        meal: {
            createMany: vi.fn(),
            updateMany: vi.fn(),
        },
        mealComponent: {
            createMany: vi.fn(),
        }
    };

    return {
        __esModule: true,
        default: {
            $transaction: vi.fn(async (callback) => {
                return await callback(mockTx);
            }),
            weeklyPlan: {
                findUnique: vi.fn(),
            },
            familyMember: {
                findFirst: vi.fn(),
            },
            family: {
                findUnique: vi.fn(),
            },
            recipe: {
                findMany: vi.fn(),
            },
            user: {
                findUnique: vi.fn(),
            },
            // Expose mockTx for assertions
            _mockTx: mockTx
        }
    };
});

// Mock Notification Service
vi.mock('../../services/notification.service', () => ({
    notificationService: {
        notifyDraftPlanCreated: vi.fn(),
    }
}));

// Mock Shopping List Service
vi.mock('../../services/shoppingList.service', () => ({
    generateShoppingList: vi.fn(),
}));

// Mock Logger
vi.mock('../../utils/logger', () => ({
    log: {
        error: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
    },
    logChange: vi.fn(),
}));

// Mock Audit Logger
vi.mock('../../utils/auditLogger', () => ({
    logChange: vi.fn(),
}));

// Mock Error Handler
vi.mock('../../middleware/errorHandler', () => ({
    AppError: class extends Error {
        statusCode: number;
        constructor(message: string, statusCode: number) {
            super(message);
            this.statusCode = statusCode;
        }
    },
    asyncHandler: (fn: any) => fn,
}));

describe('Transaction Integrity', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let jsonMock: any;
    let statusMock: any;

    beforeEach(() => {
        jsonMock = vi.fn();
        statusMock = vi.fn().mockReturnValue({ json: jsonMock });
        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
        vi.clearAllMocks();
    });

    describe('validatePlan', () => {
        it('should execute meal update and plan update in a transaction', async () => {
            mockReq = {
                params: { planId: 'plan-123' },
                user: { id: 'user-123' }
            } as any;

            // Mock finding old plan
            (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
                id: 'plan-123',
                familyId: 'family-123',
                status: 'DRAFT',
            });

            // Mock finding family member
            (prisma.familyMember.findFirst as any).mockResolvedValue({
                id: 'member-123',
                userId: 'user-123',
            });

            // Mock transaction operations
            const mockTx = (prisma as any)._mockTx;
            mockTx.meal.updateMany.mockResolvedValue({ count: 1 });
            mockTx.weeklyPlan.update.mockResolvedValue({ id: 'plan-123', status: 'VALIDATED' });

            const next = vi.fn();
            await validatePlan(mockReq as Request, mockRes as Response, next);

            if (next.mock.calls.length > 0) {
                console.error('validatePlan called next with:', next.mock.calls[0][0]);
            }

            // Verify transaction was called
            expect(prisma.$transaction).toHaveBeenCalled();

            // Verify operations were called on the transaction client
            expect(mockTx.meal.updateMany).toHaveBeenCalled();
            expect(mockTx.weeklyPlan.update).toHaveBeenCalled();
        });

        it('should rollback if meal update fails', async () => {
            mockReq = {
                params: { planId: 'plan-123' },
                user: { id: 'user-123' }
            } as any;

            (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
                id: 'plan-123',
                familyId: 'family-123',
                status: 'DRAFT',
            });

            (prisma.familyMember.findFirst as any).mockResolvedValue({
                id: 'member-123',
                userId: 'user-123',
            });

            const mockTx = (prisma as any)._mockTx;
            mockTx.meal.updateMany.mockRejectedValue(new Error('DB Error'));

            await expect(validatePlan(mockReq as Request, mockRes as Response, vi.fn()))
                .rejects.toThrow('DB Error');

            expect(prisma.$transaction).toHaveBeenCalled();
            expect(mockTx.meal.updateMany).toHaveBeenCalled();
            expect(mockTx.weeklyPlan.update).not.toHaveBeenCalled(); // Should not reach this
        });
    });

    describe('generateExpressPlan', () => {
        it('should execute plan creation and meal creation in a transaction', async () => {
            mockReq = {
                params: { familyId: 'family-123' },
                body: { weekStartDate: '2024-01-01' },
                user: { id: 'user-123' }
            } as any;

            // Mock family finding
            (prisma.family.findUnique as any).mockResolvedValue({
                id: 'family-123',
                members: [{}],
                dietProfile: {
                    allergies: [],
                    kosher: false,
                    halal: false,
                    vegetarian: false,
                    vegan: false,
                    glutenFree: false,
                    lactoseFree: false
                },
            });

            // Mock recipe finding (favorites)
            (prisma.recipe.findMany as any).mockResolvedValue([
                { id: 'r1', isFavorite: true, category: 'test' },
                { id: 'r2', isFavorite: true, category: 'test' }
            ]);

            const mockTx = (prisma as any)._mockTx;
            mockTx.weeklyPlan.create.mockResolvedValue({ id: 'plan-new' });
            mockTx.meal.createMany.mockResolvedValue({ count: 14 });
            mockTx.weeklyPlan.findUnique.mockResolvedValue({ id: 'plan-new', meals: [] });

            await generateExpressPlan(mockReq as Request, mockRes as Response, vi.fn());

            expect(prisma.$transaction).toHaveBeenCalled();
            expect(mockTx.weeklyPlan.create).toHaveBeenCalled();
            expect(mockTx.meal.createMany).toHaveBeenCalled();
        });
    });
});
