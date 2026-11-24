export const COMMENT_MAX_LENGTH = 1000;

interface Person {
  id: string;
  name: string;
}

export interface Vote {
  activityId: string;
  user: Person;
}

export interface Comment {
  id: string;
  activityId: string;
  author: Person;
  body: string;
  createdAt: Date;
}

export interface NewComment {
  activityId: string;
  authorId: string;
  body: string;
}

/** What the group thinks of an activity, from the point of view of one member. */
export interface Discussion {
  votes: {
    count: number;
    votedByMe: boolean;
    /** Names, for "Ana y Bruno quieren ir". */
    voters: string[];
  };
  /** Oldest first, like a chat. */
  comments: (Comment & { canDelete: boolean })[];
}

export interface Viewer {
  userId: string;
  /** May delete other people's comments. */
  canModerate: boolean;
}

/** Groups votes and comments by activity. Activities with neither are omitted. */
export function summarizeDiscussions(votes: Vote[], comments: Comment[], viewer: Viewer): Map<string, Discussion> {
  const result = new Map<string, Discussion>();
  const entry = (activityId: string) => {
    let discussion = result.get(activityId);
    if (!discussion) {
      discussion = { votes: { count: 0, votedByMe: false, voters: [] }, comments: [] };
      result.set(activityId, discussion);
    }
    return discussion;
  };

  for (const vote of votes) {
    const { votes: summary } = entry(vote.activityId);
    summary.count += 1;
    summary.voters.push(vote.user.name);
    if (vote.user.id === viewer.userId) summary.votedByMe = true;
  }
  for (const comment of [...comments].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    entry(comment.activityId).comments.push({
      ...comment,
      canDelete: comment.author.id === viewer.userId || viewer.canModerate,
    });
  }
  return result;
}

/**
 * The idea with the most votes, if one clearly leads (a tie means the group
 * hasn't decided yet, so nothing is highlighted).
 */
export function mostVoted(ideaIds: string[], discussions: ReadonlyMap<string, Discussion>): string | null {
  const ranked = ideaIds
    .map((id) => ({ id, count: discussions.get(id)?.votes.count ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const [first, second] = ranked;
  if (!first || first.count === 0 || first.count === second?.count) return null;
  return first.id;
}
