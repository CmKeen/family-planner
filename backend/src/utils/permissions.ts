import { MemberRole, PlanStatus } from '@prisma/client';

/**
 * Permission utilities for meal plan management
 */

/**
 * Check if a member role can edit the plan (add/remove meals, change recipes)
 */
export function canEditPlan(memberRole: MemberRole): boolean {
  return memberRole === 'ADMIN' || memberRole === 'PARENT';
}

/**
 * Check if a member role can lock/unlock meals
 */
export function canLockMeal(memberRole: MemberRole): boolean {
  return memberRole === 'ADMIN' || memberRole === 'PARENT';
}

/**
 * Check if a member can delete a comment
 * @param memberRole - The role of the member trying to delete
 * @param isOwnComment - Whether the comment belongs to the member
 */
export function canDeleteComment(memberRole: MemberRole, isOwnComment: boolean): boolean {
  // ADMIN and PARENT can delete any comment
  if (memberRole === 'ADMIN' || memberRole === 'PARENT') {
    return true;
  }
  // MEMBER and CHILD can only delete their own comments
  return isOwnComment;
}

/**
 * Check if a member can view the audit log
 */
export function canViewAuditLog(memberCanViewAuditLog: boolean): boolean {
  return memberCanViewAuditLog;
}

/**
 * Check if a member role can edit after the cutoff deadline
 */
export function canEditAfterCutoff(memberRole: MemberRole): boolean {
  return memberRole === 'ADMIN' || memberRole === 'PARENT';
}

/**
 * Check if a member role can comment (all roles can comment)
 */
export function canComment(memberRole: MemberRole): boolean {
  return true; // All roles can comment
}

/**
 * Check if current time is after the cutoff
 * @param cutoffDate - The cutoff date
 * @param cutoffTime - The cutoff time (HH:mm format)
 */
export function isAfterCutoff(cutoffDate: Date | null, cutoffTime: string | null): boolean {
  if (!cutoffDate || !cutoffTime) {
    return false; // No cutoff set
  }

  const now = new Date();
  const [hours, minutes] = cutoffTime.split(':').map(Number);

  const cutoffDateTime = new Date(cutoffDate);
  cutoffDateTime.setHours(hours, minutes, 0, 0);

  return now > cutoffDateTime;
}

/**
 * Check if a meal can be modified by a member
 * @param memberRole - The role of the member
 * @param plan - The weekly plan
 * @param meal - The meal to modify
 */
export function canModifyMeal(
  memberRole: MemberRole,
  plan: {
    status: PlanStatus;
    cutoffDate: Date | null;
    cutoffTime: string | null;
    allowCommentsAfterCutoff?: boolean;
  },
  meal: {
    locked: boolean;
  }
): { allowed: boolean; reason?: string } {
  // Cannot modify if plan is LOCKED
  if (plan.status === 'LOCKED') {
    return { allowed: false, reason: 'Plan is locked and cannot be modified' };
  }

  // Cannot modify locked meals
  if (meal.locked) {
    return { allowed: false, reason: 'Meal is locked and cannot be modified' };
  }

  // MEMBER and CHILD need edit permission
  if (!canEditPlan(memberRole)) {
    return { allowed: false, reason: 'You do not have permission to edit this plan' };
  }

  // Check cutoff for non-ADMIN/PARENT roles
  if (!canEditAfterCutoff(memberRole) && isAfterCutoff(plan.cutoffDate, plan.cutoffTime)) {
    return { allowed: false, reason: 'Cutoff deadline has passed. Only administrators can make changes now' };
  }

  return { allowed: true };
}
