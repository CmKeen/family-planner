import { Router } from 'express';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate
} from '../controllers/mealScheduleTemplate.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all templates (system + family-specific)
router.get('/families/:familyId/meal-templates', getTemplates);

// Get single template
router.get('/families/:familyId/meal-templates/:templateId', getTemplate);

// Create custom template
router.post('/families/:familyId/meal-templates', createTemplate);

// Update custom template
router.put('/families/:familyId/meal-templates/:templateId', updateTemplate);

// Delete custom template
router.delete('/families/:familyId/meal-templates/:templateId', deleteTemplate);

// Set family default template
router.put('/families/:familyId/default-template', setDefaultTemplate);

export default router;
