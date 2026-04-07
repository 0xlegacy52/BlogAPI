import { Router, type IRouter } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { successResponse } from "../utils/ApiResponse.js";
import * as authService from "../services/auth.service.js";
import { getUserById } from "../services/user.service.js";
import { sanitizeUser } from "../services/auth.service.js";

const router: IRouter = Router();

/**
 * @swagger
 * /v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               username: { type: string }
 *               password: { type: string, minLength: 8 }
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email or username already in use
 */
router.post(
  "/v1/auth/register",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("username")
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage("Username must be 3-30 chars, alphanumeric or underscore"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("name").notEmpty().withMessage("Name is required"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(successResponse(result, "User registered successfully"));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/v1/auth/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await authService.login(req.body);
      res.json(successResponse(result, "Login successful"));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Tokens refreshed
 *       401:
 *         description: Invalid refresh token
 */
router.post(
  "/v1/auth/refresh",
  [body("refreshToken").notEmpty().withMessage("refreshToken is required")],
  validate,
  async (req, res, next) => {
    try {
      const result = await authService.refreshTokens(req.body.refreshToken);
      res.json(successResponse(result, "Tokens refreshed successfully"));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and revoke refresh token
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post(
  "/v1/auth/logout",
  authenticate,
  [body("refreshToken").notEmpty().withMessage("refreshToken is required")],
  validate,
  async (req, res, next) => {
    try {
      await authService.logout(req.body.refreshToken);
      res.json(successResponse(null, "Logged out successfully"));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Unauthorized
 */
router.get("/v1/auth/me", authenticate, async (req, res, next) => {
  try {
    const user = await getUserById(req.user!.userId);
    res.json(successResponse(sanitizeUser(user), "Current user retrieved"));
  } catch (err) {
    next(err);
  }
});

export default router;
