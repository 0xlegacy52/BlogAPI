import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@workspace/db";
import { tagsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  request,
  makeUser,
  registerAndLogin,
  cleanupUser,
} from "./helpers.js";

const regularUser = makeUser("taguser");
let userToken: string;
let createdTagId: string;

beforeAll(async () => {
  const session = await registerAndLogin(regularUser);
  userToken = session.accessToken;
});

afterAll(async () => {
  if (createdTagId) {
    await db.delete(tagsTable).where(eq(tagsTable.id, createdTagId));
  }
  await cleanupUser(regularUser.email);
});

describe("GET /api/v1/tags", () => {
  it("returns array of tags (public endpoint)", async () => {
    const res = await request.get("/api/v1/tags");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe("POST /api/v1/tags (admin only)", () => {
  it("returns 403 for regular user", async () => {
    const res = await request
      .post("/api/v1/tags")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Forbidden Tag" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 401 without authentication", async () => {
    const res = await request
      .post("/api/v1/tags")
      .send({ name: "Anon Tag" });
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/v1/tags/:id (admin only)", () => {
  it("returns 403 for regular user", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000001";
    const res = await request
      .put(`/api/v1/tags/${fakeId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "New Name" });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/v1/tags/:id (admin only)", () => {
  it("returns 403 for regular user", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000001";
    const res = await request
      .delete(`/api/v1/tags/${fakeId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});
