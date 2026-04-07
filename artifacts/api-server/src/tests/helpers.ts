import supertest from "supertest";
import app from "../app.js";
import { db } from "@workspace/db";
import { usersTable, postsTable, commentsTable, tagsTable, likesTable, bookmarksTable, refreshTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const request = supertest(app);

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function makeUser(prefix = "test") {
  const id = uid();
  return {
    email: `${prefix}-${id}@blogapi-test.local`,
    username: `${prefix}${id.replace(/[^a-z0-9]/gi, "").slice(0, 10)}`,
    password: "testpass123",
    name: `${prefix} User`,
  };
}

export async function registerAndLogin(data: ReturnType<typeof makeUser>) {
  await request.post("/api/v1/auth/register").send(data);
  const res = await request.post("/api/v1/auth/login").send({
    email: data.email,
    password: data.password,
  });
  return res.body.data as { accessToken: string; refreshToken: string; user: { id: string } };
}

export async function cleanupUser(email: string) {
  await db.delete(usersTable).where(eq(usersTable.email, email));
}

export async function cleanupPost(id: string) {
  await db.delete(postsTable).where(eq(postsTable.id, id));
}

export async function cleanupTag(id: string) {
  await db.delete(tagsTable).where(eq(tagsTable.id, id));
}
