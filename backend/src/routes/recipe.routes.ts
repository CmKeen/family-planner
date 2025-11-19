import { Router } from 'express';
import {
  createRecipe,
  createComponentBasedRecipe,
  getRecipes,
  getRecipe,
  updateRecipe,
  deleteRecipe,
  getWeeklyCatalog,
  toggleFavorite,
  submitFeedback
} from '../controllers/recipe.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createRecipe);
router.post('/component-based', createComponentBasedRecipe);
router.get('/', getRecipes);
router.get('/catalog/:familyId', getWeeklyCatalog);
router.get('/:id', getRecipe);
router.put('/:id', updateRecipe);
router.delete('/:id', deleteRecipe);
router.post('/:id/favorite', toggleFavorite);
router.post('/:id/feedback', submitFeedback);

export default router;
