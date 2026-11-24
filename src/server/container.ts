import "server-only";
import { randomBytes } from "node:crypto";
import { ActivityService } from "./activities/activity.service";
import { BudgetService } from "./budget/budget.service";
import { CoverService } from "./covers/cover.service";
import type { ImageStorage } from "./covers/ports";
import { DiscussionService } from "./discussions/discussion.service";
import { env } from "./env";
import { LocalDiskImageStorage } from "./infrastructure/storage/local-disk-image-storage";
import { VercelBlobImageStorage } from "./infrastructure/storage/vercel-blob-image-storage";
import { WikipediaDestinationPhotos } from "./infrastructure/wikipedia/wikipedia-destination-photos";
import { PhotonPlaceSearch } from "./infrastructure/photon/photon-place-search";
import { OsrmDirections } from "./infrastructure/routing/osrm-directions";
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
import { FallbackDirections, StraightLineDirections, type DirectionsProvider } from "./routes/directions";
import { DirectionsService } from "./routes/directions.service";
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

// Vercel Blob when configured; the local disk only in development.
const imageStorage: ImageStorage | null = env.BLOB_READ_WRITE_TOKEN
  ? new VercelBlobImageStorage()
  : env.NODE_ENV === "development"
    ? new LocalDiskImageStorage()
    : null;

export const coverService = new CoverService(
  tripRepository,
  new WikipediaDestinationPhotos(),
  imageStorage,
  tripAccess,
);

export const tripService = new TripService(tripRepository, activityRepository, coverService, tripAccess);

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

// Roads when an OSRM server is configured (falling back to straight lines if
// it fails); straight lines otherwise.
const travelCost: TravelCostProvider = env.ROUTING_URL
  ? new FallbackTravelCost(new OsrmTravelCost(env.ROUTING_URL), new StraightLineTravelCost())
  : new StraightLineTravelCost();
const directions: DirectionsProvider = env.ROUTING_URL
  ? new FallbackDirections(new OsrmDirections(env.ROUTING_URL), new StraightLineDirections())
  : new StraightLineDirections();

export const routeService = new RouteService(activityRepository, tripRepository, travelCost, tripAccess);

export const directionsService = new DirectionsService(activityRepository, tripRepository, directions, tripAccess);
