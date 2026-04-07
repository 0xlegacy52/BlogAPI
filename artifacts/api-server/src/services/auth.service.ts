import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  refreshTokensTable,
  type InsertUser,
} from "@workspace/db";
import { ApiError } from "../utils/ApiError.js";
import type { JwtPayload } from "../middleware/auth.middleware.js";

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRES = "15m";
const REFRESH_TOKEN_EXPIRES_DAYS = 7;

function getSecrets() {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!accessSecret || !refreshSecret) {
    throw ApiError.internal("JWT secrets are not configured");
  }
  return { accessSecret, refreshSecret };
}

export function generateTokens(userId: string, role: string) {
  const { accessSecret, refreshSecret } = getSecrets();
  const payload: JwtPayload = { userId, role };
  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  });
  const jti = randomBytes(16).toString("hex");
  const refreshToken = jwt.sign({ userId, jti }, refreshSecret, {
    expiresIn: `${REFRESH_TOKEN_EXPIRES_DAYS}d`,
  });
  return { accessToken, refreshToken };
}

export async function register(data: {
  email: string;
  username: string;
  password: string;
  name: string;
}) {
  const existing = await db.query.usersTable.findFirst({
    where: (u, { or }) =>
      or(eq(u.email, data.email), eq(u.username, data.username)),
  });
  if (existing) {
    if (existing.email === data.email) {
      throw ApiError.conflict("Email already in use");
    }
    throw ApiError.conflict("Username already taken");
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const [user] = await db
    .insert(usersTable)
    .values({
      email: data.email,
      username: data.username,
      passwordHash,
      name: data.name,
    } as InsertUser)
    .returning();

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  await storeRefreshToken(user.id, refreshToken);

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function login(data: { email: string; password: string }) {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, data.email),
  });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  await storeRefreshToken(user.id, refreshToken);

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function refreshTokens(token: string) {
  const { refreshSecret } = getSecrets();
  let payload: { userId: string };
  try {
    payload = jwt.verify(token, refreshSecret) as { userId: string };
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const stored = await db.query.refreshTokensTable.findFirst({
    where: and(
      eq(refreshTokensTable.token, token),
      eq(refreshTokensTable.isRevoked, false),
      gt(refreshTokensTable.expiresAt, new Date()),
    ),
  });
  if (!stored) {
    throw ApiError.unauthorized("Refresh token is revoked or expired");
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, payload.userId),
  });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("User not found or inactive");
  }

  await db
    .update(refreshTokensTable)
    .set({ isRevoked: true })
    .where(eq(refreshTokensTable.token, token));

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    user.id,
    user.role,
  );
  await storeRefreshToken(user.id, newRefreshToken);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(token: string) {
  await db
    .update(refreshTokensTable)
    .set({ isRevoked: true })
    .where(eq(refreshTokensTable.token, token));
}

async function storeRefreshToken(userId: string, token: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  await db.insert(refreshTokensTable).values({ userId, token, expiresAt });
}

export function sanitizeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}
