// Notification types for the email/notification system

export type NotificationType =
  | 'DRAFT_PLAN_CREATED'
  | 'PLAN_DEADLINE_REMINDER'
  | 'COMMENT_ADDED'
  | 'PLAN_VALIDATED'
  | 'INVITATION_RECEIVED';

export type Language = 'fr' | 'en' | 'nl';

export interface EmailRecipient {
  email: string;
  name?: string;
  language: Language;
}

export interface BaseNotificationData {
  type: NotificationType;
  recipients: EmailRecipient[];
}

export interface DraftPlanCreatedData extends BaseNotificationData {
  type: 'DRAFT_PLAN_CREATED';
  familyName: string;
  weekStartDate: Date;
  planId: string;
  createdBy: string;
}

export interface PlanDeadlineReminderData extends BaseNotificationData {
  type: 'PLAN_DEADLINE_REMINDER';
  familyName: string;
  weekStartDate: Date;
  planId: string;
  deadlineDate: Date;
}

export interface CommentAddedData extends BaseNotificationData {
  type: 'COMMENT_ADDED';
  familyName: string;
  commentAuthor: string;
  commentText: string;
  planId: string;
  mealId?: string;
}

export interface PlanValidatedData extends BaseNotificationData {
  type: 'PLAN_VALIDATED';
  familyName: string;
  weekStartDate: Date;
  planId: string;
  validatedBy: string;
}

export interface InvitationReceivedData extends BaseNotificationData {
  type: 'INVITATION_RECEIVED';
  familyName: string;
  inviterName: string;
  invitationToken: string;
}

export type NotificationData =
  | DraftPlanCreatedData
  | PlanDeadlineReminderData
  | CommentAddedData
  | PlanValidatedData
  | InvitationReceivedData;

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    address: string;
  };
}
