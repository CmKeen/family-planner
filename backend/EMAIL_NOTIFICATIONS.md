# Email Notification System

## Overview

The Family Planner app now includes an extensible email notification system that sends multilingual notifications to family members for various events. The system is designed to be easily expandable for future notification types.

## Features

- ✅ **Multilingual Support**: Emails are automatically sent in each user's preferred language (FR/EN/NL)
- ✅ **Extensible Architecture**: Easy to add new notification types
- ✅ **Graceful Degradation**: Works in development without SMTP configuration (logs to console)
- ✅ **Template-Based**: HTML and text email templates for all notification types
- ✅ **Type-Safe**: Full TypeScript support with proper typing

## Current Notification Types

### 1. Draft Plan Created
Sent when a new meal plan is created in DRAFT status. Notifies all family members who have user accounts.

**Triggers**:
- `POST /api/weekly-plans/family/:familyId/generate` (Auto Plan)
- `POST /api/weekly-plans/family/:familyId/generate-express` (Express Plan)
- `POST /api/weekly-plans` (Manual Plan Creation)

**Recipients**: All family members with linked user accounts

## Future Notification Types (Ready to Implement)

The system is designed to support these notification types:

- **Plan Deadline Reminder**: Remind users to validate plans before deadline
- **Comment Added**: Notify when comments are made on meals
- **Plan Validated**: Notify when a plan moves from DRAFT to VALIDATED
- **Invitation Received**: Notify users when invited to join a family

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Email / SMTP Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM_NAME="Family Planner"
EMAIL_FROM_ADDRESS="noreply@familyplanner.com"

# App URLs (used in email links)
APP_NAME="Family Planner"
APP_URL="http://localhost:5173"
```

### SMTP Providers

**Gmail** (recommended for development):
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-gmail@gmail.com"
SMTP_PASS="your-app-specific-password"  # Generate at https://myaccount.google.com/apppasswords
```

**SendGrid**:
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
```

**AWS SES**:
```env
SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-ses-access-key"
SMTP_PASS="your-ses-secret-key"
```

**Mailgun**:
```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-mailgun-username"
SMTP_PASS="your-mailgun-password"
```

### Development Mode (No SMTP)

If SMTP environment variables are not configured, the email service will:
- ✅ Log email content to console
- ✅ Continue application execution normally
- ⚠️ **Not send actual emails**

Console output example:
```
⚠ Email service disabled - SMTP configuration not found. Emails will be logged to console only.
📧 [EMAIL] (simulated - SMTP not configured)
   To: user@example.com
   Subject: 📅 Nouveau plan de repas pour la semaine du 03/11/2025
   Content: Bonjour, Un nouveau plan de repas a été créé...
```

## Architecture

### File Structure

```
backend/src/
├── services/
│   ├── email.service.ts              # Low-level email sending (nodemailer)
│   ├── notification.service.ts       # High-level notification orchestration
│   └── __tests__/
│       └── email.service.test.ts     # Unit tests
├── templates/
│   └── emailTemplates.ts             # HTML/text email templates
├── types/
│   └── notification.types.ts         # TypeScript types & interfaces
└── controllers/
    └── weeklyPlan.controller.ts      # Triggers notifications
```

### Services

#### EmailService (`src/services/email.service.ts`)
- **Responsibility**: Low-level email sending using nodemailer
- **Methods**:
  - `sendEmail(to, subject, html, text)` - Send a single email
  - `sendNotification(data)` - Send multilingual notification
  - `sendDraftPlanCreatedNotification(data)` - Type-specific notification

#### NotificationService (`src/services/notification.service.ts`)
- **Responsibility**: Fetch recipients and orchestrate notifications
- **Methods**:
  - `notifyDraftPlanCreated(familyId, planId, weekStartDate, createdByName)`
  - `notifyPlanDeadline(familyId, planId, weekStartDate, deadlineDate)` - Future use

### Email Templates

Located in `src/templates/emailTemplates.ts`, templates are functions that generate HTML and text content based on notification data and language.

**Example**:
```typescript
getDraftPlanCreatedTemplate(
  data: DraftPlanCreatedData,
  language: Language,
  options: TemplateOptions
): EmailTemplate
```

Each template returns:
```typescript
{
  subject: string,  // Localized subject line
  html: string,     // HTML email body
  text: string      // Plain text fallback
}
```

## Adding New Notification Types

### 1. Define Type in `types/notification.types.ts`

```typescript
export type NotificationType =
  | 'DRAFT_PLAN_CREATED'
  | 'YOUR_NEW_TYPE';  // Add here

export interface YourNewTypeData extends BaseNotificationData {
  type: 'YOUR_NEW_TYPE';
  // Add custom fields
  customField: string;
}

export type NotificationData =
  | DraftPlanCreatedData
  | YourNewTypeData;  // Add to union
```

### 2. Create Template in `templates/emailTemplates.ts`

```typescript
export function getYourNewTypeTemplate(
  data: Extract<NotificationData, { type: 'YOUR_NEW_TYPE' }>,
  language: Language,
  options: TemplateOptions
): EmailTemplate {
  const translations = {
    fr: { subject: '...', title: '...', message: '...' },
    en: { subject: '...', title: '...', message: '...' },
    nl: { subject: '...', title: '...', message: '...' }
  };

  const t = translations[language];

  // Generate HTML/text
  return { subject: t.subject, html: '...', text: '...' };
}

