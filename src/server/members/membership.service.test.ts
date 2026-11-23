import { beforeEach, describe, expect, it } from "vitest";
import { BusinessRuleError, ForbiddenError, NotFoundError } from "../shared/errors";
import { createTestApp } from "../testing/in-memory";
import { INVITATION_TTL_DAYS } from "./invitation";

describe("MembershipService", () => {
  let app: ReturnType<typeof createTestApp>;
  let owner: { id: string };
  let friend: { id: string };
  let tripId: string;

  beforeEach(async () => {
    app = createTestApp();
    owner = app.addUser("Ana");
    friend = app.addUser("Bruno");
    const trip = await app.tripService.create(owner.id, {
      name: "Japón",
      destination: "Tokio",
      startDate: "2026-04-01",
      endDate: "2026-04-10",
    });
    tripId = trip.id;
  });

  describe("invitations", () => {
    it("lets a user join a trip through the invite link as EDITOR", async () => {
      const { token } = await app.membershipService.createInvitation(owner.id, tripId);

      const preview = await app.membershipService.previewInvitation(friend.id, token);
      expect(preview).toMatchObject({ trip: { name: "Japón" }, expired: false, alreadyMember: false });

      await app.membershipService.acceptInvitation(friend.id, token);

      const members = await app.membershipService.listMembers(friend.id, tripId);
      expect(members.map((m) => [m.user.name, m.role])).toEqual([
        ["Ana", "OWNER"],
        ["Bruno", "EDITOR"],
      ]);
    });

    it("is idempotent for existing members and never downgrades the owner", async () => {
      const { token } = await app.membershipService.createInvitation(owner.id, tripId);

      await app.membershipService.acceptInvitation(owner.id, token);

      const { role } = await app.tripService.get(owner.id, tripId);
      expect(role).toBe("OWNER");
    });

    it("rejects expired invitations", async () => {
      const { token } = await app.membershipService.createInvitation(owner.id, tripId);
      app.clock.advanceDays(INVITATION_TTL_DAYS + 1);

      await expect(app.membershipService.acceptInvitation(friend.id, token)).rejects.toBeInstanceOf(BusinessRuleError);
      expect(await app.membershipService.getActiveInvitation(owner.id, tripId)).toBeNull();
    });

    it("invalidates the previous link when a new one is generated", async () => {
      const first = await app.membershipService.createInvitation(owner.id, tripId);
      await app.membershipService.createInvitation(owner.id, tripId);

      await expect(app.membershipService.acceptInvitation(friend.id, first.token)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("only lets the owner create invite links", async () => {
      await app.repositories.members.add(tripId, friend.id, "EDITOR");
      await expect(app.membershipService.createInvitation(friend.id, tripId)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe("removing members", () => {
    beforeEach(async () => {
      await app.repositories.members.add(tripId, friend.id, "EDITOR");
    });

    it("lets the owner remove an editor", async () => {
      await app.membershipService.removeMember(owner.id, tripId, friend.id);
      await expect(app.tripService.get(friend.id, tripId)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("never removes the owner", async () => {
      await expect(app.membershipService.removeMember(owner.id, tripId, owner.id)).rejects.toBeInstanceOf(
        BusinessRuleError,
      );
    });

    it("lets editors leave but not the owner", async () => {
      await app.membershipService.leaveTrip(friend.id, tripId);
      expect(await app.repositories.members.find(tripId, friend.id)).toBeNull();

      await expect(app.membershipService.leaveTrip(owner.id, tripId)).rejects.toBeInstanceOf(BusinessRuleError);
    });
  });
});
