import prisma from '../lib/prisma.js';
import { ChangeType } from '@prisma/client';

/**
 * Utility to log changes to meal plans
 */

interface LogChangeOptions {
  weeklyPlanId: string;
  mealId?: string;
  memberId?: string;
  changeType: ChangeType;
  description: string;
  descriptionEn?: string;
  descriptionNl?: string;
  oldValue?: any;
  newValue?: any;
}

/**
 * Log a change to the audit trail
 */
export async function logChange(options: LogChangeOptions): Promise<void> {
  const {
    weeklyPlanId,
    mealId,
    memberId,
    changeType,
    description,
    descriptionEn,
    descriptionNl,
    oldValue,
    newValue
  } = options;

  await prisma.planChangeLog.create({
    data: {
      weeklyPlanId,
      mealId: mealId || null,
      memberId: memberId || null,
      changeType,
      description,
      descriptionEn: descriptionEn || null,
      descriptionNl: descriptionNl || null,
      oldValue: oldValue || null,
      newValue: newValue || null
    }
  });
}

/**
 * Helper to generate change descriptions
 */
export function generateChangeDescription(
  changeType: ChangeType,
  data: {
    memberName?: string;
    recipeName?: string;
    oldRecipeName?: string;
    newRecipeName?: string;
    dayOfWeek?: string;
    mealType?: string;
    oldPortions?: number;
    newPortions?: number;
    oldStatus?: string;
    newStatus?: string;
  }
): { description: string; descriptionEn: string; descriptionNl: string } {
  const { memberName, recipeName, oldRecipeName, newRecipeName, dayOfWeek, mealType, oldPortions, newPortions, oldStatus, newStatus } = data;

  switch (changeType) {
    case 'PLAN_CREATED':
      return {
        description: `${memberName} a créé le plan`,
        descriptionEn: `${memberName} created the plan`,
        descriptionNl: `${memberName} heeft het plan aangemaakt`
      };

    case 'PLAN_STATUS_CHANGED':
      return {
        description: `${memberName} a changé le statut de ${oldStatus} à ${newStatus}`,
        descriptionEn: `${memberName} changed status from ${oldStatus} to ${newStatus}`,
        descriptionNl: `${memberName} heeft de status gewijzigd van ${oldStatus} naar ${newStatus}`
      };

    case 'MEAL_ADDED':
      return {
        description: `${memberName} a ajouté ${mealType} pour ${dayOfWeek}`,
        descriptionEn: `${memberName} added ${mealType} for ${dayOfWeek}`,
        descriptionNl: `${memberName} heeft ${mealType} toegevoegd voor ${dayOfWeek}`
      };

    case 'MEAL_REMOVED':
      return {
        description: `${memberName} a supprimé ${mealType} du ${dayOfWeek}`,
        descriptionEn: `${memberName} removed ${mealType} from ${dayOfWeek}`,
        descriptionNl: `${memberName} heeft ${mealType} verwijderd van ${dayOfWeek}`
      };

    case 'RECIPE_CHANGED':
      return {
        description: `${memberName} a changé la recette de "${oldRecipeName}" à "${newRecipeName}"`,
        descriptionEn: `${memberName} changed recipe from "${oldRecipeName}" to "${newRecipeName}"`,
        descriptionNl: `${memberName} heeft het recept gewijzigd van "${oldRecipeName}" naar "${newRecipeName}"`
      };

    case 'PORTIONS_CHANGED':
      return {
        description: `${memberName} a changé les portions de ${oldPortions} à ${newPortions}`,
        descriptionEn: `${memberName} changed portions from ${oldPortions} to ${newPortions}`,
        descriptionNl: `${memberName} heeft de porties gewijzigd van ${oldPortions} naar ${newPortions}`
      };

    case 'MEAL_LOCKED':
      return {
        description: `${memberName} a verrouillé le repas`,
        descriptionEn: `${memberName} locked the meal`,
        descriptionNl: `${memberName} heeft de maaltijd vergrendeld`
      };

    case 'MEAL_UNLOCKED':
      return {
        description: `${memberName} a déverrouillé le repas`,
        descriptionEn: `${memberName} unlocked the meal`,
        descriptionNl: `${memberName} heeft de maaltijd ontgrendeld`
      };

    case 'COMPONENT_ADDED':
      return {
        description: `${memberName} a ajouté un composant`,
        descriptionEn: `${memberName} added a component`,
        descriptionNl: `${memberName} heeft een component toegevoegd`
      };

    case 'COMPONENT_REMOVED':
      return {
        description: `${memberName} a supprimé un composant`,
        descriptionEn: `${memberName} removed a component`,
        descriptionNl: `${memberName} heeft een component verwijderd`
      };

    case 'COMPONENT_CHANGED':
      return {
        description: `${memberName} a modifié un composant`,
        descriptionEn: `${memberName} modified a component`,
        descriptionNl: `${memberName} heeft een component gewijzigd`
      };

    case 'COMMENT_ADDED':
      return {
        description: `${memberName} a ajouté un commentaire`,
        descriptionEn: `${memberName} added a comment`,
        descriptionNl: `${memberName} heeft een opmerking toegevoegd`
      };

    case 'COMMENT_EDITED':
      return {
        description: `${memberName} a modifié son commentaire`,
        descriptionEn: `${memberName} edited their comment`,
        descriptionNl: `${memberName} heeft hun opmerking bewerkt`
      };

    case 'COMMENT_DELETED':
      return {
        description: `${memberName} a supprimé un commentaire`,
        descriptionEn: `${memberName} deleted a comment`,
        descriptionNl: `${memberName} heeft een opmerking verwijderd`
      };

    case 'VOTE_ADDED':
      return {
        description: `${memberName} a voté pour le repas`,
        descriptionEn: `${memberName} voted on the meal`,
        descriptionNl: `${memberName} heeft gestemd op de maaltijd`
      };

    case 'VOTE_CHANGED':
      return {
        description: `${memberName} a changé son vote`,
        descriptionEn: `${memberName} changed their vote`,
        descriptionNl: `${memberName} heeft hun stem gewijzigd`
      };

    case 'TEMPLATE_SWITCHED':
      return {
        description: `${memberName} a changé le modèle de planification`,
        descriptionEn: `${memberName} switched the planning template`,
        descriptionNl: `${memberName} heeft het planningstemplate gewijzigd`
      };

    case 'CUTOFF_CHANGED':
      return {
        description: `${memberName} a modifié la date limite`,
        descriptionEn: `${memberName} changed the cutoff date`,
        descriptionNl: `${memberName} heeft de uiterste datum gewijzigd`
      };

    case 'ATTENDANCE_CHANGED':
      return {
        description: `${memberName} a modifié sa présence`,
        descriptionEn: `${memberName} changed their attendance`,
        descriptionNl: `${memberName} heeft hun aanwezigheid gewijzigd`
      };

    default:
      return {
        description: `${memberName} a effectué une modification`,
        descriptionEn: `${memberName} made a change`,
        descriptionNl: `${memberName} heeft een wijziging aangebracht`
      };
  }
}
