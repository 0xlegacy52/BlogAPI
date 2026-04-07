import { eq, and, or, ilike, sql, desc, asc, count } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  postsTable,
  postTagsTable,
  tagsTable,
  likesTable,
  bookmarksTable,
} from "@workspace/db";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, getTotalPages } from "../utils/pagination.js";
import { slugify, computeReadTime } from "../utils/slug.js";

export async function listPosts(query: {
  page?: string;
  limit?: string;
  status?: string;
  tagSlug?: string;
  authorId?: string;
  search?: string;
  sort?: string;
}) {
  const { skip, take, page, limit } = getPagination(query);

  const status = query.status as "DRAFT" | "PUBLISHED" | "ARCHIVED" | undefined;

  let whereClause = status
    ? eq(postsTable.status, status)
    : eq(postsTable.status, "PUBLISHED");

  if (query.authorId) {
    whereClause = and(whereClause, eq(postsTable.authorId, query.authorId))!;
  }

  if (query.search) {
    whereClause = and(
      whereClause,
      or(
        ilike(postsTable.title, `%${query.search}%`),
        ilike(postsTable.content, `%${query.search}%`),
      ),
    )!;
  }

  const sortField =
    query.sort === "views"
      ? postsTable.viewCount
      : query.sort === "oldest"
        ? postsTable.createdAt
        : postsTable.createdAt;
  const orderBy =
    query.sort === "oldest" ? asc(sortField) : desc(sortField);

  let postsQuery = db
    .select()
    .from(postsTable)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(take)
    .offset(skip);

  let tagFilterIds: string[] | undefined;
  if (query.tagSlug) {
    const tag = await db.query.tagsTable.findFirst({
      where: eq(tagsTable.slug, query.tagSlug),
    });
    if (!tag) return { posts: [], meta: { page, limit, total: 0, totalPages: 0 } };

    const postIds = await db
      .select({ postId: postTagsTable.postId })
      .from(postTagsTable)
      .where(eq(postTagsTable.tagId, tag.id));

    if (postIds.length === 0) return { posts: [], meta: { page, limit, total: 0, totalPages: 0 } };

    tagFilterIds = postIds.map((r) => r.postId);
  }

  const posts = await (tagFilterIds
    ? db
        .select()
        .from(postsTable)
        .where(and(whereClause, sql`${postsTable.id} = ANY(ARRAY[${sql.join(tagFilterIds.map((id) => sql`${id}::uuid`), sql`, `)}])`))
        .orderBy(orderBy)
        .limit(take)
        .offset(skip)
    : postsQuery);

  const totalWhereClause = tagFilterIds
    ? and(whereClause, sql`${postsTable.id} = ANY(ARRAY[${sql.join(tagFilterIds.map((id) => sql`${id}::uuid`), sql`, `)}])`)
    : whereClause;

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(postsTable)
    .where(totalWhereClause);

  return {
    posts,
    meta: {
      page,
      limit,
      total: Number(total),
      totalPages: getTotalPages(Number(total), limit),
    },
  };
}

export async function getPostBySlug(slug: string) {
  const post = await db.query.postsTable.findFirst({
    where: eq(postsTable.slug, slug),
  });
  if (!post) throw ApiError.notFound("Post");

  await db
    .update(postsTable)
    .set({ viewCount: sql`${postsTable.viewCount} + 1` })
    .where(eq(postsTable.id, post.id));

  return { ...post, viewCount: post.viewCount + 1 };
}

export async function getPostById(id: string) {
  const post = await db.query.postsTable.findFirst({
    where: eq(postsTable.id, id),
  });
  if (!post) throw ApiError.notFound("Post");
  return post;
}

