import { Router } from 'express';
import {
  createRecipe,
  getRecipes,
  getRecipe,
  updateRecipe,
  deleteRecipe,
  getWeeklyCatalog,
  toggleFavorite,
  submitFeedback
} from '../controllers/recipe.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/', createRecipe);
router.get('/', getRecipes);
router.get('/catalog/:familyId', getWeeklyCatalog);
router.get('/:id', getRecipe);
router.put('/:id', updateRecipe);
router.delete('/:id', deleteRecipe);
router.post('/:id/favorite', toggleFavorite);
router.post('/:id/feedback', submitFeedback);

export default router;
