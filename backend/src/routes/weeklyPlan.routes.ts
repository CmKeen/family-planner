import { Router } from 'express';
import {
  createWeeklyPlan,
  getWeeklyPlans,
  getWeeklyPlan,
  generateAutoPlan,
  generateExpressPlan,
  updateMeal,
  adjustMealPortions,
  swapMeal,
  lockMeal,
  addAttendance,
  addGuests,
  addVote,
  addWish,
  validatePlan,
  addMeal,
  removeMeal,
  restoreMeal,
  switchTemplate,
  saveComponentMealAsRecipe
} from '../controllers/weeklyPlan.controller';
import {
  addComponentToMeal,
  swapMealComponent,
  removeMealComponent,
  updateMealComponent
} from '../controllers/mealComponent.controller';
import {
  getPlanAuditLog,
  getMealAuditLog
} from '../controllers/auditLog.controller';
import { authenticate } from '../middleware/auth';
import { ensureFamilyMember, requireRole } from '../middleware/familyAuth';
import { intensiveOperationLimiter } from '../middleware/rateLimiter';
import mealCommentRoutes from './mealComment.routes.js';

const router = Router();

router.use(authenticate);

router.post('/', createWeeklyPlan);
router.get('/family/:familyId', ensureFamilyMember, getWeeklyPlans);
router.get('/:id', getWeeklyPlan);

// Rate limit intensive operations (plan generation) - All members can generate
router.post('/:familyId/generate', ensureFamilyMember, intensiveOperationLimiter, generateAutoPlan);
router.post('/:familyId/generate-express', ensureFamilyMember, intensiveOperationLimiter, generateExpressPlan);

// Meal operations - ADMIN/PARENT only for modifications
router.put('/:planId/meals/:mealId', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), updateMeal);
router.post('/:planId/meals/:mealId/adjust-portions', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), adjustMealPortions);
router.post('/:planId/meals/:mealId/swap', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), swapMeal);
router.post('/:planId/meals/:mealId/lock', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), lockMeal);

// All members can add attendance/guests/votes/wishes
router.post('/:planId/meals/:mealId/attendance', ensureFamilyMember, addAttendance);
router.post('/:planId/meals/:mealId/guests', ensureFamilyMember, addGuests);
router.post('/:planId/meals/:mealId/vote', ensureFamilyMember, addVote);
router.post('/:planId/wishes', ensureFamilyMember, addWish);

// Only ADMIN/PARENT can validate plan
router.post('/:planId/validate', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), validatePlan);

// Meal component operations (component-based meals) - ADMIN/PARENT only
router.post('/:planId/meals/:mealId/components', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), addComponentToMeal);
router.put('/:planId/meals/:mealId/components/:componentId/swap', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), swapMealComponent);
router.patch('/:planId/meals/:mealId/components/:componentId', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), updateMealComponent);
router.delete('/:planId/meals/:mealId/components/:componentId', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), removeMealComponent);
router.post('/:planId/meals/:mealId/save-as-recipe', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), saveComponentMealAsRecipe);

// Meal schedule template operations for draft plans - ADMIN/PARENT only
router.post('/:planId/meals', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), addMeal);
router.delete('/:planId/meals/:mealId', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), removeMeal);
router.post('/:planId/meals/:mealId/restore', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), restoreMeal);
router.put('/:planId/template', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), switchTemplate);

// Meal comments (nested routes)
router.use('/:planId/meals/:mealId/comments', mealCommentRoutes);

/**
 * @swagger
 * /api/weekly-plans/{planId}/audit-log:
 *   get:
 *     summary: Get audit log for a weekly plan
 *     description: Returns complete change history for the plan. Requires permission to view audit log (canViewAuditLog)
 *     tags: [Audit Trail]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: memberId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific member
 *       - in: query
 *         name: changeType
 *         schema:
 *           type: string
 *           enum: [PLAN_CREATED, PLAN_VALIDATED, PLAN_LOCKED, MEAL_ADDED, MEAL_REMOVED, MEAL_RECIPE_CHANGED, MEAL_PORTIONS_CHANGED, MEAL_LOCKED, MEAL_UNLOCKED, MEAL_COMMENT_ADDED, MEAL_COMMENT_EDITED, MEAL_COMMENT_DELETED]
 *         description: Filter by change type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of entries to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of entries to skip
 *     responses:
 *       200:
 *         description: Audit log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PlanChangeLog'
 *                     total:
 *                       type: integer
 *       403:
 *         description: Not authorized to view audit log
 */
router.get('/:planId/audit-log', ensureFamilyMember, getPlanAuditLog);

/**
 * @swagger
 * /api/weekly-plans/{planId}/meals/{mealId}/audit-log:
 *   get:
 *     summary: Get audit log for a specific meal
 *     description: Returns change history for a specific meal only
 *     tags: [Audit Trail]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: memberId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific member
 *       - in: query
 *         name: changeType
 *         schema:
 *           type: string
 *         description: Filter by change type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Meal audit log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PlanChangeLog'
 *                     total:
 *                       type: integer
 */
router.get('/:planId/meals/:mealId/audit-log', ensureFamilyMember, getMealAuditLog);

export default router;
