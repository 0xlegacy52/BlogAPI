import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, makeUser, registerAndLogin, cleanupUser } from "./helpers.js";

const user = makeUser("users");
let accessToken: string;

beforeAll(async () => {
  const session = await registerAndLogin(user);
  accessToken = session.accessToken;
});

afterAll(async () => {
  await cleanupUser(user.email);
});

describe("GET /api/v1/users/:username", () => {
  it("returns public profile for existing user", async () => {
    const res = await request.get(`/api/v1/users/${user.username}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe(user.username);
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it("returns 404 for unknown username", async () => {
    const res = await request.get("/api/v1/users/no-such-user-xyz");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("PUT /api/v1/users/me", () => {
  it("updates name and bio", async () => {
    const res = await request
      .put("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Updated Name", bio: "Bio here" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Name");
    expect(res.body.data.bio).toBe("Bio here");
  });

  it("returns 401 without token", async () => {
    const res = await request
      .put("/api/v1/users/me")
      .send({ name: "No Auth" });
    expect(res.status).toBe(401);
  });

  it("returns 409 on duplicate username", async () => {
    const other = makeUser("dup");
    await registerAndLogin(other);
    const res = await request
      .put("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ username: other.username });
    expect(res.status).toBe(409);
    await cleanupUser(other.email);
  });
});

describe("GET /api/v1/users (admin only)", () => {
  it("returns 403 for regular user", async () => {
    const res = await request
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 401 without token", async () => {
    const res = await request.get("/api/v1/users");
    expect(res.status).toBe(401);
  });
});
