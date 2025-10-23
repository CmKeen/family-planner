import { Router } from 'express';
import {
  createSchoolMenu,
  getSchoolMenus,
  updateSchoolMenu,
  deleteSchoolMenu
} from '../controllers/schoolMenu.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createSchoolMenu);
router.get('/family/:familyId', getSchoolMenus);
router.put('/:id', updateSchoolMenu);
router.delete('/:id', deleteSchoolMenu);

export default router;
