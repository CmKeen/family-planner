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
import { intensiveOperationLimiter } from '../middleware/rateLimiter';
import mealCommentRoutes from './mealComment.routes.js';

const router = Router();

router.use(authenticate);

router.post('/', createWeeklyPlan);
router.get('/family/:familyId', getWeeklyPlans);
router.get('/:id', getWeeklyPlan);
// Rate limit intensive operations (plan generation)
router.post('/:familyId/generate', intensiveOperationLimiter, generateAutoPlan);
router.post('/:familyId/generate-express', intensiveOperationLimiter, generateExpressPlan);
router.put('/:planId/meals/:mealId', updateMeal);
router.post('/:planId/meals/:mealId/adjust-portions', adjustMealPortions);
router.post('/:planId/meals/:mealId/swap', swapMeal);
router.post('/:planId/meals/:mealId/lock', lockMeal);
router.post('/:planId/meals/:mealId/attendance', addAttendance);
router.post('/:planId/meals/:mealId/guests', addGuests);
router.post('/:planId/meals/:mealId/vote', addVote);
router.post('/:planId/wishes', addWish);
router.post('/:planId/validate', validatePlan);

// Meal component operations (component-based meals)
router.post('/:planId/meals/:mealId/components', addComponentToMeal); // Add component to meal
router.put('/:planId/meals/:mealId/components/:componentId/swap', swapMealComponent); // Swap component
router.patch('/:planId/meals/:mealId/components/:componentId', updateMealComponent); // Update component
router.delete('/:planId/meals/:mealId/components/:componentId', removeMealComponent); // Remove component
router.post('/:planId/meals/:mealId/save-as-recipe', saveComponentMealAsRecipe); // Save component meal as recipe

// Meal schedule template operations for draft plans
router.post('/:planId/meals', addMeal); // Add single meal
router.delete('/:planId/meals/:mealId', removeMeal); // Remove meal
router.put('/:planId/template', switchTemplate); // Switch to different template

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
router.get('/:planId/audit-log', getPlanAuditLog);

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
router.get('/:planId/meals/:mealId/audit-log', getMealAuditLog);

export default router;
