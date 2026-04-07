import { Router, type IRouter } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";
import {
  uploadAvatar,
  handleMulterError,
} from "../middleware/upload.middleware.js";
import { successResponse } from "../utils/ApiResponse.js";
import * as userService from "../services/user.service.js";

const router: IRouter = Router();

/**
 * @swagger
 * /v1/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Users list
 *       403:
 *         description: Admin only
 */
router.get(
  "/v1/users",
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const result = await userService.listUsers(
        req.query as Record<string, string>,
      );
      res.json(successResponse(result.users, "Users retrieved", result.meta));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /v1/users/me:
 *   put:
 *     tags: [Users]
 *     summary: Update own profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               bio: { type: string }
 *               username: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put(
  "/v1/users/me",
  authenticate,
  [
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("username")
      .optional()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/),
    body("bio").optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await userService.updateUser(req.user!.userId, req.body);
      res.json(successResponse(user, "Profile updated successfully"));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /v1/users/me/avatar:
 *   post:
 *     tags: [Users]
 *     summary: Upload avatar image
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded
 */
router.post(
  "/v1/users/me/avatar",
  authenticate,
  (req, res, next) => {
    uploadAvatar(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return next(
          new Error("No file uploaded") as unknown as Parameters<typeof next>[0],
        );
      }
      const user = await userService.uploadAvatar(
        req.user!.userId,
        req.file.buffer,
        req.file.mimetype,
      );
      res.json(successResponse(user, "Avatar uploaded successfully"));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /v1/users/{username}:
 *   get:
 *     tags: [Users]
 *     summary: Get public user profile by username
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Public user profile
 *       404:
 *         description: User not found
 */
router.get("/v1/users/:username", async (req, res, next) => {
  try {
    const user = await userService.getUserByUsername(req.params.username);
    res.json(successResponse(user, "User profile retrieved"));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User deleted
 *       403:
 *         description: Admin only
 */
router.delete(
  "/v1/users/:id",
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      await userService.deleteUser(req.params.id);
      res.json(successResponse(null, "User deleted successfully"));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
