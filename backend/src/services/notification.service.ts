import prisma from '../lib/prisma.js';
import { emailService } from './email.service.js';
import {
  DraftPlanCreatedData,
  EmailRecipient,
  Language
} from '../types/notification.types.js';

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
        console.error(`Family not found: ${familyId}`);
        return;
      }

      // Get all recipients
      const recipients = await this.getFamilyRecipients(familyId);

      if (recipients.length === 0) {
        console.log(`No email recipients found for family ${familyId}`);
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

      console.log(`Draft plan notification sent to ${recipients.length} recipients for family ${family.name}`);
    } catch (error) {
      console.error('Failed to send draft plan notification:', error);
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
        console.error(`Family not found: ${familyId}`);
        return;
      }

      const recipients = await this.getFamilyRecipients(familyId);

      if (recipients.length === 0) {
        console.log(`No email recipients found for family ${familyId}`);
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

      console.log(`Plan deadline reminder sent to ${recipients.length} recipients for family ${family.name}`);
    } catch (error) {
      console.error('Failed to send plan deadline reminder:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
