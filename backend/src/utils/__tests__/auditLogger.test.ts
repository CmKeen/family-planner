import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logChange, generateChangeDescription } from '../auditLogger.js';
import { ChangeType } from '@prisma/client';
import prisma from '../../lib/prisma.js';

// Mock prisma
vi.mock('../../lib/prisma.js', () => ({
  default: {
    planChangeLog: {
      create: vi.fn()
    }
  }
}));

describe('Audit Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logChange', () => {
    it('should create a change log entry', async () => {
      const options = {
        weeklyPlanId: 'plan-123',
        mealId: 'meal-456',
        memberId: 'member-789',
        changeType: 'RECIPE_CHANGED' as ChangeType,
        description: 'Changed recipe',
        descriptionEn: 'Changed recipe',
        descriptionNl: 'Recept gewijzigd',
        oldValue: { recipeId: 'old-recipe' },
        newValue: { recipeId: 'new-recipe' }
      };

      await logChange(options);

      expect(prisma.planChangeLog.create).toHaveBeenCalledWith({
        data: {
          weeklyPlanId: 'plan-123',
          mealId: 'meal-456',
          memberId: 'member-789',
          changeType: 'RECIPE_CHANGED',
          description: 'Changed recipe',
          descriptionEn: 'Changed recipe',
          descriptionNl: 'Recept gewijzigd',
          oldValue: { recipeId: 'old-recipe' },
          newValue: { recipeId: 'new-recipe' }
        }
      });
    });

    it('should handle optional fields', async () => {
      const options = {
        weeklyPlanId: 'plan-123',
        changeType: 'PLAN_CREATED' as ChangeType,
        description: 'Plan created'
      };

      await logChange(options);

      expect(prisma.planChangeLog.create).toHaveBeenCalledWith({
        data: {
          weeklyPlanId: 'plan-123',
          mealId: null,
          memberId: null,
          changeType: 'PLAN_CREATED',
          description: 'Plan created',
          descriptionEn: null,
          descriptionNl: null,
          oldValue: null,
          newValue: null
        }
      });
    });
  });

  describe('generateChangeDescription', () => {
    it('should generate description for PLAN_CREATED', () => {
      const result = generateChangeDescription('PLAN_CREATED' as ChangeType, {
        memberName: 'Alice'
      });

      expect(result.description).toContain('Alice');
      expect(result.description).toContain('créé');
      expect(result.descriptionEn).toContain('created');
      expect(result.descriptionNl).toContain('aangemaakt');
    });

    it('should generate description for PLAN_STATUS_CHANGED', () => {
      const result = generateChangeDescription('PLAN_STATUS_CHANGED' as ChangeType, {
        memberName: 'Bob',
        oldStatus: 'DRAFT',
        newStatus: 'VALIDATED'
      });

      expect(result.description).toContain('DRAFT');
      expect(result.description).toContain('VALIDATED');
      expect(result.descriptionEn).toContain('changed status');
    });

    it('should generate description for MEAL_ADDED', () => {
      const result = generateChangeDescription('MEAL_ADDED' as ChangeType, {
        memberName: 'Charlie',
        dayOfWeek: 'MONDAY',
        mealType: 'DINNER'
      });

      expect(result.description).toContain('ajouté');
      expect(result.description).toContain('DINNER');
      expect(result.description).toContain('MONDAY');
    });

    it('should generate description for MEAL_REMOVED', () => {
      const result = generateChangeDescription('MEAL_REMOVED' as ChangeType, {
        memberName: 'David',
        dayOfWeek: 'TUESDAY',
        mealType: 'LUNCH'
      });

      expect(result.description).toContain('supprimé');
      expect(result.descriptionEn).toContain('removed');
    });

    it('should generate description for RECIPE_CHANGED', () => {
      const result = generateChangeDescription('RECIPE_CHANGED' as ChangeType, {
        memberName: 'Eve',
        oldRecipeName: 'Pasta Carbonara',
        newRecipeName: 'Spaghetti Bolognese'
      });

      expect(result.description).toContain('Pasta Carbonara');
      expect(result.description).toContain('Spaghetti Bolognese');
      expect(result.descriptionEn).toContain('changed recipe');
    });

    it('should generate description for PORTIONS_CHANGED', () => {
      const result = generateChangeDescription('PORTIONS_CHANGED' as ChangeType, {
        memberName: 'Frank',
        oldPortions: 4,
        newPortions: 6
      });

      expect(result.description).toContain('4');
      expect(result.description).toContain('6');
      expect(result.descriptionEn).toContain('portions');
    });

    it('should generate description for MEAL_LOCKED', () => {
      const result = generateChangeDescription('MEAL_LOCKED' as ChangeType, {
        memberName: 'Grace'
      });

      expect(result.description).toContain('verrouillé');
      expect(result.descriptionEn).toContain('locked');
      expect(result.descriptionNl).toContain('vergrendeld');
    });

    it('should generate description for MEAL_UNLOCKED', () => {
      const result = generateChangeDescription('MEAL_UNLOCKED' as ChangeType, {
        memberName: 'Henry'
      });

      expect(result.description).toContain('déverrouillé');
      expect(result.descriptionEn).toContain('unlocked');
    });

    it('should generate description for COMMENT_ADDED', () => {
      const result = generateChangeDescription('COMMENT_ADDED' as ChangeType, {
        memberName: 'Ivy'
      });

      expect(result.description).toContain('commentaire');
      expect(result.descriptionEn).toContain('comment');
      expect(result.descriptionNl).toContain('opmerking');
    });

    it('should generate description for COMMENT_EDITED', () => {
      const result = generateChangeDescription('COMMENT_EDITED' as ChangeType, {
        memberName: 'Jack'
      });

      expect(result.description).toContain('modifié');
      expect(result.descriptionEn).toContain('edited');
    });

    it('should generate description for COMMENT_DELETED', () => {
      const result = generateChangeDescription('COMMENT_DELETED' as ChangeType, {
        memberName: 'Kate'
      });

      expect(result.description).toContain('supprimé');
      expect(result.descriptionEn).toContain('deleted');
    });

    it('should generate description for VOTE_ADDED', () => {
      const result = generateChangeDescription('VOTE_ADDED' as ChangeType, {
        memberName: 'Liam'
      });

      expect(result.description).toContain('voté');
      expect(result.descriptionEn).toContain('voted');
    });

    it('should generate description for TEMPLATE_SWITCHED', () => {
      const result = generateChangeDescription('TEMPLATE_SWITCHED' as ChangeType, {
        memberName: 'Mia'
      });

      expect(result.description).toContain('modèle');
      expect(result.descriptionEn).toContain('template');
    });

    it('should generate description for CUTOFF_CHANGED', () => {
      const result = generateChangeDescription('CUTOFF_CHANGED' as ChangeType, {
        memberName: 'Noah'
      });

      expect(result.description).toContain('date limite');
      expect(result.descriptionEn).toContain('cutoff');
    });

    it('should generate default description for unknown change type', () => {
      const result = generateChangeDescription('ATTENDANCE_CHANGED' as ChangeType, {
        memberName: 'Olivia'
      });

      expect(result.description).toContain('Olivia');
      expect(result.descriptionEn).toContain('Olivia');
    });
  });
});
