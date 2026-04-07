import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@workspace/db";
import { postsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  request,
  makeUser,
  registerAndLogin,
  cleanupUser,
} from "./helpers.js";

const author = makeUser("postauthor");
const otherUser = makeUser("postother");
let accessToken: string;
let otherToken: string;
let postId: string;
let postSlug: string;

beforeAll(async () => {
  const session = await registerAndLogin(author);
  accessToken = session.accessToken;
  const otherSession = await registerAndLogin(otherUser);
  otherToken = otherSession.accessToken;

  const res = await request
    .post("/api/v1/posts")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      title: "Test Post for Suite",
      content: "This is the content of the test post for the test suite.",
      status: "DRAFT",
    });
  postId = res.body.data.id;
  postSlug = res.body.data.slug;
});

afterAll(async () => {
  await db.delete(postsTable).where(eq(postsTable.id, postId));
  await cleanupUser(author.email);
  await cleanupUser(otherUser.email);
});

describe("GET /api/v1/posts", () => {
  it("returns paginated list of published posts", async () => {
    const res = await request.get("/api/v1/posts?page=1&limit=5");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 5,
    });
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("supports search query parameter", async () => {
    const res = await request.get("/api/v1/posts?search=nonexistentsearchterm12345");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe("POST /api/v1/posts", () => {
  it("creates a draft post when authenticated", async () => {
    const res = await request
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "My Draft Post", content: "Draft content here." });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("DRAFT");
    expect(res.body.data.slug).toBeTruthy();
    expect(res.body.data.readTime).toBeGreaterThan(0);
    await db.delete(postsTable).where(eq(postsTable.id, res.body.data.id));
  });

  it("returns 401 without authentication", async () => {
    const res = await request
      .post("/api/v1/posts")
      .send({ title: "Anon Post", content: "Should fail." });
    expect(res.status).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    const res = await request
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Content without title." });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/v1/posts/:slug", () => {
  it("returns 404 for unknown slug", async () => {
    const res = await request.get("/api/v1/posts/no-such-slug-xyz-999");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/v1/posts/:id", () => {
  it("updates own post", async () => {
    const res = await request
      .put(`/api/v1/posts/${postId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Updated Title", content: "Updated content." });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated Title");
  });

  it("returns 403 when updating another user's post", async () => {
    const res = await request
      .put(`/api/v1/posts/${postId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Stolen Title" });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/v1/posts/:id/publish", () => {
  it("publishes a draft post owned by the user", async () => {
    const res = await request
      .patch(`/api/v1/posts/${postId}/publish`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("PUBLISHED");
    expect(res.body.data.publishedAt).toBeTruthy();
  });

  it("returns 403 when publishing another user's post", async () => {
    const res = await request
      .patch(`/api/v1/posts/${postId}/publish`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/v1/posts/:id/like", () => {
  it("toggles like on a post (like then unlike)", async () => {
    const likeRes = await request
      .post(`/api/v1/posts/${postId}/like`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(likeRes.status).toBe(200);
    expect(likeRes.body.data.liked).toBe(true);

    const unlikeRes = await request
      .post(`/api/v1/posts/${postId}/like`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(unlikeRes.status).toBe(200);
    expect(unlikeRes.body.data.liked).toBe(false);
  });

  it("returns 401 without authentication", async () => {
    const res = await request.post(`/api/v1/posts/${postId}/like`);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/posts/:id/bookmark", () => {
  it("toggles bookmark on a post", async () => {
    const bookRes = await request
      .post(`/api/v1/posts/${postId}/bookmark`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(bookRes.status).toBe(200);
    expect(bookRes.body.data.bookmarked).toBe(true);

    const unbookRes = await request
      .post(`/api/v1/posts/${postId}/bookmark`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(unbookRes.status).toBe(200);
    expect(unbookRes.body.data.bookmarked).toBe(false);
  });
});

describe("PATCH /api/v1/posts/:id/archive", () => {
  it("archives own post", async () => {
    const res = await request
      .patch(`/api/v1/posts/${postId}/archive`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ARCHIVED");
  });
});

describe("DELETE /api/v1/posts/:id", () => {
  it("returns 403 when deleting another user's post", async () => {
    const res = await request
      .delete(`/api/v1/posts/${postId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it("deletes own post", async () => {
    const createRes = await request
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "To Delete", content: "Will be deleted." });
    const deleteId = createRes.body.data.id;

    const res = await request
      .delete(`/api/v1/posts/${deleteId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
