import { Language, EmailTemplate, NotificationData } from '../types/notification.types';

interface TemplateOptions {
  appUrl: string;
  appName: string;
}

/**
 * Base HTML email template wrapper
 */
function getBaseEmailTemplate(
  content: string,
  language: Language,
  options: TemplateOptions
): string {
  const footer = {
    fr: 'Vous recevez cet email parce que vous êtes membre d\'une famille sur',
    en: 'You are receiving this email because you are a member of a family on',
    nl: 'U ontvangt deze e-mail omdat u lid bent van een gezin op'
  }[language];

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.appName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #4F46E5;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    h1 {
      color: #4F46E5;
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .content {
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4F46E5;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 500;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .info-box {
      background-color: #f0f9ff;
      border-left: 4px solid #4F46E5;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${options.appName}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>${footer} ${options.appName}.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Draft Plan Created Template
 */
export function getDraftPlanCreatedTemplate(
  data: Extract<NotificationData, { type: 'DRAFT_PLAN_CREATED' }>,
  language: Language,
  options: TemplateOptions
): EmailTemplate {
  const weekDate = data.weekStartDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : 'nl-NL');
  const planUrl = `${options.appUrl}/plan/${data.planId}`;

  const translations = {
    fr: {
      subject: `📅 Nouveau plan de repas pour la semaine du ${weekDate}`,
      greeting: 'Bonjour,',
      title: 'Nouveau plan de repas créé !',
      message: `Un nouveau plan de repas a été créé pour votre famille "${data.familyName}" par ${data.createdBy}.`,
      week: `Semaine du : ${weekDate}`,
      action: 'Le plan est actuellement en brouillon. Vous pouvez maintenant :',
      actions: [
        'Consulter et modifier les repas prévus',
        'Voter pour vos repas préférés',
        'Ajouter des invités',
        'Marquer votre présence pour chaque repas'
      ],
      button: 'Voir le plan de la semaine',
      closing: 'Bon appétit !'
    },
    en: {
      subject: `📅 New meal plan for the week of ${weekDate}`,
      greeting: 'Hello,',
      title: 'New meal plan created!',
      message: `A new meal plan has been created for your family "${data.familyName}" by ${data.createdBy}.`,
      week: `Week of: ${weekDate}`,
      action: 'The plan is currently in draft status. You can now:',
      actions: [
        'View and modify planned meals',
        'Vote for your favorite meals',
        'Add guests',
        'Mark your attendance for each meal'
      ],
      button: 'View weekly plan',
      closing: 'Enjoy your meals!'
    },
    nl: {
      subject: `📅 Nieuw maaltijdplan voor de week van ${weekDate}`,
      greeting: 'Hallo,',
      title: 'Nieuw maaltijdplan aangemaakt!',
      message: `Een nieuw maaltijdplan is aangemaakt voor uw gezin "${data.familyName}" door ${data.createdBy}.`,
      week: `Week van: ${weekDate}`,
      action: 'Het plan is momenteel in conceptstatus. U kunt nu:',
      actions: [
        'Geplande maaltijden bekijken en wijzigen',
        'Stemmen voor uw favoriete maaltijden',
        'Gasten toevoegen',
        'Uw aanwezigheid markeren voor elke maaltijd'
      ],
      button: 'Bekijk weekplan',
      closing: 'Eet smakelijk!'
    }
  };

  const t = translations[language];

  const html = getBaseEmailTemplate(
    `
      <h2>${t.title}</h2>
      <p>${t.greeting}</p>
      <p>${t.message}</p>

      <div class="info-box">
        <strong>${t.week}</strong>
      </div>

      <p>${t.action}</p>
      <ul>
        ${t.actions.map(action => `<li>${action}</li>`).join('')}
      </ul>

      <a href="${planUrl}" class="button">${t.button}</a>

      <p>${t.closing}</p>
    `,
    language,
    options
  );

  const text = `
${t.greeting}

${t.title}

${t.message}

${t.week}

${t.action}
${t.actions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

${t.button}: ${planUrl}

${t.closing}
  `.trim();

  return {
    subject: t.subject,
    html,
    text
  };
}

/**
 * Plan Deadline Reminder Template
 */
export function getPlanDeadlineReminderTemplate(
  data: Extract<NotificationData, { type: 'PLAN_DEADLINE_REMINDER' }>,
  language: Language,
  options: TemplateOptions
): EmailTemplate {
  const weekDate = data.weekStartDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : 'nl-NL');
  const deadlineDate = data.deadlineDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : 'nl-NL');
  const planUrl = `${options.appUrl}/plan/${data.planId}`;

  const translations = {
    fr: {
      subject: `⏰ Rappel : Validez votre plan de repas avant le ${deadlineDate}`,
      greeting: 'Bonjour,',
      title: 'Rappel de validation du plan',
      message: `Le plan de repas pour la semaine du ${weekDate} de votre famille "${data.familyName}" doit être validé.`,
      deadline: `Date limite : ${deadlineDate}`,
      action: 'Veuillez valider le plan avant la date limite pour :',
      actions: [
        'Générer automatiquement la liste de courses',
        'Permettre à tous les membres de voir les repas confirmés',
        'Éviter les changements de dernière minute'
      ],
      button: 'Valider le plan',
      closing: 'Merci !'
    },
    en: {
      subject: `⏰ Reminder: Validate your meal plan before ${deadlineDate}`,
      greeting: 'Hello,',
      title: 'Plan validation reminder',
      message: `The meal plan for the week of ${weekDate} for your family "${data.familyName}" needs to be validated.`,
      deadline: `Deadline: ${deadlineDate}`,
      action: 'Please validate the plan before the deadline to:',
      actions: [
        'Automatically generate the shopping list',
        'Allow all members to see confirmed meals',
        'Avoid last-minute changes'
      ],
      button: 'Validate plan',
      closing: 'Thank you!'
    },
    nl: {
      subject: `⏰ Herinnering: Valideer uw maaltijdplan vóór ${deadlineDate}`,
      greeting: 'Hallo,',
      title: 'Planvalidatie herinnering',
      message: `Het maaltijdplan voor de week van ${weekDate} voor uw gezin "${data.familyName}" moet worden gevalideerd.`,
      deadline: `Deadline: ${deadlineDate}`,
      action: 'Valideer het plan vóór de deadline om:',
      actions: [
        'Automatisch de boodschappenlijst te genereren',
        'Alle leden bevestigde maaltijden te laten zien',
        'Last-minute wijzigingen te voorkomen'
      ],
      button: 'Valideer plan',
      closing: 'Dank u!'
    }
  };

  const t = translations[language];

  const html = getBaseEmailTemplate(
    `
      <h2>${t.title}</h2>
      <p>${t.greeting}</p>
      <p>${t.message}</p>

      <div class="info-box">
        <strong>${t.deadline}</strong>
      </div>

      <p>${t.action}</p>
      <ul>
        ${t.actions.map(action => `<li>${action}</li>`).join('')}
      </ul>

      <a href="${planUrl}" class="button">${t.button}</a>

      <p>${t.closing}</p>
    `,
    language,
    options
  );

  const text = `
${t.greeting}

${t.title}

${t.message}

${t.deadline}

${t.action}
${t.actions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

${t.button}: ${planUrl}

${t.closing}
  `.trim();

  return {
    subject: t.subject,
    html,
    text
  };
}

/**
 * Get email template for any notification type
 */
export function getEmailTemplate(
  data: NotificationData,
  language: Language,
  options: TemplateOptions
): EmailTemplate {
  switch (data.type) {
    case 'DRAFT_PLAN_CREATED':
      return getDraftPlanCreatedTemplate(data, language, options);
    case 'PLAN_DEADLINE_REMINDER':
      return getPlanDeadlineReminderTemplate(data, language, options);
    // Future notification types can be added here
    default:
      throw new Error(`Unsupported notification type: ${(data as any).type}`);
  }
}
