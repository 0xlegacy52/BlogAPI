import { Router, type IRouter } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.middleware.js";
import {
  authenticate,
  optionalAuthenticate,
} from "../middleware/auth.middleware.js";
import { successResponse } from "../utils/ApiResponse.js";
import * as postService from "../services/post.service.js";

const router: IRouter = Router();

/**
 * @swagger
 * /v1/posts:
 *   get:
 *     tags: [Posts]
 *     summary: List posts with filters and pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [DRAFT, PUBLISHED, ARCHIVED] }
 *       - in: query
 *         name: tagSlug
 *         schema: { type: string }
 *       - in: query
 *         name: authorId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [latest, oldest, views] }
 *     responses:
 *       200:
 *         description: Paginated posts list
 */
router.get("/v1/posts", optionalAuthenticate, async (req, res, next) => {
  try {
    const result = await postService.listPosts(
      req.query as Record<string, string>,
    );
    res.json(
      successResponse(result.posts, "Posts retrieved successfully", result.meta),
    );
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/posts:
 *   post:
 *     tags: [Posts]
 *     summary: Create a new post
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               excerpt: { type: string }
 *               coverImageUrl: { type: string }
 *               status: { type: string, enum: [DRAFT, PUBLISHED, ARCHIVED] }
 *               tagIds: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Post created
 */
router.post(
  "/v1/posts",
  authenticate,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("content").notEmpty().withMessage("Content is required"),
    body("status")
      .optional()
      .isIn(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    body("tagIds").optional().isArray(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const post = await postService.createPost(req.user!.userId, req.body);
      res.status(201).json(successResponse(post, "Post created successfully"));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /v1/posts/{slug}:
 *   get:
 *     tags: [Posts]
 *     summary: Get post by slug (increments view count)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post detail
 *       404:
 *         description: Post not found
 */
router.get("/v1/posts/:slug", async (req, res, next) => {
  try {
    const post = await postService.getPostBySlug(req.params.slug);
    res.json(successResponse(post, "Post retrieved successfully"));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/posts/{id}:
 *   put:
 *     tags: [Posts]
 *     summary: Update a post
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
 *               title: { type: string }
 *               content: { type: string }
 *               excerpt: { type: string }
 *               status: { type: string }
 *               tagIds: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Post updated
 *       403:
 *         description: Not authorized
 */
router.put(
  "/v1/posts/:id",
  authenticate,
  [
    body("title").optional().notEmpty(),
    body("content").optional().notEmpty(),
    body("status").optional().isIn(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    body("tagIds").optional().isArray(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const post = await postService.updatePost(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        req.body,
      );
      res.json(successResponse(post, "Post updated successfully"));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /v1/posts/{id}:
 *   delete:
 *     tags: [Posts]
 *     summary: Delete a post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post deleted
 *       403:
 *         description: Not authorized
 */
router.delete("/v1/posts/:id", authenticate, async (req, res, next) => {
  try {
    await postService.deletePost(
      req.params.id,
      req.user!.userId,
      req.user!.role,
    );
    res.json(successResponse(null, "Post deleted successfully"));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/posts/{id}/publish:
 *   patch:
 *     tags: [Posts]
 *     summary: Publish a post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post published
 */
router.patch("/v1/posts/:id/publish", authenticate, async (req, res, next) => {
  try {
    const post = await postService.publishPost(
      req.params.id,
      req.user!.userId,
      req.user!.role,
    );
    res.json(successResponse(post, "Post published successfully"));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/posts/{id}/archive:
 *   patch:
 *     tags: [Posts]
 *     summary: Archive a post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post archived
 */
router.patch("/v1/posts/:id/archive", authenticate, async (req, res, next) => {
  try {
    const post = await postService.archivePost(
      req.params.id,
      req.user!.userId,
      req.user!.role,
    );
    res.json(successResponse(post, "Post archived successfully"));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/posts/{id}/like:
 *   post:
 *     tags: [Posts]
 *     summary: Toggle like on a post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Like toggled
 */
router.post("/v1/posts/:id/like", authenticate, async (req, res, next) => {
  try {
    const result = await postService.toggleLike(
      req.params.id,
      req.user!.userId,
    );
    res.json(
      successResponse(result, result.liked ? "Post liked" : "Like removed"),
    );
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /v1/posts/{id}/bookmark:
 *   post:
 *     tags: [Posts]
 *     summary: Toggle bookmark on a post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bookmark toggled
 */
router.post("/v1/posts/:id/bookmark", authenticate, async (req, res, next) => {
  try {
    const result = await postService.toggleBookmark(
      req.params.id,
      req.user!.userId,
    );
    res.json(
      successResponse(
        result,
        result.bookmarked ? "Post bookmarked" : "Bookmark removed",
      ),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
