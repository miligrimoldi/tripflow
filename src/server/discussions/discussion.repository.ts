import type { Comment, NewComment, Vote } from "./discussion";

export interface DiscussionRepository {
  listVotes(tripId: string): Promise<Vote[]>;
  /** Idempotent: voting twice leaves a single vote. */
  addVote(activityId: string, userId: string): Promise<void>;
  /** Idempotent: removing a vote that doesn't exist does nothing. */
  removeVote(activityId: string, userId: string): Promise<void>;
  listComments(tripId: string): Promise<Comment[]>;
  findComment(id: string): Promise<Comment | null>;
  addComment(data: NewComment): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
}
