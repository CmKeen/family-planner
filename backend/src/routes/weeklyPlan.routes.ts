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
  validatePlan
} from '../controllers/weeklyPlan.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createWeeklyPlan);
router.get('/family/:familyId', getWeeklyPlans);
router.get('/:id', getWeeklyPlan);
router.post('/:familyId/generate', generateAutoPlan);
router.post('/:familyId/generate-express', generateExpressPlan);
router.put('/:planId/meals/:mealId', updateMeal);
router.post('/:planId/meals/:mealId/swap', swapMeal);
router.post('/:planId/meals/:mealId/lock', lockMeal);
router.post('/:planId/meals/:mealId/attendance', addAttendance);
router.post('/:planId/meals/:mealId/guests', addGuests);
router.post('/:planId/meals/:mealId/vote', addVote);
router.post('/:planId/wishes', addWish);
router.post('/:planId/validate', validatePlan);

export default router;
