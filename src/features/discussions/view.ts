import type { Discussion } from "@/server/discussions/discussion";

/** A discussion ready to cross to the client: plain data, dates already formatted. */
export interface DiscussionView {
  votes: Discussion["votes"];
  comments: {
    id: string;
    authorName: string;
    body: string;
    /** ISO date, for the <time> element. */
    createdAt: string;
    /** "24 nov, 09:14". */
    createdAtLabel: string;
    canDelete: boolean;
  }[];
}

export type DiscussionViews = Record<string, DiscussionView>;

export const NO_DISCUSSION: DiscussionView = { votes: { count: 0, votedByMe: false, voters: [] }, comments: [] };

// Formatted on the server (so server and client render the same text) in the
// app's time zone: TripFlow is for Argentine travelers, like its es-AR copy.
const commentDate = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function toDiscussionViews(discussions: ReadonlyMap<string, Discussion>): DiscussionViews {
  return Object.fromEntries(
    [...discussions].map(([activityId, { votes, comments }]) => [
      activityId,
      {
        votes,
        comments: comments.map((comment) => ({
          id: comment.id,
          authorName: comment.author.name,
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
          createdAtLabel: commentDate.format(comment.createdAt),
          canDelete: comment.canDelete,
        })),
      },
    ]),
  );
}

/** "Ana", "Ana y Bruno", "Ana, Bruno y Carla". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
}
