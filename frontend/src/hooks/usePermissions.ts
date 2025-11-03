import { useMemo } from 'react';

type MemberRole = 'ADMIN' | 'PARENT' | 'MEMBER' | 'CHILD';
type PlanStatus = 'DRAFT' | 'IN_VALIDATION' | 'VALIDATED' | 'LOCKED';

interface WeeklyPlan {
  status: PlanStatus;
  cutoffDate?: string | null;
  cutoffTime?: string | null;
  allowCommentsAfterCutoff?: boolean;
}

interface Meal {
  locked: boolean;
}

interface PermissionsResult {
  canEditPlan: boolean;
  canLockMeal: boolean;
  canComment: boolean;
  canViewAuditLog: boolean;
  canEditAfterCutoff: boolean;
  isAfterCutoff: boolean;
  canModifyMeal: (meal: Meal) => { allowed: boolean; reason?: string };
  cutoffInfo: {
    hasCutoff: boolean;
    cutoffDate?: Date;
    cutoffTime?: string;
    isPassed: boolean;
    hoursUntilCutoff?: number;
  };
}

export function usePermissions(
  memberRole: MemberRole | undefined,
  plan: WeeklyPlan | undefined,
  memberCanViewAuditLog: boolean = true
): PermissionsResult {
  return useMemo(() => {
    if (!memberRole || !plan) {
      return {
        canEditPlan: false,
        canLockMeal: false,
        canComment: false,
        canViewAuditLog: false,
        canEditAfterCutoff: false,
        isAfterCutoff: false,
        canModifyMeal: () => ({ allowed: false, reason: 'No permissions available' }),
        cutoffInfo: {
          hasCutoff: false,
          isPassed: false
        }
      };
    }

    // Permission functions
    const canEditPlan = memberRole === 'ADMIN' || memberRole === 'PARENT';
    const canLockMeal = memberRole === 'ADMIN' || memberRole === 'PARENT';
    const canComment = true; // All roles can comment
    const canViewAuditLog = memberCanViewAuditLog;
    const canEditAfterCutoff = memberRole === 'ADMIN' || memberRole === 'PARENT';

    // Check if after cutoff
    const isAfterCutoff = (() => {
      if (!plan.cutoffDate || !plan.cutoffTime) return false;

      const now = new Date();
      const [hours, minutes] = plan.cutoffTime.split(':').map(Number);

      const cutoffDateTime = new Date(plan.cutoffDate);
      cutoffDateTime.setHours(hours, minutes, 0, 0);

      return now > cutoffDateTime;
    })();

    // Cutoff info
    const cutoffInfo = (() => {
      if (!plan.cutoffDate || !plan.cutoffTime) {
        return {
          hasCutoff: false,
          isPassed: false
        };
      }

      const [hours, minutes] = plan.cutoffTime.split(':').map(Number);
      const cutoffDateTime = new Date(plan.cutoffDate);
      cutoffDateTime.setHours(hours, minutes, 0, 0);

      const now = new Date();
      const diffMs = cutoffDateTime.getTime() - now.getTime();
      const hoursUntilCutoff = Math.floor(diffMs / 3600000);

      return {
        hasCutoff: true,
        cutoffDate: cutoffDateTime,
        cutoffTime: plan.cutoffTime,
        isPassed: isAfterCutoff,
        hoursUntilCutoff: hoursUntilCutoff > 0 ? hoursUntilCutoff : undefined
      };
    })();

    // Can modify meal function
    const canModifyMeal = (meal: Meal): { allowed: boolean; reason?: string } => {
      // Cannot modify if plan is LOCKED
      if (plan.status === 'LOCKED') {
        return { allowed: false, reason: 'permissions.planLocked' };
      }

      // Cannot modify locked meals
      if (meal.locked) {
        return { allowed: false, reason: 'permissions.mealLocked' };
      }

      // MEMBER and CHILD need edit permission
      if (!canEditPlan) {
        return { allowed: false, reason: 'permissions.editNotAllowed' };
      }

      // Check cutoff for non-ADMIN/PARENT roles
      if (!canEditAfterCutoff && isAfterCutoff) {
        return { allowed: false, reason: 'permissions.afterCutoff' };
      }

      return { allowed: true };
    };

    return {
      canEditPlan,
      canLockMeal,
      canComment,
      canViewAuditLog,
      canEditAfterCutoff,
      isAfterCutoff,
      canModifyMeal,
      cutoffInfo
    };
  }, [memberRole, plan, memberCanViewAuditLog]);
}

/**
 * Hook to check if a member can delete a comment
 */
export function useCanDeleteComment(
  memberRole: MemberRole | undefined,
  isOwnComment: boolean
): boolean {
  return useMemo(() => {
    if (!memberRole) return false;
    // ADMIN and PARENT can delete any comment
    if (memberRole === 'ADMIN' || memberRole === 'PARENT') return true;
    // MEMBER and CHILD can only delete their own comments
    return isOwnComment;
  }, [memberRole, isOwnComment]);
}

/**
 * Hook to check if comments are allowed (respects cutoff and plan status)
 */
export function useCanCommentOnPlan(
  memberRole: MemberRole | undefined,
  plan: WeeklyPlan | undefined
): { allowed: boolean; reason?: string } {
  return useMemo(() => {
    if (!memberRole || !plan) {
      return { allowed: false, reason: 'No permissions available' };
    }

    const canEditAfterCutoff = memberRole === 'ADMIN' || memberRole === 'PARENT';

    // Check if after cutoff
    const isAfterCutoff = (() => {
      if (!plan.cutoffDate || !plan.cutoffTime) return false;

      const now = new Date();
      const [hours, minutes] = plan.cutoffTime.split(':').map(Number);

      const cutoffDateTime = new Date(plan.cutoffDate);
      cutoffDateTime.setHours(hours, minutes, 0, 0);

      return now > cutoffDateTime;
    })();

    if (isAfterCutoff) {
      // If this is a comment operation and comments are allowed after cutoff
      if (plan.allowCommentsAfterCutoff) {
        return { allowed: true };
      }

      // Check if user can edit after cutoff (ADMIN/PARENT)
      if (!canEditAfterCutoff) {
        return { allowed: false, reason: 'permissions.commentsNotAllowed' };
      }
    }

    return { allowed: true };
  }, [memberRole, plan]);
}
