import { updateMealSchema } from '../weeklyPlan.validators';
import { ZodError } from 'zod';

describe('WeeklyPlan Validators', () => {
  describe('updateMealSchema', () => {
    describe('Valid inputs', () => {
      it('should accept valid recipeId update', () => {
        const recipeId = '123e4567-e89b-12d3-a456-426614174000';
        const result = updateMealSchema.parse({ recipeId });
        expect(result.recipeId).toBe(recipeId);
      });

      it('should accept valid portions update', () => {
        const result = updateMealSchema.parse({ portions: 4 });
        expect(result.portions).toBe(4);
      });

      it('should accept both recipeId and portions', () => {
        const recipeId = '123e4567-e89b-12d3-a456-426614174000';
        const result = updateMealSchema.parse({ recipeId, portions: 6 });
        expect(result.recipeId).toBe(recipeId);
        expect(result.portions).toBe(6);
      });

      it('should accept portions value of 1', () => {
        const result = updateMealSchema.parse({ portions: 1 });
        expect(result.portions).toBe(1);
      });

      it('should accept large portions value', () => {
        const result = updateMealSchema.parse({ portions: 20 });
        expect(result.portions).toBe(20);
      });
    });

    describe('Invalid inputs - RecipeId', () => {
      it('should reject non-UUID recipeId', () => {
        expect(() => updateMealSchema.parse({ recipeId: 'not-a-uuid' })).toThrow(ZodError);
      });

      it('should reject numeric recipeId', () => {
        expect(() => updateMealSchema.parse({ recipeId: 123 })).toThrow(ZodError);
      });

      it('should reject empty recipeId', () => {
        expect(() => updateMealSchema.parse({ recipeId: '' })).toThrow(ZodError);
      });

      it('should reject malformed UUID', () => {
        expect(() => updateMealSchema.parse({ recipeId: '123-456-789' })).toThrow(ZodError);
      });
    });

    describe('Invalid inputs - Portions', () => {
      it('should reject portions of 0', () => {
        expect(() => updateMealSchema.parse({ portions: 0 })).toThrow(ZodError);
      });

      it('should reject negative portions', () => {
        expect(() => updateMealSchema.parse({ portions: -1 })).toThrow(ZodError);
      });

      it('should reject non-integer portions', () => {
        expect(() => updateMealSchema.parse({ portions: 4.5 })).toThrow(ZodError);
      });

      it('should reject string portions', () => {
        expect(() => updateMealSchema.parse({ portions: '4' })).toThrow(ZodError);
      });

      it('should reject null portions', () => {
        expect(() => updateMealSchema.parse({ portions: null })).toThrow(ZodError);
      });
    });

    describe('Invalid inputs - Empty update', () => {
      it('should reject empty object', () => {
        expect(() => updateMealSchema.parse({})).toThrow(ZodError);
        expect(() => updateMealSchema.parse({})).toThrow(/at least one field/i);
      });

      it('should reject update with only undefined values', () => {
        expect(() => updateMealSchema.parse({ recipeId: undefined, portions: undefined })).toThrow(ZodError);
      });
    });

    describe('Security - Forbidden field injection', () => {
      it('should strip out forbidden field: id', () => {
        const recipeId = '123e4567-e89b-12d3-a456-426614174000';
        const result = updateMealSchema.parse({
          recipeId,
          id: 'malicious-id'
        } as any);
        expect(result).toEqual({ recipeId });
        expect((result as any).id).toBeUndefined();
      });

      it('should strip out forbidden field: weeklyPlanId', () => {
        const result = updateMealSchema.parse({
          portions: 4,
          weeklyPlanId: 'malicious-plan-id'
        } as any);
        expect(result).toEqual({ portions: 4 });
        expect((result as any).weeklyPlanId).toBeUndefined();
      });

      it('should strip out forbidden field: dayOfWeek', () => {
        const result = updateMealSchema.parse({
          portions: 4,
          dayOfWeek: 'SUNDAY'
        } as any);
        expect(result).toEqual({ portions: 4 });
        expect((result as any).dayOfWeek).toBeUndefined();
      });

      it('should strip out forbidden field: mealType', () => {
        const result = updateMealSchema.parse({
          portions: 4,
          mealType: 'DINNER'
        } as any);
        expect(result).toEqual({ portions: 4 });
        expect((result as any).mealType).toBeUndefined();
      });

      it('should strip out forbidden field: locked', () => {
        const result = updateMealSchema.parse({
          portions: 4,
          locked: true
        } as any);
        expect(result).toEqual({ portions: 4 });
        expect((result as any).locked).toBeUndefined();
      });

      it('should strip out forbidden field: skipped', () => {
        const result = updateMealSchema.parse({
          portions: 4,
          skipped: true
        } as any);
        expect(result).toEqual({ portions: 4 });
        expect((result as any).skipped).toBeUndefined();
      });

      it('should strip out forbidden field: createdAt', () => {
        const result = updateMealSchema.parse({
          portions: 4,
          createdAt: new Date()
        } as any);
        expect(result).toEqual({ portions: 4 });
        expect((result as any).createdAt).toBeUndefined();
      });

      it('should strip out multiple forbidden fields', () => {
        const recipeId = '123e4567-e89b-12d3-a456-426614174000';
        const result = updateMealSchema.parse({
          recipeId,
          portions: 4,
          id: 'bad-id',
          weeklyPlanId: 'bad-plan',
          dayOfWeek: 'MONDAY',
          mealType: 'LUNCH',
          locked: true,
          skipped: false,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any);

        expect(result).toEqual({ recipeId, portions: 4 });
        expect((result as any).id).toBeUndefined();
        expect((result as any).weeklyPlanId).toBeUndefined();
        expect((result as any).dayOfWeek).toBeUndefined();
        expect((result as any).mealType).toBeUndefined();
        expect((result as any).locked).toBeUndefined();
        expect((result as any).skipped).toBeUndefined();
        expect((result as any).createdAt).toBeUndefined();
        expect((result as any).updatedAt).toBeUndefined();
      });

      it('should only allow whitelisted fields through', () => {
        const recipeId = '123e4567-e89b-12d3-a456-426614174000';
        const input = {
          recipeId,
          portions: 4,
          // Forbidden fields
          id: 'malicious-id',
          weeklyPlanId: 'malicious-plan',
          dayOfWeek: 'SUNDAY',
          mealType: 'DINNER',
          locked: true,
          skipped: true,
          __proto__: { isAdmin: true },
          constructor: { name: 'Evil' }
        } as any;

        const result = updateMealSchema.parse(input);

        // Only whitelisted fields should exist
        expect(Object.keys(result)).toEqual(expect.arrayContaining(['recipeId', 'portions']));
        expect(Object.keys(result)).not.toContain('id');
        expect(Object.keys(result)).not.toContain('weeklyPlanId');
        expect(Object.keys(result)).not.toContain('dayOfWeek');
        expect(Object.keys(result)).not.toContain('mealType');
        expect(Object.keys(result)).not.toContain('locked');
        expect(Object.keys(result)).not.toContain('skipped');
        expect(Object.keys(result)).not.toContain('__proto__');
        expect(Object.keys(result)).not.toContain('constructor');
      });
    });

    describe('Edge cases', () => {
      it('should handle very long UUID strings gracefully', () => {
        const longString = '123e4567-e89b-12d3-a456-426614174000-extra-long';
        expect(() => updateMealSchema.parse({ recipeId: longString })).toThrow(ZodError);
      });

      it('should handle special characters in recipeId', () => {
        expect(() => updateMealSchema.parse({ recipeId: '!@#$%^&*()' })).toThrow(ZodError);
      });

      it('should handle very large portions', () => {
        const result = updateMealSchema.parse({ portions: 999999 });
        expect(result.portions).toBe(999999);
      });
    });
  });
});
