import { beforeEach, describe, expect, it } from "vitest";
import { BusinessRuleError, ForbiddenError, NotFoundError, ValidationError } from "../shared/errors";
import { createTestApp } from "../testing/in-memory";

describe("DiscussionService", () => {
  let app: ReturnType<typeof createTestApp>;
  let ana: { id: string };
  let bruno: { id: string };
  let tripId: string;
  let ideaId: string;

  beforeEach(async () => {
    app = createTestApp();
    ana = app.addUser("Ana");
    bruno = app.addUser("Bruno");
    ({ id: tripId } = await app.tripService.create(ana.id, {
      name: "Patagonia",
      destination: "Bariloche",
      startDate: "2026-07-10",
      endDate: "2026-07-12",
    }));
    await app.repositories.members.add(tripId, bruno.id, "EDITOR");
    ({ id: ideaId } = await app.activityService.create(ana.id, tripId, { title: "Kayak en el lago" }));
  });

  const discussionOf = async (userId: string, activityId = ideaId) =>
    (await app.discussionService.getForTrip(userId, tripId)).get(activityId);

  describe("votes", () => {
    it("records one vote per member and lets them take it back", async () => {
      await app.discussionService.setVote(ana.id, ideaId, { voted: true });
      await app.discussionService.setVote(ana.id, ideaId, { voted: true });
      await app.discussionService.setVote(bruno.id, ideaId, { voted: true });
      expect((await discussionOf(ana.id))?.votes).toEqual({ count: 2, votedByMe: true, voters: ["Ana", "Bruno"] });

      await app.discussionService.setVote(ana.id, ideaId, { voted: false });
      expect((await discussionOf(ana.id))?.votes).toMatchObject({ count: 1, votedByMe: false });
    });

    it("only allows voting ideas, but a vote can still be removed after scheduling", async () => {
      await app.discussionService.setVote(ana.id, ideaId, { voted: true });
      await app.activityService.move(ana.id, ideaId, { date: "2026-07-10" });

      await expect(app.discussionService.setVote(bruno.id, ideaId, { voted: true })).rejects.toBeInstanceOf(
        BusinessRuleError,
      );
      await app.discussionService.setVote(ana.id, ideaId, { voted: false });
      expect(await discussionOf(ana.id)).toBeUndefined();
    });

    it("validates the input", async () => {
      await expect(app.discussionService.setVote(ana.id, ideaId, { voted: "yes" })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe("comments", () => {
    it("adds trimmed comments in order", async () => {
      await app.discussionService.addComment(ana.id, ideaId, { body: "  ¿Lo reservamos?  " });
      await app.discussionService.addComment(bruno.id, ideaId, { body: "Dale, el sábado" });

      const comments = (await discussionOf(bruno.id))?.comments ?? [];
      expect(comments.map((c) => [c.author.name, c.body, c.canDelete])).toEqual([
        ["Ana", "¿Lo reservamos?", false],
        ["Bruno", "Dale, el sábado", true],
      ]);
    });

    it("rejects empty or too long comments", async () => {
      await expect(app.discussionService.addComment(ana.id, ideaId, { body: "   " })).rejects.toBeInstanceOf(
        ValidationError,
      );
      await expect(app.discussionService.addComment(ana.id, ideaId, { body: "a".repeat(1001) })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it("lets authors and the organizer delete comments, nobody else", async () => {
      const byAna = await app.discussionService.addComment(ana.id, ideaId, { body: "Mío" });
      const byBruno = await app.discussionService.addComment(bruno.id, ideaId, { body: "De Bruno" });
      const another = await app.discussionService.addComment(bruno.id, ideaId, { body: "Otro" });

      await expect(app.discussionService.deleteComment(bruno.id, byAna.id)).rejects.toBeInstanceOf(ForbiddenError);
      await app.discussionService.deleteComment(bruno.id, byBruno.id);
      await app.discussionService.deleteComment(ana.id, another.id); // organizer
      expect((await discussionOf(ana.id))?.comments.map((c) => c.body)).toEqual(["Mío"]);
    });
  });

  it("hides everything from non-members", async () => {
    const carla = app.addUser("Carla");
    const comment = await app.discussionService.addComment(ana.id, ideaId, { body: "Hola" });

    await expect(app.discussionService.getForTrip(carla.id, tripId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(app.discussionService.setVote(carla.id, ideaId, { voted: true })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(app.discussionService.addComment(carla.id, ideaId, { body: "x" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(app.discussionService.deleteComment(carla.id, comment.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(app.discussionService.setVote(ana.id, "missing", { voted: true })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
