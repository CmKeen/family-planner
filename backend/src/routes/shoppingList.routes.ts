import { Router } from 'express';
import {
  generateShoppingList,
  getShoppingList,
  updateShoppingItem,
  toggleItemChecked
} from '../controllers/shoppingList.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/generate/:weeklyPlanId', generateShoppingList);
router.get('/:weeklyPlanId', getShoppingList);
router.put('/items/:itemId', updateShoppingItem);
router.post('/items/:itemId/toggle', toggleItemChecked);

export default router;
