import { Router } from 'express';
import {
  getAllComponents,
  createCustomComponent,
  updateComponent,
  deleteComponent
} from '../controllers/foodComponent.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Get all components (system + family custom)
router.get('/', getAllComponents);

// Update a component (only custom components)
router.put('/:id', updateComponent);

// Delete a component (only custom components)
router.delete('/:id', deleteComponent);

export default router;
