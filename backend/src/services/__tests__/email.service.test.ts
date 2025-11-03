import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock nodemailer before importing the service
const mockSendMail: any = jest.fn();
const mockCreateTransport: any = jest.fn();

jest.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport
  },
  createTransport: mockCreateTransport
}));

// Now import after mocking
import { EmailService } from '../email.service';
import { DraftPlanCreatedData } from '../../types/notification.types';

describe('EmailService', () => {
  let emailService: EmailService;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock environment variables
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASS = 'testpass';
    process.env.EMAIL_FROM_NAME = 'Family Planner';
    process.env.EMAIL_FROM_ADDRESS = 'noreply@familyplanner.com';
    process.env.APP_URL = 'http://localhost:5173';
    process.env.APP_NAME = 'Family Planner';

    // Setup mock transport
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail
    });

    emailService = new EmailService();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create transporter with correct configuration', () => {
      expect(mockCreateTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@test.com',
          pass: 'testpass'
        }
      });
    });

    it('should log when email service is enabled', () => {
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Email service enabled');
    });

    it('should warn when SMTP configuration is missing', () => {
      delete process.env.SMTP_HOST;
      const service = new EmailService();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email service disabled')
      );
    });
  });

  describe('sendDraftPlanCreatedNotification', () => {
    it('should send email to single recipient in French', async () => {
      const notificationData: DraftPlanCreatedData = {
        type: 'DRAFT_PLAN_CREATED',
        familyName: 'Famille Dupont',
        weekStartDate: new Date('2025-11-03'),
        planId: 'plan-123',
        createdBy: 'Jean Dupont',
        recipients: [
          {
            email: 'marie@example.com',
            name: 'Marie Dupont',
            language: 'fr'
          }
        ]
      };

      await emailService.sendDraftPlanCreatedNotification(notificationData);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0] as any;

      expect(callArgs.to).toBe('marie@example.com');
      expect(callArgs.from).toBe('Family Planner <noreply@familyplanner.com>');
      expect(callArgs.subject).toContain('Nouveau plan de repas');
      expect(callArgs.html).toContain('Famille Dupont');
      expect(callArgs.html).toContain('Jean Dupont');
      expect(callArgs.text).toBeTruthy();
    });

    it('should send email to multiple recipients in different languages', async () => {
      const notificationData: DraftPlanCreatedData = {
        type: 'DRAFT_PLAN_CREATED',
        familyName: 'Smith Family',
        weekStartDate: new Date('2025-11-03'),
        planId: 'plan-456',
        createdBy: 'John Smith',
        recipients: [
          { email: 'john@example.com', name: 'John', language: 'en' },
          { email: 'marie@example.com', name: 'Marie', language: 'fr' },
          { email: 'peter@example.com', name: 'Peter', language: 'nl' }
        ]
      };

      await emailService.sendDraftPlanCreatedNotification(notificationData);

      expect(mockSendMail).toHaveBeenCalledTimes(3);

      // Check English email
      const enCall = mockSendMail.mock.calls[0][0] as any;
      expect(enCall.to).toBe('john@example.com');
      expect(enCall.subject).toContain('New meal plan');

      // Check French email
      const frCall = mockSendMail.mock.calls[1][0] as any;
      expect(frCall.to).toBe('marie@example.com');
      expect(frCall.subject).toContain('Nouveau plan de repas');

      // Check Dutch email
      const nlCall = mockSendMail.mock.calls[2][0] as any;
      expect(nlCall.to).toBe('peter@example.com');
      expect(nlCall.subject).toContain('Nieuw maaltijdplan');
    });

    it('should include plan URL in email content', async () => {
      const notificationData: DraftPlanCreatedData = {
        type: 'DRAFT_PLAN_CREATED',
        familyName: 'Test Family',
        weekStartDate: new Date('2025-11-03'),
        planId: 'plan-789',
        createdBy: 'Test User',
        recipients: [
          { email: 'test@example.com', language: 'en' }
        ]
      };

      await emailService.sendDraftPlanCreatedNotification(notificationData);

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('http://localhost:5173/plan/plan-789');
      expect(callArgs.text).toContain('http://localhost:5173/plan/plan-789');
    });

    it('should handle email sending errors gracefully', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      const notificationData: DraftPlanCreatedData = {
        type: 'DRAFT_PLAN_CREATED',
        familyName: 'Test Family',
        weekStartDate: new Date('2025-11-03'),
        planId: 'plan-error',
        createdBy: 'Test User',
        recipients: [
          { email: 'test@example.com', language: 'en' }
        ]
      };

      // Should not throw, but log error
      await expect(
        emailService.sendDraftPlanCreatedNotification(notificationData)
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('sendNotification', () => {
    it('should send notification based on type', async () => {
      const notificationData: DraftPlanCreatedData = {
        type: 'DRAFT_PLAN_CREATED',
        familyName: 'Test Family',
        weekStartDate: new Date('2025-11-03'),
        planId: 'plan-123',
        createdBy: 'Test User',
        recipients: [
          { email: 'test@example.com', language: 'en' }
        ]
      };

      await emailService.sendNotification(notificationData);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendEmail', () => {
    it('should send email with correct parameters', async () => {
      await emailService.sendEmail(
        'test@example.com',
        'Test Subject',
        '<p>Test HTML</p>',
        'Test Text'
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'Family Planner <noreply@familyplanner.com>',
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text'
      });
    });

    it('should log error when email sending fails', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Send failed'));

      await emailService.sendEmail(
        'test@example.com',
        'Test',
        'HTML',
        'Text'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send email'),
        expect.any(Error)
      );
    });

    it('should log to console when SMTP is not configured', async () => {
      // Create service without SMTP config
      delete process.env.SMTP_HOST;
      const noSmtpService = new EmailService();

      await noSmtpService.sendEmail(
        'test@example.com',
        'Test Subject',
        '<p>HTML</p>',
        'Text content'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EMAIL] (simulated')
      );
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });
});
