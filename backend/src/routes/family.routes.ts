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
} from '../controllers/family.controller.js';
import {
  sendInvitation,
  getReceivedInvitations,
  getSentInvitations,
  acceptInvitation,
  declineInvitation,
  cancelInvitation
} from '../controllers/invitation.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All family routes require authentication
router.use(authenticate);

router.post('/', createFamily);
router.get('/', getFamilies);

// Invitations - received by current user (global route)
router.get('/invitations/received', getReceivedInvitations);

router.get('/:id', getFamily);
router.put('/:id', updateFamily);
router.delete('/:id', deleteFamily);

// Members
router.post('/:id/members', addMember);
router.put('/:familyId/members/:memberId', updateMember);
router.delete('/:familyId/members/:memberId', removeMember);

// Diet profile
router.put('/:id/diet-profile', updateDietProfile);

// Invitations - family-specific routes
router.post('/:id/invitations', sendInvitation);
router.get('/:id/invitations/sent', getSentInvitations);
router.delete('/:familyId/invitations/:invitationId', cancelInvitation);

// Invitation actions (accept/decline)
router.post('/invitations/:id/accept', acceptInvitation);
router.post('/invitations/:id/decline', declineInvitation);

export default router;
