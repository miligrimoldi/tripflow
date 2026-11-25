import "server-only";
import { randomBytes } from "node:crypto";
import { ActivityService } from "./activities/activity.service";
import { AblyRealtime } from "./infrastructure/ably/ably-realtime";
import { RealtimeService } from "./realtime/realtime.service";
import { noTripEvents, type TripEventPublisher } from "./realtime/trip-events";
import { BudgetService } from "./budget/budget.service";
import { SettleUpService } from "./budget/settle-up.service";
import { ActivityPhotoService } from "./covers/activity-photo";
import { CoverService } from "./covers/cover.service";
import { ExchangeRateService } from "./currency/exchange-rate.service";
import type { ImageStorage } from "./covers/ports";
import { DiscussionService } from "./discussions/discussion.service";
import { env } from "./env";
import { DolarApiExchangeRates } from "./infrastructure/exchange/dolarapi-exchange-rates";
import { FrankfurterExchangeRates } from "./infrastructure/exchange/frankfurter-exchange-rates";
import { OpenMeteoWeather } from "./infrastructure/open-meteo/open-meteo-weather";
import { LocalDiskImageStorage } from "./infrastructure/storage/local-disk-image-storage";
import { VercelBlobImageStorage } from "./infrastructure/storage/vercel-blob-image-storage";
import { WikipediaDestinationPhotos } from "./infrastructure/wikipedia/wikipedia-destination-photos";
import { PhotonPlaceSearch } from "./infrastructure/photon/photon-place-search";
import { OsrmDirections } from "./infrastructure/routing/osrm-directions";
import { OsrmTravelCost } from "./infrastructure/routing/osrm-travel-cost";
import { prisma } from "./infrastructure/prisma/client";
import { PrismaDiscussionRepository } from "./infrastructure/prisma/prisma-discussion.repository";
import { PrismaActivityRepository } from "./infrastructure/prisma/prisma-activity.repository";
import { PrismaSettlementRepository } from "./infrastructure/prisma/prisma-settlement.repository";
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
import { WeatherService } from "./weather/weather.service";

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

// Real time over Ably when configured; otherwise changes show up on reload.
const ably = env.ABLY_API_KEY ? new AblyRealtime(env.ABLY_API_KEY) : null;
const tripEvents: TripEventPublisher = ably ?? noTripEvents;

export const realtimeService = new RealtimeService(ably, tripAccess);

// Vercel Blob when configured; the local disk only in development.
const imageStorage: ImageStorage | null = env.BLOB_READ_WRITE_TOKEN
  ? new VercelBlobImageStorage()
  : env.NODE_ENV === "development"
    ? new LocalDiskImageStorage()
    : null;

const wikipediaPhotos = new WikipediaDestinationPhotos();

export const coverService = new CoverService(tripRepository, wikipediaPhotos, imageStorage, tripAccess, tripEvents);

export const activityPhotoService = new ActivityPhotoService(wikipediaPhotos);

export const weatherService = new WeatherService(new OpenMeteoWeather());

export const tripService = new TripService(tripRepository, activityRepository, coverService, tripAccess, tripEvents);

export const activityService = new ActivityService(activityRepository, tripRepository, tripAccess, tripEvents);

export const membershipService = new MembershipService(
  membershipRepository,
  invitationRepository,
  tripRepository,
  tripAccess,
  secureTokens,
  systemClock,
  tripEvents,
);

export const budgetService = new BudgetService(
  expenseRepository,
  tripRepository,
  activityRepository,
  membershipRepository,
  tripAccess,
  tripEvents,
);

export const discussionService = new DiscussionService(
  new PrismaDiscussionRepository(prisma),
  activityRepository,
  tripAccess,
  tripEvents,
);

export const settleUpService = new SettleUpService(
  expenseRepository,
  new PrismaSettlementRepository(prisma),
  membershipRepository,
  tripAccess,
  tripEvents,
);

// DolarApi first: for anything involving pesos it has every dollar rate.
export const exchangeRateService = new ExchangeRateService([
  new DolarApiExchangeRates(),
  new FrankfurterExchangeRates(),
]);

export const placeService = new PlaceService(new PhotonPlaceSearch(env.PHOTON_URL));

// Roads when an OSRM server is configured (falling back to straight lines if
// it fails); straight lines otherwise.
const travelCost: TravelCostProvider = env.ROUTING_URL
  ? new FallbackTravelCost(new OsrmTravelCost(env.ROUTING_URL), new StraightLineTravelCost())
  : new StraightLineTravelCost();
const directions: DirectionsProvider = env.ROUTING_URL
  ? new FallbackDirections(new OsrmDirections(env.ROUTING_URL), new StraightLineDirections())
  : new StraightLineDirections();

export const routeService = new RouteService(activityRepository, tripRepository, travelCost, tripAccess, tripEvents);

export const directionsService = new DirectionsService(activityRepository, tripRepository, directions, tripAccess);
