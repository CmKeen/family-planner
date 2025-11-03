import { Router } from 'express';
import {
  getComments,
  addComment,
  updateComment,
  deleteComment
} from '../controllers/mealComment.controller';
import { authenticate } from '../middleware/auth';
import { enforceCutoff } from '../middleware/cutoffEnforcement';

const router = Router({ mergeParams: true }); // mergeParams allows access to parent route params

router.use(authenticate);

/**
 * @swagger
 * /api/weekly-plans/{planId}/meals/{mealId}/comments:
 *   get:
 *     summary: Get all comments for a meal
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     comments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MealComment'
 */
router.get('/', getComments);

/**
 * @swagger
 * /api/weekly-plans/{planId}/meals/{mealId}/comments:
 *   post:
 *     summary: Add a comment to a meal
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Comment text
 *     responses:
 *       201:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     comment:
 *                       $ref: '#/components/schemas/MealComment'
 *       403:
 *         description: Cutoff deadline passed and comments not allowed
 */
router.post('/', enforceCutoff({ allowComments: true }), addComment);

/**
 * @swagger
 * /api/weekly-plans/{planId}/meals/{mealId}/comments/{commentId}:
 *   put:
 *     summary: Update a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Comment updated
 *       403:
 *         description: Not authorized to update this comment
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Comment deleted
 *       403:
 *         description: Not authorized to delete this comment
 */
router.put('/:commentId', enforceCutoff({ allowComments: true }), updateComment);
router.delete('/:commentId', deleteComment);

export default router;
