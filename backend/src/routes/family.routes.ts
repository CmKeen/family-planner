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
import {
  sendInvitation,
  getReceivedInvitations,
  getSentInvitations,
  acceptInvitation,
  declineInvitation,
  cancelInvitation
} from '../controllers/invitation.controller';
import { createCustomComponent } from '../controllers/foodComponent.controller';
import { authenticate } from '../middleware/auth';
import { ensureFamilyMember, requireRole } from '../middleware/familyAuth';

const router = Router();

// All family routes require authentication
router.use(authenticate);

router.post('/', createFamily);
router.get('/', getFamilies);

// Invitations - received by current user (global route)
router.get('/invitations/received', getReceivedInvitations);

router.get('/:id', ensureFamilyMember, getFamily);
router.put('/:id', ensureFamilyMember, requireRole('ADMIN'), updateFamily);
router.delete('/:id', ensureFamilyMember, requireRole('ADMIN'), deleteFamily);

// Members - All require family membership verification
router.post('/:id/members', ensureFamilyMember, addMember);
router.put('/:familyId/members/:memberId', ensureFamilyMember, updateMember);
router.delete('/:familyId/members/:memberId', ensureFamilyMember, removeMember);

// Diet profile
router.put('/:id/diet-profile', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), updateDietProfile);

// Custom food components
router.post('/:familyId/components', ensureFamilyMember, createCustomComponent);

// Invitations - family-specific routes
router.post('/:id/invitations', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), sendInvitation);
router.get('/:id/invitations/sent', ensureFamilyMember, getSentInvitations);
router.delete('/:familyId/invitations/:invitationId', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), cancelInvitation);

// Invitation actions (accept/decline)
router.post('/invitations/:id/accept', acceptInvitation);
router.post('/invitations/:id/decline', declineInvitation);

export default router;
