import { eq, ne, ilike, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, getTotalPages } from "../utils/pagination.js";
import { sanitizeUser } from "./auth.service.js";
import { v2 as cloudinary } from "cloudinary";

export async function listUsers(query: {
  page?: string;
  limit?: string;
  search?: string;
}) {
  const { skip, take, page, limit } = getPagination(query);

  const users = await db.query.usersTable.findMany({
    where: query.search
      ? ilike(usersTable.name, `%${query.search}%`)
      : undefined,
    limit: take,
    offset: skip,
    orderBy: (u, { desc }) => desc(u.createdAt),
  });

  const allUsers = await db.query.usersTable.findMany({
    where: query.search
      ? ilike(usersTable.name, `%${query.search}%`)
      : undefined,
  });

  return {
    users: users.map(sanitizeUser),
    meta: {
      page,
      limit,
      total: allUsers.length,
      totalPages: getTotalPages(allUsers.length, limit),
    },
  };
}

export async function getUserByUsername(username: string) {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, username),
  });
  if (!user) throw ApiError.notFound("User");
  return sanitizeUser(user);
}

export async function getUserById(id: string) {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, id),
  });
  if (!user) throw ApiError.notFound("User");
  return user;
}

export async function updateUser(
  userId: string,
  data: {
    name?: string;
    bio?: string;
    username?: string;
  },
) {
  if (data.username) {
    const existing = await db.query.usersTable.findFirst({
      where: and(
        eq(usersTable.username, data.username),
        ne(usersTable.id, userId),
      ),
    });
    if (existing) throw ApiError.conflict("Username already taken");
  }

  const [updated] = await db
    .update(usersTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  return sanitizeUser(updated);
}

export async function uploadAvatar(userId: string, fileBuffer: Buffer, mimetype: string) {
  configureCloudinary();

  const base64 = fileBuffer.toString("base64");
  const dataUri = `data:${mimetype};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "blogapi/avatars",
    public_id: `avatar_${userId}`,
    overwrite: true,
    transformation: [{ width: 300, height: 300, crop: "fill" }],
  });

  const [updated] = await db
    .update(usersTable)
    .set({ avatarUrl: result.secure_url, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  return sanitizeUser(updated);
}

export async function deleteUser(id: string) {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, id),
  });
  if (!user) throw ApiError.notFound("User");
  await db.delete(usersTable).where(eq(usersTable.id, id));
}

function configureCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw ApiError.internal("Cloudinary is not configured");
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}
