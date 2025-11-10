import prisma from '../lib/prisma';
import { emailService } from './email.service';
import {
  DraftPlanCreatedData,
  EmailRecipient,
  Language
} from '../types/notification.types';
import { log } from '../config/logger';

/**
 * Notification Service
 * Handles fetching recipients and sending notifications for various events
 */
export class NotificationService {
  /**
   * Get all family members with user accounts (email recipients)
   */
  private async getFamilyRecipients(familyId: string): Promise<EmailRecipient[]> {
    const familyMembers = await prisma.familyMember.findMany({
      where: {
        familyId,
        userId: { not: null } // Only members with user accounts
      },
      include: {
        user: true
      }
    });

    type FamilyMemberWithUser = typeof familyMembers[number] & {
      user: NonNullable<typeof familyMembers[number]['user']>
    };

    return familyMembers
      .filter((member: typeof familyMembers[number]): member is FamilyMemberWithUser => member.user !== null)
      .map((member: FamilyMemberWithUser) => ({
        email: member.user.email,
        name: `${member.user.firstName} ${member.user.lastName}`,
        language: (member.user.language || 'fr') as Language
      }));
  }

  /**
   * Send notification when a draft plan is created
   */
  async notifyDraftPlanCreated(
    familyId: string,
    planId: string,
    weekStartDate: Date,
    createdByName: string
  ): Promise<void> {
    try {
      // Fetch family details
      const family = await prisma.family.findUnique({
        where: { id: familyId }
      });

      if (!family) {
        log.error('Family not found for draft plan notification', {
          familyId,
          planId
        });
        return;
      }

      // Get all recipients
      const recipients = await this.getFamilyRecipients(familyId);

      if (recipients.length === 0) {
        log.info('No email recipients found for draft plan notification', {
          familyId,
          familyName: family.name
        });
        return;
      }

      // Prepare notification data
      const notificationData: DraftPlanCreatedData = {
        type: 'DRAFT_PLAN_CREATED',
        familyName: family.name,
        weekStartDate,
        planId,
        createdBy: createdByName,
        recipients
      };

      // Send notification
      await emailService.sendDraftPlanCreatedNotification(notificationData);

      log.info('Draft plan notification sent successfully', {
        familyId,
        familyName: family.name,
        planId,
        recipientCount: recipients.length
      });
    } catch (error) {
      log.error('Failed to send draft plan notification', {
        familyId,
        planId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't throw - we don't want notification failures to break the application
    }
  }

  /**
   * Send reminder notification before plan deadline (for future use)
   */
  async notifyPlanDeadline(
    familyId: string,
    planId: string,
    weekStartDate: Date,
    deadlineDate: Date
  ): Promise<void> {
    try {
      const family = await prisma.family.findUnique({
        where: { id: familyId }
      });

      if (!family) {
        log.error('Family not found for plan deadline reminder', {
          familyId,
          planId
        });
        return;
      }

      const recipients = await this.getFamilyRecipients(familyId);

      if (recipients.length === 0) {
        log.info('No email recipients found for plan deadline reminder', {
          familyId,
          familyName: family.name
        });
        return;
      }

      const notificationData = {
        type: 'PLAN_DEADLINE_REMINDER' as const,
        familyName: family.name,
        weekStartDate,
        planId,
        deadlineDate,
        recipients
      };

      await emailService.sendPlanDeadlineReminder(notificationData);

      log.info('Plan deadline reminder sent successfully', {
        familyId,
        familyName: family.name,
        planId,
        recipientCount: recipients.length
      });
    } catch (error) {
      log.error('Failed to send plan deadline reminder', {
        familyId,
        planId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
