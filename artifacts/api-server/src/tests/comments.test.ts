import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@workspace/db";
import { postsTable, commentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  request,
  makeUser,
  registerAndLogin,
  cleanupUser,
} from "./helpers.js";

const author = makeUser("commentauthor");
const commenter = makeUser("commenter");
const outsider = makeUser("commentout");
let authorToken: string;
let commenterToken: string;
let outsiderToken: string;
let postId: string;
let commentId: string;

beforeAll(async () => {
  const authorSession = await registerAndLogin(author);
  authorToken = authorSession.accessToken;

  const commenterSession = await registerAndLogin(commenter);
  commenterToken = commenterSession.accessToken;

  const outsiderSession = await registerAndLogin(outsider);
  outsiderToken = outsiderSession.accessToken;

  const postRes = await request
    .post("/api/v1/posts")
    .set("Authorization", `Bearer ${authorToken}`)
    .send({
      title: "Comment Test Post",
      content: "A post for testing comments.",
      status: "PUBLISHED",
    });
  postId = postRes.body.data.id;

  const commentRes = await request
    .post(`/api/v1/posts/${postId}/comments`)
    .set("Authorization", `Bearer ${commenterToken}`)
    .send({ content: "First comment here." });
  commentId = commentRes.body.data.id;
});

afterAll(async () => {
  await db.delete(commentsTable).where(eq(commentsTable.postId, postId));
  await db.delete(postsTable).where(eq(postsTable.id, postId));
  await cleanupUser(author.email);
  await cleanupUser(commenter.email);
  await cleanupUser(outsider.email);
});

describe("GET /api/v1/posts/:id/comments", () => {
  it("returns paginated comments for a post", async () => {
    const res = await request.get(`/api/v1/posts/${postId}/comments`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  it("returns 404 for unknown post ID", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await request.get(`/api/v1/posts/${fakeId}/comments`);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/posts/:id/comments", () => {
  it("creates a top-level comment", async () => {
    const res = await request
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${commenterToken}`)
      .send({ content: "A new top-level comment." });
    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe("A new top-level comment.");
    expect(res.body.data.parentId).toBeNull();
  });

  it("creates a threaded reply with parentId", async () => {
    const res = await request
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ content: "Reply comment.", parentId: commentId });
    expect(res.status).toBe(201);
    expect(res.body.data.parentId).toBe(commentId);
  });

  it("returns 401 without authentication", async () => {
    const res = await request
      .post(`/api/v1/posts/${postId}/comments`)
      .send({ content: "Anonymous comment." });
    expect(res.status).toBe(401);
  });

  it("returns 400 when content is empty", async () => {
    const res = await request
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${commenterToken}`)
      .send({ content: "" });
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/v1/comments/:id", () => {
  it("allows author to update own comment", async () => {
    const res = await request
      .put(`/api/v1/comments/${commentId}`)
      .set("Authorization", `Bearer ${commenterToken}`)
      .send({ content: "Edited comment content." });
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe("Edited comment content.");
    expect(res.body.data.isEdited).toBe(true);
  });

  it("returns 403 when editing another user's comment", async () => {
    const res = await request
      .put(`/api/v1/comments/${commentId}`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ content: "Stolen edit." });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/v1/comments/:id", () => {
  it("returns 403 when deleting another user's comment", async () => {
    const res = await request
      .delete(`/api/v1/comments/${commentId}`)
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(res.status).toBe(403);
  });

  it("allows comment author to delete own comment", async () => {
    const createRes = await request
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${commenterToken}`)
      .send({ content: "Will be deleted." });
    const tempId = createRes.body.data.id;

    const res = await request
      .delete(`/api/v1/comments/${tempId}`)
      .set("Authorization", `Bearer ${commenterToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
