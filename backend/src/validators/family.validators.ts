import { z } from 'zod';

/**
 * Validation schema for updating family members
 * Explicitly whitelists allowed fields to prevent injection of forbidden fields
 */
export const updateMemberSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(255, 'Name is too long').optional(),
  role: z.enum(['ADMIN', 'PARENT', 'MEMBER', 'CHILD'], {
    errorMap: () => ({ message: 'Invalid role' })
  }).optional(),
  age: z.number().int('Age must be an integer').min(0, 'Age cannot be negative').max(150, 'Age is too high').optional(),
  portionFactor: z.number().min(0.1, 'Portion factor must be at least 0.1').max(5.0, 'Portion factor cannot exceed 5.0').optional(),
  aversions: z.array(z.string()).optional(),
  favorites: z.array(z.string()).optional()
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
