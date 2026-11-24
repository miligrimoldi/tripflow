import { describe, expect, it } from "vitest";
import { joinNames, toDiscussionViews } from "./view";

describe("toDiscussionViews", () => {
  it("serializes dates and keeps only what the client needs", () => {
    const views = toDiscussionViews(
      new Map([
        [
          "museo",
          {
            votes: { count: 1, votedByMe: true, voters: ["Ana"] },
            comments: [
              {
                id: "c1",
                activityId: "museo",
                author: { id: "ana", name: "Ana" },
                body: "¿Vamos?",
                createdAt: new Date("2026-11-24T15:05:00Z"),
                canDelete: true,
              },
            ],
          },
        ],
      ]),
    );
    expect(views.museo.comments[0]).toEqual({
      id: "c1",
      authorName: "Ana",
      body: "¿Vamos?",
      createdAt: "2026-11-24T15:05:00.000Z",
      // 15:05 UTC is 12:05 in Buenos Aires.
      createdAtLabel: expect.stringMatching(/^24 nov.* 12:05$/),
      canDelete: true,
    });
  });
});

describe("joinNames", () => {
  it("joins names like a person would", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["Ana"])).toBe("Ana");
    expect(joinNames(["Ana", "Bruno"])).toBe("Ana y Bruno");
    expect(joinNames(["Ana", "Bruno", "Carla"])).toBe("Ana, Bruno y Carla");
  });
});