export async function createPost(
  authorId: string,
  data: {
    title: string;
    content: string;
    excerpt?: string;
    coverImageUrl?: string;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    tagIds?: string[];
  },
) {
  let slug = slugify(data.title);
  const existing = await db.query.postsTable.findFirst({
    where: eq(postsTable.slug, slug),
  });
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const readTime = computeReadTime(data.content);
  const publishedAt =
    data.status === "PUBLISHED" ? new Date() : null;

  const [post] = await db
    .insert(postsTable)
    .values({
      authorId,
      title: data.title,
      slug,
      content: data.content,
      excerpt: data.excerpt,
      coverImageUrl: data.coverImageUrl,
      status: data.status ?? "DRAFT",
      readTime,
      publishedAt: publishedAt ?? undefined,
    })
    .returning();

  if (data.tagIds && data.tagIds.length > 0) {
    await db.insert(postTagsTable).values(
      data.tagIds.map((tagId) => ({ postId: post.id, tagId })),
    );
  }

  return post;
}

export async function updatePost(
  postId: string,
  userId: string,
  role: string,
  data: {
    title?: string;
    content?: string;
    excerpt?: string;
    coverImageUrl?: string;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    tagIds?: string[];
  },
) {
  const post = await getPostById(postId);
  if (post.authorId !== userId && role !== "ADMIN") {
    throw ApiError.forbidden("You can only edit your own posts");
  }

  const updates: Partial<typeof postsTable.$inferInsert> = { ...data, updatedAt: new Date() };
  if (data.content) updates.readTime = computeReadTime(data.content);
  if (data.status === "PUBLISHED" && post.status !== "PUBLISHED") {
    updates.publishedAt = new Date();
  }
  delete (updates as Record<string, unknown>).tagIds;

  const [updated] = await db
    .update(postsTable)
    .set(updates)
    .where(eq(postsTable.id, postId))
    .returning();

  if (data.tagIds !== undefined) {
    await db.delete(postTagsTable).where(eq(postTagsTable.postId, postId));
    if (data.tagIds.length > 0) {
      await db.insert(postTagsTable).values(
        data.tagIds.map((tagId) => ({ postId: post.id, tagId })),
      );
    }
  }

  return updated;
}

export async function deletePost(
  postId: string,
  userId: string,
  role: string,
) {
  const post = await getPostById(postId);
  if (post.authorId !== userId && role !== "ADMIN") {
    throw ApiError.forbidden("You can only delete your own posts");
  }
  await db.delete(postsTable).where(eq(postsTable.id, postId));
}

export async function publishPost(postId: string, userId: string, role: string) {
  const post = await getPostById(postId);
  if (post.authorId !== userId && role !== "ADMIN") {
    throw ApiError.forbidden("You can only publish your own posts");
  }
  const [updated] = await db
    .update(postsTable)
    .set({ status: "PUBLISHED", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(postsTable.id, postId))
    .returning();
  return updated;
}

export async function archivePost(postId: string, userId: string, role: string) {
  const post = await getPostById(postId);
  if (post.authorId !== userId && role !== "ADMIN") {
    throw ApiError.forbidden("You can only archive your own posts");
  }
  const [updated] = await db
    .update(postsTable)
    .set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(eq(postsTable.id, postId))
    .returning();
  return updated;
}

export async function toggleLike(postId: string, userId: string) {
  await getPostById(postId);
  const existing = await db.query.likesTable.findFirst({
    where: and(eq(likesTable.postId, postId), eq(likesTable.userId, userId)),
  });
  if (existing) {
    await db.delete(likesTable).where(eq(likesTable.id, existing.id));
    return { liked: false };
  }
  await db.insert(likesTable).values({ postId, userId });
  return { liked: true };
}

export async function toggleBookmark(postId: string, userId: string) {
  await getPostById(postId);
  const existing = await db.query.bookmarksTable.findFirst({
    where: and(
      eq(bookmarksTable.postId, postId),
      eq(bookmarksTable.userId, userId),
    ),
  });
  if (existing) {
    await db.delete(bookmarksTable).where(eq(bookmarksTable.id, existing.id));
    return { bookmarked: false };
  }
  await db.insert(bookmarksTable).values({ postId, userId });
  return { bookmarked: true };
}
