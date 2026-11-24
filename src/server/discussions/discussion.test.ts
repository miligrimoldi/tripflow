import { describe, expect, it } from "vitest";
import { mostVoted, summarizeDiscussions, type Comment, type Discussion } from "./discussion";

const ana = { id: "ana", name: "Ana" };
const bruno = { id: "bruno", name: "Bruno" };

const comment = (id: string, activityId: string, author: typeof ana, second: number): Comment => ({
  id,
  activityId,
  author,
  body: id,
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, second)),
});

describe("summarizeDiscussions", () => {
  const votes = [
    { activityId: "museo", user: ana },
    { activityId: "museo", user: bruno },
    { activityId: "kayak", user: bruno },
  ];
  const comments = [comment("second", "museo", bruno, 2), comment("first", "museo", ana, 1)];

  it("counts votes and remembers whether the viewer voted", () => {
    const result = summarizeDiscussions(votes, comments, { userId: "ana", canModerate: false });
    expect(result.get("museo")?.votes).toEqual({ count: 2, votedByMe: true, voters: ["Ana", "Bruno"] });
    expect(result.get("kayak")?.votes).toEqual({ count: 1, votedByMe: false, voters: ["Bruno"] });
    expect(result.has("cena")).toBe(false);
  });

  it("sorts comments oldest first and lets authors delete their own", () => {
    const result = summarizeDiscussions(votes, comments, { userId: "ana", canModerate: false });
    expect(result.get("museo")?.comments.map((c) => [c.id, c.canDelete])).toEqual([
      ["first", true],
      ["second", false],
    ]);
  });

  it("lets moderators delete any comment", () => {
    const result = summarizeDiscussions([], comments, { userId: "carla", canModerate: true });
    expect(result.get("museo")?.comments.every((c) => c.canDelete)).toBe(true);
  });
});

describe("mostVoted", () => {
  const withVotes = (counts: Record<string, number>) =>
    new Map(
      Object.entries(counts).map(([id, count]): [string, Discussion] => [
        id,
        { votes: { count, votedByMe: false, voters: [] }, comments: [] },
      ]),
    );

  it("picks the idea that clearly leads", () => {
    expect(mostVoted(["a", "b", "c"], withVotes({ a: 1, b: 3 }))).toBe("b");
  });

  it("highlights nothing on a tie or without votes", () => {
    expect(mostVoted(["a", "b"], withVotes({ a: 2, b: 2 }))).toBeNull();
    expect(mostVoted(["a", "b"], withVotes({}))).toBeNull();
    expect(mostVoted([], withVotes({}))).toBeNull();
  });

  it("only considers the given ideas", () => {
    expect(mostVoted(["a"], withVotes({ a: 1, scheduled: 5 }))).toBe("a");
  });
});
