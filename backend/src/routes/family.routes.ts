import { Router } from 'express';
import {
  createFamily,
  getFamilies,
  getFamily,
  updateFamily,
  deleteFamily,
  addMember,
  updateMember,
  removeMember,
  updateDietProfile
} from '../controllers/family.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All family routes require authentication
router.use(authenticate);

router.post('/', createFamily);
router.get('/', getFamilies);
router.get('/:id', getFamily);
router.put('/:id', updateFamily);
router.delete('/:id', deleteFamily);

// Members
router.post('/:id/members', addMember);
router.put('/:familyId/members/:memberId', updateMember);
router.delete('/:familyId/members/:memberId', removeMember);

// Diet profile
router.put('/:id/diet-profile', updateDietProfile);

export default router;
