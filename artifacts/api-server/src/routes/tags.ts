import { Router, type IRouter } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";
import { successResponse } from "../utils/ApiResponse.js";
import * as tagService from "../services/tag.service.js";

const router: IRouter = Router();

/**
 * @swagger
 * /v1/tags:
 *   get:
 *     tags: [Tags]
 *     summary: List all tags
 *     responses:
 *       200:
 *         description: Tags list
 */
router.get("/v1/tags", async (_req, res, next) => {
  try {
    const tags = await tagService.listTags();
    res.json(successResponse(tags, "Tags retrieved successfully"));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/tags:
 *   post:
 *     tags: [Tags]
 *     summary: Create a tag (admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Tag created
 *       403:
 *         description: Admin only
 */
router.post(
  "/v1/tags",
  authenticate,
  requireAdmin,
  [body("name").notEmpty().withMessage("Tag name is required")],
  validate,
  async (req, res, next) => {
    try {
      const tag = await tagService.createTag(req.body);
      res.status(201).json(successResponse(tag, "Tag created successfully"));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /v1/tags/{id}:
 *   put:
 *     tags: [Tags]
 *     summary: Update a tag (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Tag updated
 */
router.put(
  "/v1/tags/:id",
  authenticate,
  requireAdmin,
  [body("name").optional().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const tag = await tagService.updateTag(req.params.id, req.body);
      res.json(successResponse(tag, "Tag updated successfully"));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /v1/tags/{id}:
 *   delete:
 *     tags: [Tags]
 *     summary: Delete a tag (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tag deleted
 */
router.delete(
  "/v1/tags/:id",
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      await tagService.deleteTag(req.params.id);
      res.json(successResponse(null, "Tag deleted successfully"));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
