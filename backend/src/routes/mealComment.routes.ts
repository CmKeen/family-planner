import { Router } from 'express';
import {
  getComments,
  addComment,
  updateComment,
  deleteComment
} from '../controllers/mealComment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { enforceCutoff } from '../middleware/cutoffEnforcement.js';

const router = Router({ mergeParams: true }); // mergeParams allows access to parent route params

router.use(authenticate);

/**
 * @route   GET /api/weekly-plans/:planId/meals/:mealId/comments
 * @desc    Get all comments for a meal
 * @access  Private (Family members only)
 */
router.get('/', getComments);

/**
 * @route   POST /api/weekly-plans/:planId/meals/:mealId/comments
 * @desc    Add a comment to a meal
 * @access  Private (Family members only, respects cutoff if allowCommentsAfterCutoff is false)
 */
router.post('/', enforceCutoff({ allowComments: true }), addComment);

/**
 * @route   PUT /api/weekly-plans/:planId/meals/:mealId/comments/:commentId
 * @desc    Update a comment
 * @access  Private (Own comments only, or ADMIN/PARENT)
 */
router.put('/:commentId', enforceCutoff({ allowComments: true }), updateComment);

/**
 * @route   DELETE /api/weekly-plans/:planId/meals/:mealId/comments/:commentId
 * @desc    Delete a comment
 * @access  Private (Own comments only, or ADMIN/PARENT)
 */
router.delete('/:commentId', deleteComment);

export default router;
