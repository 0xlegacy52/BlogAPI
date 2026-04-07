import { eq, and, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { commentsTable, postsTable } from "@workspace/db";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, getTotalPages } from "../utils/pagination.js";

export async function listComments(
  postId: string,
  query: { page?: string; limit?: string },
) {
  const post = await db.query.postsTable.findFirst({
    where: eq(postsTable.id, postId),
  });
  if (!post) throw ApiError.notFound("Post");

  const { skip, take, page, limit } = getPagination(query);

  const comments = await db.query.commentsTable.findMany({
    where: eq(commentsTable.postId, postId),
    limit: take,
    offset: skip,
    orderBy: (c, { asc }) => asc(c.createdAt),
    with: {
      author: {
        columns: { id: true, username: true, name: true, avatarUrl: true },
      },
    },
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(commentsTable)
    .where(eq(commentsTable.postId, postId));

  return {
    comments,
    meta: {
      page,
      limit,
      total: Number(total),
      totalPages: getTotalPages(Number(total), limit),
    },
  };
}

export async function createComment(
  postId: string,
  authorId: string,
  data: { content: string; parentId?: string },
) {
  const post = await db.query.postsTable.findFirst({
    where: eq(postsTable.id, postId),
  });
  if (!post) throw ApiError.notFound("Post");

  if (data.parentId) {
    const parent = await db.query.commentsTable.findFirst({
      where: and(
        eq(commentsTable.id, data.parentId),
        eq(commentsTable.postId, postId),
      ),
    });
    if (!parent) throw ApiError.notFound("Parent comment");
  }

  const [comment] = await db
    .insert(commentsTable)
    .values({
      postId,
      authorId,
      content: data.content,
      parentId: data.parentId,
    })
    .returning();

  return comment;
}

export async function updateComment(
  commentId: string,
  userId: string,
  data: { content: string },
) {
  const comment = await db.query.commentsTable.findFirst({
    where: eq(commentsTable.id, commentId),
  });
  if (!comment) throw ApiError.notFound("Comment");
  if (comment.authorId !== userId) {
    throw ApiError.forbidden("You can only edit your own comments");
  }

  const [updated] = await db
    .update(commentsTable)
    .set({ content: data.content, isEdited: true, updatedAt: new Date() })
    .where(eq(commentsTable.id, commentId))
    .returning();

  return updated;
}

export async function deleteComment(
  commentId: string,
  userId: string,
  role: string,
) {
  const comment = await db.query.commentsTable.findFirst({
    where: eq(commentsTable.id, commentId),
  });
  if (!comment) throw ApiError.notFound("Comment");
  if (comment.authorId !== userId && role !== "ADMIN") {
    throw ApiError.forbidden("You can only delete your own comments");
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
}
