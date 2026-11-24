import "server-only";
import { randomBytes } from "node:crypto";
import { ActivityService } from "./activities/activity.service";
import { BudgetService } from "./budget/budget.service";
import { DiscussionService } from "./discussions/discussion.service";
import { env } from "./env";
import { PhotonPlaceSearch } from "./infrastructure/photon/photon-place-search";
import { OsrmTravelCost } from "./infrastructure/routing/osrm-travel-cost";
import { prisma } from "./infrastructure/prisma/client";
import { PrismaDiscussionRepository } from "./infrastructure/prisma/prisma-discussion.repository";
import { PrismaActivityRepository } from "./infrastructure/prisma/prisma-activity.repository";
import { PrismaExpenseRepository } from "./infrastructure/prisma/prisma-expense.repository";
import { PrismaInvitationRepository } from "./infrastructure/prisma/prisma-invitation.repository";
import { PrismaMembershipRepository } from "./infrastructure/prisma/prisma-membership.repository";
import { PrismaTripRepository } from "./infrastructure/prisma/prisma-trip.repository";
import { MembershipService } from "./members/membership.service";
import { PlaceService } from "./places/place.service";
import { RouteService } from "./routes/route.service";
import { FallbackTravelCost, StraightLineTravelCost, type TravelCostProvider } from "./routes/travel-cost";
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
const expenseRepository = new PrismaExpenseRepository(prisma);

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

export const budgetService = new BudgetService(
  expenseRepository,
  tripRepository,
  activityRepository,
  membershipRepository,
  tripAccess,
);

export const discussionService = new DiscussionService(
  new PrismaDiscussionRepository(prisma),
  activityRepository,
  tripAccess,
);

export const placeService = new PlaceService(new PhotonPlaceSearch(env.PHOTON_URL));

// Road times when an OSRM server is configured (falling back to straight
// lines if it fails); straight-line distances otherwise.
const travelCost: TravelCostProvider = env.ROUTING_URL
  ? new FallbackTravelCost(new OsrmTravelCost(env.ROUTING_URL), new StraightLineTravelCost())
  : new StraightLineTravelCost();

export const routeService = new RouteService(activityRepository, tripRepository, travelCost, tripAccess);
