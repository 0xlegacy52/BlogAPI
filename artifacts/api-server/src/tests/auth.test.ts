import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, makeUser, cleanupUser } from "./helpers.js";

const user = makeUser("auth");
let accessToken: string;
let refreshToken: string;

beforeAll(async () => {
  await request.post("/api/v1/auth/register").send(user);
  const res = await request.post("/api/v1/auth/login").send({
    email: user.email,
    password: user.password,
  });
  accessToken = res.body.data.accessToken;
  refreshToken = res.body.data.refreshToken;
});

afterAll(async () => {
  await cleanupUser(user.email);
});

describe("POST /api/v1/auth/register", () => {
  const fresh = makeUser("register");

  afterAll(async () => {
    await cleanupUser(fresh.email);
  });

  it("registers a new user and returns tokens", async () => {
    const res = await request.post("/api/v1/auth/register").send(fresh);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(fresh.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("returns 400 for invalid email", async () => {
    const res = await request
      .post("/api/v1/auth/register")
      .send({ ...fresh, email: "not-valid" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for short password", async () => {
    const res = await request
      .post("/api/v1/auth/register")
      .send({ ...fresh, email: `short-${fresh.email}`, password: "abc" });
    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate email", async () => {
    const res = await request.post("/api/v1/auth/register").send(fresh);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});

describe("POST /api/v1/auth/login", () => {
  it("returns tokens for valid credentials", async () => {
    const res = await request.post("/api/v1/auth/login").send({
      email: user.email,
      password: user.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.user.role).toBe("USER");
  });

  it("returns 401 for wrong password", async () => {
    const res = await request.post("/api/v1/auth/login").send({
      email: user.email,
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 for unknown email", async () => {
    const res = await request.post("/api/v1/auth/login").send({
      email: "nobody@blogapi-test.local",
      password: "password123",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns current user for valid token", async () => {
    const res = await request
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(user.email);
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it("returns 401 without token", async () => {
    const res = await request.get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with malformed token", async () => {
    const res = await request
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("returns new tokens from valid refresh token", async () => {
    const res = await request
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it("returns 401 for invalid refresh token", async () => {
    const res = await request
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: "invalid-token" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("revokes the refresh token", async () => {
    const loginRes = await request.post("/api/v1/auth/login").send({
      email: user.email,
      password: user.password,
    });
    const { accessToken: at, refreshToken: rt } = loginRes.body.data;

    const res = await request
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${at}`)
      .send({ refreshToken: rt });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const refreshRes = await request
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: rt });
    expect(refreshRes.status).toBe(401);
  });
});
