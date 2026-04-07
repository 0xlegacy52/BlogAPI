import { Router, type IRouter } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { successResponse } from "../utils/ApiResponse.js";
import * as commentService from "../services/comment.service.js";

const router: IRouter = Router();

/**
 * @swagger
 * /v1/posts/{id}/comments:
 *   get:
 *     tags: [Comments]
 *     summary: List comments for a post
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated comments
 *       404:
 *         description: Post not found
 */
router.get("/v1/posts/:id/comments", async (req, res, next) => {
  try {
    const result = await commentService.listComments(
      req.params.id,
      req.query as Record<string, string>,
    );
    res.json(
      successResponse(
        result.comments,
        "Comments retrieved successfully",
        result.meta,
      ),
    );
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/posts/{id}/comments:
 *   post:
 *     tags: [Comments]
 *     summary: Create a comment on a post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *               parentId: { type: string, description: "ID of parent comment for replies" }
 *     responses:
 *       201:
 *         description: Comment created
 *       404:
 *         description: Post not found
 */
router.post(
  "/v1/posts/:id/comments",
  authenticate,
  [body("content").notEmpty().withMessage("Content is required")],
  validate,
  async (req, res, next) => {
    try {
      const comment = await commentService.createComment(
        req.params.id,
        req.user!.userId,
        req.body,
      );
      res
        .status(201)
        .json(successResponse(comment, "Comment created successfully"));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /v1/comments/{id}:
 *   put:
 *     tags: [Comments]
 *     summary: Update own comment
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *     responses:
 *       200:
 *         description: Comment updated
 *       403:
 *         description: Not your comment
 */
router.put(
  "/v1/comments/:id",
  authenticate,
  [body("content").notEmpty().withMessage("Content is required")],
  validate,
  async (req, res, next) => {
    try {
      const comment = await commentService.updateComment(
        req.params.id,
        req.user!.userId,
        req.body,
      );
      res.json(successResponse(comment, "Comment updated successfully"));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /v1/comments/{id}:
 *   delete:
 *     tags: [Comments]
 *     summary: Delete a comment
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Comment deleted
 *       403:
 *         description: Not authorized
 */
router.delete("/v1/comments/:id", authenticate, async (req, res, next) => {
  try {
    await commentService.deleteComment(
      req.params.id,
      req.user!.userId,
      req.user!.role,
    );
    res.json(successResponse(null, "Comment deleted successfully"));
  } catch (err) {
    next(err);
  }
});

export default router;
