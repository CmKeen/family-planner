import { Router } from 'express';
import {
  createWeeklyPlan,
  getWeeklyPlans,
  getWeeklyPlan,
  generateAutoPlan,
  generateExpressPlan,
  updateMeal,
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
import { authenticate } from '../middleware/auth';
import { intensiveOperationLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

router.post('/', createWeeklyPlan);
router.get('/family/:familyId', getWeeklyPlans);
router.get('/:id', getWeeklyPlan);
// Rate limit intensive operations (plan generation)
router.post('/:familyId/generate', intensiveOperationLimiter, generateAutoPlan);
router.post('/:familyId/generate-express', intensiveOperationLimiter, generateExpressPlan);
router.put('/:planId/meals/:mealId', updateMeal);
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

export default router;