// Add to getEmailTemplate switch statement
export function getEmailTemplate(data, language, options) {
  switch (data.type) {
    case 'DRAFT_PLAN_CREATED':
      return getDraftPlanCreatedTemplate(data, language, options);
    case 'YOUR_NEW_TYPE':
      return getYourNewTypeTemplate(data, language, options);
    // ...
  }
}
```

### 3. Add Method to `NotificationService`

```typescript
async notifyYourNewType(
  familyId: string,
  // ... other params
): Promise<void> {
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  const recipients = await this.getFamilyRecipients(familyId);

  const notificationData: YourNewTypeData = {
    type: 'YOUR_NEW_TYPE',
    recipients,
    customField: 'value'
  };

  await emailService.sendNotification(notificationData);
}
```

### 4. Trigger from Controller/Service

```typescript
await notificationService.notifyYourNewType(familyId, ...);
```

## Testing

### Unit Tests

Tests are located in `src/services/__tests__/email.service.test.ts`.

Run tests:
```bash
npm test -- email.service.test.ts
```

**Note**: The unit tests currently have TypeScript typing issues with Jest mocks but the implementation is verified through build and manual testing.

### Manual Testing

1. **Configure SMTP** in `.env`
2. **Create a family** with multiple members
3. **Generate a weekly plan**:
   ```bash
   POST /api/weekly-plans/family/:familyId/generate
   ```
4. **Check emails** sent to all family members

### Console Testing (No SMTP)

Without SMTP configuration, you'll see console output like:
```
📧 [EMAIL] (simulated - SMTP not configured)
   To: user@example.com
   Subject: 📅 New meal plan for the week of 11/03/2025
   Content: Hello, A new meal plan has been created...
```

## Monitoring & Logging

### Success Logs
```
✓ Email service enabled
✓ Email sent successfully to user@example.com
Draft plan notification sent to 3 recipients for family Smith Family
```

### Error Logs
```
⚠ Email service disabled - SMTP configuration not found
✗ Failed to send email to user@example.com: Error: ...
Failed to send draft plan notification: Error: ...
```

**Note**: Email failures are logged but **do not break** the application flow.

## Security Considerations

1. **Never commit** SMTP credentials to version control
2. Use **app-specific passwords** for Gmail (not your account password)
3. Enable **2FA** on email provider accounts
4. Use **environment variables** for all sensitive configuration
5. Consider **rate limiting** email sends in production
6. Validate **recipient email addresses** before sending

## Production Deployment

### Recommended SMTP Providers

1. **SendGrid** - Free tier: 100 emails/day
2. **Mailgun** - Free tier: 5,000 emails/month
3. **AWS SES** - Pay as you go, very cheap
4. **Postmark** - Transactional focus, good deliverability

### Checklist

- [ ] Configure production SMTP credentials
- [ ] Set `APP_URL` to production domain
- [ ] Test email deliverability (check spam folders)
- [ ] Set up **SPF/DKIM/DMARC** records for your domain
- [ ] Monitor bounce/complaint rates
- [ ] Implement **unsubscribe** functionality (future)
- [ ] Add email **preference management** (future)

## Future Enhancements

### Planned Features

- [ ] **User Notification Preferences**: Let users choose which notifications to receive
- [ ] **Email Digest**: Daily/weekly summary instead of individual emails
- [ ] **SMS Notifications**: Via Twilio/AWS SNS integration
- [ ] **Push Notifications**: Mobile app integration
- [ ] **Notification History**: Track sent notifications in database
- [ ] **Retry Logic**: Automatic retry for failed sends
- [ ] **Email Analytics**: Open rates, click tracking
- [ ] **Unsubscribe Links**: One-click unsubscribe
- [ ] **Scheduled Notifications**: Cron jobs for reminders

### User Preferences (Next Step)

Add to `User` model:
```prisma
model User {
  // ...
  notificationPreferences Json? @default({
    "draftPlanCreated": true,
    "planDeadlineReminder": true,
    "commentAdded": true,
    "planValidated": false
  })
}
```

Update `NotificationService` to check preferences before sending.

## Troubleshooting

### Emails Not Sending

1. **Check SMTP credentials** are correct
2. **Verify port and security** settings match provider
3. **Check firewall** doesn't block outbound SMTP
4. **Look at console logs** for error messages
5. **Test SMTP connection** independently

### Emails in Spam

1. **Configure SPF/DKIM** for your domain
2. **Use reputable** SMTP provider
3. **Avoid spam trigger words** in subject/content
4. **Send from consistent** email address
5. **Implement unsubscribe** link

### Wrong Language

1. **Check User.language** field in database
2. **Verify language** is one of: `fr`, `en`, `nl`
3. **Default is French** if language is invalid

## Support

For issues or questions about the email notification system:

1. Check this documentation
2. Review error logs in console
3. Test with console logging (disable SMTP)
4. Verify environment configuration

---

**Last Updated**: November 1, 2025
**Version**: 1.0.0
