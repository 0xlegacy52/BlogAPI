export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "BlogAPI",
    version: "1.0.0",
    description:
      "A professional blogging REST API — production ready. Demonstrates JWT auth, role-based access control (USER/ADMIN), full CRUD for posts/comments/tags, pagination, search, and Cloudinary image uploads.",
    contact: {
      name: "BlogAPI",
    },
  },
  servers: [{ url: "/api", description: "API base path" }],
  tags: [
    { name: "Auth", description: "Authentication — register, login, refresh, logout" },
    { name: "Users", description: "User profiles and avatar management" },
    { name: "Posts", description: "Blog post CRUD, publish/archive, likes, bookmarks" },
    { name: "Comments", description: "Threaded comments on posts" },
    { name: "Tags", description: "Tag management (admin)" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token from /api/v1/auth/login",
      },
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: { type: "object" },
        },
      },
      PaginatedResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: { type: "array", items: { type: "object" } },
          meta: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          username: { type: "string" },
          name: { type: "string" },
          bio: { type: "string", nullable: true },
          avatarUrl: { type: "string", nullable: true },
          role: { type: "string", enum: ["USER", "ADMIN"] },
          isActive: { type: "boolean" },
          emailVerified: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Post: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          authorId: { type: "string", format: "uuid" },
          title: { type: "string" },
          slug: { type: "string" },
          content: { type: "string" },
          excerpt: { type: "string", nullable: true },
          coverImageUrl: { type: "string", nullable: true },
          status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
          viewCount: { type: "integer" },
          readTime: { type: "integer", description: "Estimated reading time in minutes" },
          publishedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Comment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          postId: { type: "string", format: "uuid" },
          authorId: { type: "string", format: "uuid" },
          content: { type: "string" },
          parentId: { type: "string", format: "uuid", nullable: true },
          isEdited: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Tag: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          slug: { type: "string" },
          description: { type: "string", nullable: true },
          postCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthTokens: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
    },
  },
  paths: {
    "/healthz": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: { "200": { description: "Server is healthy" } },
      },
    },
    "/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "username", "password", "name"],
                properties: {
                  email: { type: "string", format: "email", example: "alice@example.com" },
                  username: { type: "string", example: "alice" },
                  password: { type: "string", minLength: 8, example: "securepass123" },
                  name: { type: "string", example: "Alice Smith" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "User registered successfully", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthTokens" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "409": { description: "Email or username already in use", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "alice@example.com" },
                  password: { type: "string", example: "securepass123" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Login successful", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthTokens" } } } },
          "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/v1/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token using refresh token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Tokens refreshed successfully" },
          "401": { description: "Invalid or expired refresh token", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout and revoke refresh token",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Logged out successfully" },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Current user data", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/v1/users": {
      get: {
        tags: ["Users"],
        summary: "List all users (admin only)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: "query", name: "page", schema: { type: "integer", default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", default: 10 } },
          { in: "query", name: "search", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Users list with pagination" },
          "401": { description: "Unauthorized" },
          "403": { description: "Admin access required" },
        },
      },
    },
    "/v1/users/me": {
      put: {
        tags: ["Users"],
        summary: "Update own profile",
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  bio: { type: "string" },
                  username: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Profile updated", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "401": { description: "Unauthorized" },
          "409": { description: "Username already taken" },
        },
      },
    },
    "/v1/users/me/avatar": {
      post: {
        tags: ["Users"],
        summary: "Upload avatar image (Cloudinary)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { avatar: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Avatar uploaded and profile updated" },
          "400": { description: "Invalid file" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/v1/users/{username}": {
      get: {
        tags: ["Users"],
        summary: "Get public user profile by username",
        parameters: [{ in: "path", name: "username", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Public user profile", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "404": { description: "User not found" },
        },
      },
    },
    "/v1/users/{id}": {
      delete: {
        tags: ["Users"],
        summary: "Delete a user (admin only)",
        security: [{ BearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "User deleted" },
          "403": { description: "Admin access required" },
          "404": { description: "User not found" },
        },
      },
    },
    "/v1/posts": {
      get: {
        tags: ["Posts"],
        summary: "List posts with filters, search, and pagination",
        parameters: [
          { in: "query", name: "page", schema: { type: "integer", default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", default: 10 } },
          { in: "query", name: "status", schema: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] } },
          { in: "query", name: "tagSlug", schema: { type: "string" }, description: "Filter by tag slug" },
          { in: "query", name: "authorId", schema: { type: "string" } },
          { in: "query", name: "search", schema: { type: "string" }, description: "Search title and content" },
          { in: "query", name: "sort", schema: { type: "string", enum: ["latest", "oldest", "views"] } },
        ],
        responses: {
          "200": { description: "Paginated posts list", content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedResponse" } } } },
        },
      },
      post: {
        tags: ["Posts"],
        summary: "Create a new post",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "content"],
                properties: {
                  title: { type: "string", example: "My First Post" },
                  content: { type: "string", example: "Full post content here..." },
                  excerpt: { type: "string" },
                  coverImageUrl: { type: "string", format: "uri" },
                  status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT" },
                  tagIds: { type: "array", items: { type: "string", format: "uuid" } },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Post created", content: { "application/json": { schema: { $ref: "#/components/schemas/Post" } } } },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/v1/posts/{slug}": {
      get: {
        tags: ["Posts"],
        summary: "Get post by slug (increments view count)",
        parameters: [{ in: "path", name: "slug", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Post detail", content: { "application/json": { schema: { $ref: "#/components/schemas/Post" } } } },
          "404": { description: "Post not found" },
        },
      },
    },
    "/v1/posts/{id}": {
      put: {
        tags: ["Posts"],
        summary: "Update a post (own post or admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  excerpt: { type: "string" },
                  status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
                  tagIds: { type: "array", items: { type: "string", format: "uuid" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Post updated" },
          "403": { description: "Not your post" },
          "404": { description: "Post not found" },
        },
      },
      delete: {
        tags: ["Posts"],
        summary: "Delete a post (own post or admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Post deleted" },
          "403": { description: "Not authorized" },
          "404": { description: "Post not found" },
        },
      },
    },
    "/v1/posts/{id}/publish": {
      patch: {
        tags: ["Posts"],
        summary: "Publish a post",
        security: [{ BearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Post published" },
          "403": { description: "Not authorized" },
        },
      },
    },
    "/v1/posts/{id}/archive": {
      patch: {
        tags: ["Posts"],
        summary: "Archive a post",
        security: [{ BearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Post archived" },
          "403": { description: "Not authorized" },
        },
      },
    },
    "/v1/posts/{id}/like": {
      post: {
        tags: ["Posts"],
        summary: "Toggle like on a post (like/unlike)",
        security: [{ BearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Like toggled", content: { "application/json": { schema: { type: "object", properties: { liked: { type: "boolean" } } } } } },
          "401": { description: "Unauthorized" },
          "404": { description: "Post not found" },
        },
      },
    },
    "/v1/posts/{id}/bookmark": {
      post: {
        tags: ["Posts"],
        summary: "Toggle bookmark on a post (save/unsave)",
        security: [{ BearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Bookmark toggled", content: { "application/json": { schema: { type: "object", properties: { bookmarked: { type: "boolean" } } } } } },
          "401": { description: "Unauthorized" },
          "404": { description: "Post not found" },
        },
      },
    },
    "/v1/posts/{id}/comments": {
      get: {
        tags: ["Comments"],
        summary: "List comments for a post (paginated)",
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } },
          { in: "query", name: "page", schema: { type: "integer", default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": { description: "Comments list with author info" },
          "404": { description: "Post not found" },
        },
      },
      post: {
        tags: ["Comments"],
        summary: "Create a comment on a post",
        security: [{ BearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string", example: "Great post!" },
                  parentId: { type: "string", format: "uuid", description: "ID of parent comment for threaded replies" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Comment created", content: { "application/json": { schema: { $ref: "#/components/schemas/Comment" } } } },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
          "404": { description: "Post or parent comment not found" },
        },
      },
    },
    "/v1/comments/{id}": {
      put: {
        tags: ["Comments"],
        summary: "Update own comment",
        security: [{ BearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: { content: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Comment updated" },
          "403": { description: "Can only edit own comments" },
          "404": { description: "Comment not found" },
        },
      },
      delete: {
        tags: ["Comments"],
        summary: "Delete a comment (own or admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Comment deleted" },
          "403": { description: "Not authorized" },
          "404": { description: "Comment not found" },
        },
      },
    },
    "/v1/tags": {
      get: {
        tags: ["Tags"],
        summary: "List all tags",
        responses: {
          "200": { description: "All tags", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Tag" } } } } },
        },
      },
      post: {
        tags: ["Tags"],
        summary: "Create a tag (admin only)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "TypeScript" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Tag created" },
          "403": { description: "Admin access required" },
          "409": { description: "Tag already exists" },
        },
      },
    },
    "/v1/tags/{id}": {
      put: {
        tags: ["Tags"],
        summary: "Update a tag (admin only)",
        security: [{ BearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Tag updated" },
          "403": { description: "Admin access required" },
          "404": { description: "Tag not found" },
        },
      },
      delete: {
        tags: ["Tags"],
        summary: "Delete a tag (admin only)",
        security: [{ BearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Tag deleted" },
          "403": { description: "Admin access required" },
          "404": { description: "Tag not found" },
        },
      },
    },
  },
};
