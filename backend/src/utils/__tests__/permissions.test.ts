
import {
  canEditPlan,
  canLockMeal,
  canDeleteComment,
  canViewAuditLog,
  canEditAfterCutoff,
  canModifyMeal,
  canComment,
  isAfterCutoff
} from '../permissions';
import { MemberRole, PlanStatus } from '@prisma/client';

describe('Permission Utilities', () => {
  describe('canEditPlan', () => {
    it('should allow ADMIN to edit plan', () => {
      expect(canEditPlan('ADMIN' as MemberRole)).toBe(true);
    });

    it('should allow PARENT to edit plan', () => {
      expect(canEditPlan('PARENT' as MemberRole)).toBe(true);
    });

    it('should not allow MEMBER to edit plan', () => {
      expect(canEditPlan('MEMBER' as MemberRole)).toBe(false);
    });

    it('should not allow CHILD to edit plan', () => {
      expect(canEditPlan('CHILD' as MemberRole)).toBe(false);
    });
  });

  describe('canLockMeal', () => {
    it('should allow ADMIN to lock meals', () => {
      expect(canLockMeal('ADMIN' as MemberRole)).toBe(true);
    });

    it('should allow PARENT to lock meals', () => {
      expect(canLockMeal('PARENT' as MemberRole)).toBe(true);
    });

    it('should not allow MEMBER to lock meals', () => {
      expect(canLockMeal('MEMBER' as MemberRole)).toBe(false);
    });

    it('should not allow CHILD to lock meals', () => {
      expect(canLockMeal('CHILD' as MemberRole)).toBe(false);
    });
  });

  describe('canDeleteComment', () => {
    it('should allow ADMIN to delete any comment', () => {
      expect(canDeleteComment('ADMIN' as MemberRole, false)).toBe(true);
      expect(canDeleteComment('ADMIN' as MemberRole, true)).toBe(true);
    });

    it('should allow PARENT to delete any comment', () => {
      expect(canDeleteComment('PARENT' as MemberRole, false)).toBe(true);
      expect(canDeleteComment('PARENT' as MemberRole, true)).toBe(true);
    });

    it('should allow MEMBER to delete only their own comments', () => {
      expect(canDeleteComment('MEMBER' as MemberRole, true)).toBe(true);
      expect(canDeleteComment('MEMBER' as MemberRole, false)).toBe(false);
    });

    it('should allow CHILD to delete only their own comments', () => {
      expect(canDeleteComment('CHILD' as MemberRole, true)).toBe(true);
      expect(canDeleteComment('CHILD' as MemberRole, false)).toBe(false);
    });
  });

  describe('canViewAuditLog', () => {
    it('should allow when canViewAuditLog is true', () => {
      expect(canViewAuditLog(true)).toBe(true);
    });

    it('should not allow when canViewAuditLog is false', () => {
      expect(canViewAuditLog(false)).toBe(false);
    });
  });

  describe('canEditAfterCutoff', () => {
    it('should allow ADMIN to edit after cutoff', () => {
      expect(canEditAfterCutoff('ADMIN' as MemberRole)).toBe(true);
    });

    it('should allow PARENT to edit after cutoff', () => {
      expect(canEditAfterCutoff('PARENT' as MemberRole)).toBe(true);
    });

    it('should not allow MEMBER to edit after cutoff', () => {
      expect(canEditAfterCutoff('MEMBER' as MemberRole)).toBe(false);
    });

    it('should not allow CHILD to edit after cutoff', () => {
      expect(canEditAfterCutoff('CHILD' as MemberRole)).toBe(false);
    });
  });

  describe('canComment', () => {
    it('should allow all roles to comment', () => {
      expect(canComment('ADMIN' as MemberRole)).toBe(true);
      expect(canComment('PARENT' as MemberRole)).toBe(true);
      expect(canComment('MEMBER' as MemberRole)).toBe(true);
      expect(canComment('CHILD' as MemberRole)).toBe(true);
    });
  });

  describe('isAfterCutoff', () => {
    it('should return false if no cutoff is set', () => {
      expect(isAfterCutoff(null, null)).toBe(false);
    });

    it('should return false if current time is before cutoff', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isAfterCutoff(tomorrow, '18:00')).toBe(false);
    });

    it('should return true if current time is after cutoff', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isAfterCutoff(yesterday, '18:00')).toBe(true);
    });

    it('should handle same-day cutoff times correctly', () => {
      const today = new Date();
      const pastTime = '00:00'; // midnight (past for most of the day)
      const futureTime = '23:59'; // end of day

      expect(isAfterCutoff(today, pastTime)).toBe(true);
      expect(isAfterCutoff(today, futureTime)).toBe(false);
    });
  });

  describe('canModifyMeal', () => {
    const mockPlan = {
      status: 'DRAFT' as PlanStatus,
      cutoffDate: null as Date | null,
      cutoffTime: null as string | null,
      allowCommentsAfterCutoff: true
    };

    const mockMeal = {
      locked: false
    };

    it('should allow ADMIN to modify unlocked meal in DRAFT status', () => {
      const result = canModifyMeal('ADMIN' as MemberRole, mockPlan, mockMeal);
      expect(result.allowed).toBe(true);
    });

    it('should allow PARENT to modify unlocked meal in DRAFT status', () => {
      const result = canModifyMeal('PARENT' as MemberRole, mockPlan, mockMeal);
      expect(result.allowed).toBe(true);
    });

    it('should not allow MEMBER to modify meal in DRAFT status', () => {
      const result = canModifyMeal('MEMBER' as MemberRole, mockPlan, mockMeal);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('permission');
    });

    it('should not allow modification if plan is LOCKED', () => {
      const lockedPlan = { ...mockPlan, status: 'LOCKED' as PlanStatus };
      const result = canModifyMeal('ADMIN' as MemberRole, lockedPlan, mockMeal);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('locked');
    });

    it('should not allow modification if meal is locked', () => {
      const lockedMeal = { locked: true };
      const result = canModifyMeal('ADMIN' as MemberRole, mockPlan, lockedMeal);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('locked');
    });

    it('should not allow MEMBER modification (no edit permission)', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const cutoffPlan = { ...mockPlan, cutoffDate: yesterday, cutoffTime: '18:00' };

      const result = canModifyMeal('MEMBER' as MemberRole, cutoffPlan, mockMeal);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('permission');
    });

    it('should allow ADMIN modification after cutoff', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const cutoffPlan = { ...mockPlan, cutoffDate: yesterday, cutoffTime: '18:00' };

      const result = canModifyMeal('ADMIN' as MemberRole, cutoffPlan, mockMeal);
      expect(result.allowed).toBe(true);
    });

    it('should allow PARENT modification after cutoff', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const cutoffPlan = { ...mockPlan, cutoffDate: yesterday, cutoffTime: '18:00' };

      const result = canModifyMeal('PARENT' as MemberRole, cutoffPlan, mockMeal);
      expect(result.allowed).toBe(true);
    });
  });
});
