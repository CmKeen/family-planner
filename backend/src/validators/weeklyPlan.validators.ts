import { z } from 'zod';

/**
 * Validation schema for updating meals
 * Explicitly whitelists allowed fields to prevent injection of forbidden fields
 */
export const updateMealSchema = z.object({
  recipeId: z.string().uuid('Recipe ID must be a valid UUID').optional(),
  portions: z.number().int('Portions must be an integer').min(1, 'Portions must be at least 1').optional()
}).refine(data => data.recipeId !== undefined || data.portions !== undefined, {
  message: 'At least one field (recipeId or portions) must be provided'
});

export type UpdateMealInput = z.infer<typeof updateMealSchema>;
