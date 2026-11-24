import "server-only";
import { randomBytes } from "node:crypto";
import { ActivityService } from "./activities/activity.service";
import { env } from "./env";
import { PhotonPlaceSearch } from "./infrastructure/photon/photon-place-search";
import { prisma } from "./infrastructure/prisma/client";
import { PrismaActivityRepository } from "./infrastructure/prisma/prisma-activity.repository";
import { PrismaInvitationRepository } from "./infrastructure/prisma/prisma-invitation.repository";
import { PrismaMembershipRepository } from "./infrastructure/prisma/prisma-membership.repository";
import { PrismaTripRepository } from "./infrastructure/prisma/prisma-trip.repository";
import { MembershipService } from "./members/membership.service";
import { PlaceService } from "./places/place.service";
import { TripAccessPolicy } from "./members/trip-access";
import { systemClock, type TokenGenerator } from "./shared/ports";
import { TripService } from "./trips/trip.service";

/**
 * Composition root: the only place that knows which concrete implementations
 * back each port. Services receive their dependencies through constructors,
 * so tests can wire them with in-memory fakes instead.
 */

const secureTokens: TokenGenerator = {
  generate: () => randomBytes(24).toString("base64url"),
};

const tripRepository = new PrismaTripRepository(prisma);
const activityRepository = new PrismaActivityRepository(prisma);
const membershipRepository = new PrismaMembershipRepository(prisma);
const invitationRepository = new PrismaInvitationRepository(prisma);

const tripAccess = new TripAccessPolicy(membershipRepository);

export const tripService = new TripService(tripRepository, activityRepository, tripAccess);

export const activityService = new ActivityService(activityRepository, tripRepository, tripAccess);

export const membershipService = new MembershipService(
  membershipRepository,
  invitationRepository,
  tripRepository,
  tripAccess,
  secureTokens,
  systemClock,
);

export const placeService = new PlaceService(new PhotonPlaceSearch(env.PHOTON_URL));
