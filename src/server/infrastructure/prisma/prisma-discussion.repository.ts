import type { Prisma } from "@/generated/prisma/client";
import type { Comment, NewComment, Vote } from "@/server/discussions/discussion";
import type { DiscussionRepository } from "@/server/discussions/discussion.repository";
import type { Db } from "./client";

const person = { select: { id: true, name: true } } as const;
const commentInclude = { author: person } satisfies Prisma.ActivityCommentInclude;

type CommentRow = Prisma.ActivityCommentGetPayload<{ include: typeof commentInclude }>;

function toComment({ id, activityId, author, body, createdAt }: CommentRow): Comment {
  return { id, activityId, author, body, createdAt };
}

export class PrismaDiscussionRepository implements DiscussionRepository {
  constructor(private readonly db: Db) {}

  async listVotes(tripId: string): Promise<Vote[]> {
    const rows = await this.db.activityVote.findMany({
      where: { activity: { tripId } },
      include: { user: person },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(({ activityId, user }) => ({ activityId, user }));
  }

  async addVote(activityId: string, userId: string): Promise<void> {
    // Upsert on the composite key: voting twice (or two tabs at once) keeps one vote.
    await this.db.activityVote.upsert({
      where: { activityId_userId: { activityId, userId } },
      create: { activityId, userId },
      update: {},
    });
  }

  async removeVote(activityId: string, userId: string): Promise<void> {
    await this.db.activityVote.deleteMany({ where: { activityId, userId } });
  }

  async listComments(tripId: string): Promise<Comment[]> {
    const rows = await this.db.activityComment.findMany({
      where: { activity: { tripId } },
      include: commentInclude,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toComment);
  }

  async findComment(id: string): Promise<Comment | null> {
    const row = await this.db.activityComment.findUnique({ where: { id }, include: commentInclude });
    return row ? toComment(row) : null;
  }

  async addComment(data: NewComment): Promise<Comment> {
    return toComment(await this.db.activityComment.create({ data, include: commentInclude }));
  }

  async deleteComment(id: string): Promise<void> {
    await this.db.activityComment.deleteMany({ where: { id } });
  }
}
