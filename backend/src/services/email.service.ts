import nodemailer, { Transporter } from 'nodemailer';
import {
  NotificationData,
  DraftPlanCreatedData,
  EmailConfig,
  EmailRecipient
} from '../types/notification.types';
import { getEmailTemplate } from '../templates/emailTemplates';
import { log } from '../config/logger';

export class EmailService {
  private transporter: Transporter | null = null;
  private fromAddress: string;
  private fromName: string;
  private appUrl: string;
  private appName: string;
  private isEnabled: boolean = false;

  constructor() {
    this.appUrl = process.env.APP_URL || 'http://localhost:5173';
    this.appName = process.env.APP_NAME || 'Family Planner';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Family Planner';
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@familyplanner.com';

    try {
      // Load configuration from environment variables
      const config = this.loadConfig();

      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth
      });

      this.isEnabled = true;
      log.info('Email service enabled', {
        fromAddress: this.fromAddress,
        fromName: this.fromName
      });
    } catch (error) {
      log.warn('Email service disabled - SMTP configuration not found', {
        message: 'Emails will be logged only, not sent',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.isEnabled = false;
    }
  }

  /**
   * Load email configuration from environment variables
   */
  private loadConfig(): EmailConfig {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromName = process.env.EMAIL_FROM_NAME || 'Family Planner';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@familyplanner.com';

    // Validate required configuration
    if (!host || !user || !pass) {
      throw new Error('Email service configuration is incomplete. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
    }

    return {
      host,
      port,
      secure,
      auth: { user, pass },
      from: { name: fromName, address: fromAddress }
    };
  }

  /**
   * Send a generic email
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<void> {
    // If email service is disabled, just log
    if (!this.isEnabled || !this.transporter) {
      log.info('Email simulated (SMTP not configured)', {
        to,
        subject,
        contentPreview: text.substring(0, 200)
      });
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `${this.fromName} <${this.fromAddress}>`,
        to,
        subject,
        html,
        text
      });
      log.info('Email sent successfully', {
        to,
        subject
      });
    } catch (error) {
      log.error('Failed to send email', {
        to,
        subject,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't throw - we don't want email failures to break the application
    }
  }

  /**
   * Send notification to multiple recipients based on their language preference
   */
  async sendNotification(data: NotificationData): Promise<void> {
    const { recipients } = data;

    // Send email to each recipient in their preferred language
    const emailPromises = recipients.map(async (recipient: EmailRecipient) => {
      const template = getEmailTemplate(data, recipient.language, {
        appUrl: this.appUrl,
        appName: this.appName
      });

      await this.sendEmail(
        recipient.email,
        template.subject,
        template.html,
        template.text
      );
    });

    await Promise.all(emailPromises);
  }

  /**
   * Send draft plan created notification
   */
  async sendDraftPlanCreatedNotification(
    data: DraftPlanCreatedData
  ): Promise<void> {
    await this.sendNotification(data);
  }

  /**
   * Send plan deadline reminder notification (for future use)
   */
  async sendPlanDeadlineReminder(
    data: Extract<NotificationData, { type: 'PLAN_DEADLINE_REMINDER' }>
  ): Promise<void> {
    await this.sendNotification(data);
  }
}

// Export singleton instance
export const emailService = new EmailService();
