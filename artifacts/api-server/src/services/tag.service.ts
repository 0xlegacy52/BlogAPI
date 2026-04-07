import { eq, ne, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { tagsTable } from "@workspace/db";
import { ApiError } from "../utils/ApiError.js";
import { slugify } from "../utils/slug.js";

export async function listTags() {
  return db.query.tagsTable.findMany({
    orderBy: (t, { asc }) => asc(t.name),
  });
}

export async function createTag(data: {
  name: string;
  description?: string;
}) {
  const slug = slugify(data.name);
  const existing = await db.query.tagsTable.findFirst({
    where: eq(tagsTable.slug, slug),
  });
  if (existing) throw ApiError.conflict("Tag with this name already exists");

  const [tag] = await db
    .insert(tagsTable)
    .values({ name: data.name, slug, description: data.description })
    .returning();

  return tag;
}

export async function updateTag(
  tagId: string,
  data: { name?: string; description?: string },
) {
  const tag = await db.query.tagsTable.findFirst({
    where: eq(tagsTable.id, tagId),
  });
  if (!tag) throw ApiError.notFound("Tag");

  const updates: Partial<typeof tagsTable.$inferInsert> = {
    ...data,
    updatedAt: new Date(),
  };

  if (data.name) {
    const slug = slugify(data.name);
    const existing = await db.query.tagsTable.findFirst({
      where: and(eq(tagsTable.slug, slug), ne(tagsTable.id, tagId)),
    });
    if (existing) throw ApiError.conflict("Tag with this name already exists");
    updates.slug = slug;
  }

  const [updated] = await db
    .update(tagsTable)
    .set(updates)
    .where(eq(tagsTable.id, tagId))
    .returning();

  return updated;
}

export async function deleteTag(tagId: string) {
  const tag = await db.query.tagsTable.findFirst({
    where: eq(tagsTable.id, tagId),
  });
  if (!tag) throw ApiError.notFound("Tag");
  await db.delete(tagsTable).where(eq(tagsTable.id, tagId));
}
