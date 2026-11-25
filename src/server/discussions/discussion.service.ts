import { noTripEvents, type TripEventPublisher } from "../realtime/trip-events";
import type { Activity } from "../activities/activity";
import type { ActivityRepository } from "../activities/activity.repository";
import { hasPermission } from "../members/member";
import type { TripAccessPolicy } from "../members/trip-access";
import { BusinessRuleError, ForbiddenError, NotFoundError } from "../shared/errors";
import { parseInput } from "../shared/validation";
import { summarizeDiscussions, type Comment, type Discussion } from "./discussion";
import type { DiscussionRepository } from "./discussion.repository";
import { commentSchema, voteSchema, type CommentInput, type VoteInput } from "./discussion.schemas";

/**
 * Lets the group decide together: members vote the ideas they'd like to do
 * and talk about any activity ("¿reservamos?", "cierra los lunes").
 */
export class DiscussionService {
  constructor(
    private readonly discussions: DiscussionRepository,
    private readonly activities: Pick<ActivityRepository, "findById">,
    private readonly access: TripAccessPolicy,
    private readonly events: TripEventPublisher = noTripEvents,
  ) {}

  /** Votes and comments of the trip's activities, by activity id. */
  async getForTrip(userId: string, tripId: string): Promise<Map<string, Discussion>> {
    const member = await this.access.require(tripId, userId, "trip:view");
    const [votes, comments] = await Promise.all([
      this.discussions.listVotes(tripId),
      this.discussions.listComments(tripId),
    ]);
    return summarizeDiscussions(votes, comments, {
      userId,
      canModerate: hasPermission(member.role, "comment:moderate"),
    });
  }

  /**
   * Sets (not toggles) the member's vote, so a repeated request or a double
   * click can't flip it back. Only ideas are voted: once an activity has a
   * day, the group already decided.
   */
  async setVote(userId: string, activityId: string, input: VoteInput): Promise<void> {
    const activity = await this.loadActivity(userId, activityId);
    const { voted } = parseInput(voteSchema, input);
    if (voted && activity.date !== null) {
      throw new BusinessRuleError("Solo se pueden votar las ideas que todavía no tienen día.");
    }
    if (voted) await this.discussions.addVote(activityId, userId);
    else await this.discussions.removeVote(activityId, userId);
    await this.events.publish({ tripId: activity.tripId, topic: "discussion", actorId: userId });
  }

  async addComment(userId: string, activityId: string, input: CommentInput): Promise<Comment> {
    const activity = await this.loadActivity(userId, activityId);
    const { body } = parseInput(commentSchema, input);
    const comment = await this.discussions.addComment({ activityId, authorId: userId, body });
    await this.events.publish({ tripId: activity.tripId, topic: "discussion", actorId: userId });
    return comment;
  }

  /** Authors delete their own comments; the organizer can delete any. */
  async deleteComment(userId: string, commentId: string): Promise<void> {
    const comment = await this.discussions.findComment(commentId);
    if (!comment) throw new NotFoundError("Comentario");
    const activity = await this.activities.findById(comment.activityId);
    if (!activity) throw new NotFoundError("Comentario");

    const member = await this.access.require(activity.tripId, userId, "trip:view");
    if (comment.author.id !== userId && !hasPermission(member.role, "comment:moderate")) {
      throw new ForbiddenError();
    }
    await this.discussions.deleteComment(commentId);
    await this.events.publish({ tripId: activity.tripId, topic: "discussion", actorId: userId });
  }

  private async loadActivity(userId: string, activityId: string): Promise<Activity> {
    const activity = await this.activities.findById(activityId);
    if (!activity) throw new NotFoundError("Actividad");
    await this.access.require(activity.tripId, userId, "activity:discuss");
    return activity;
  }
}
