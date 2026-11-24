import type { TripAccessPolicy } from "../members/trip-access";
import { NotFoundError, ValidationError } from "../shared/errors";
import type { Trip } from "../trips/trip";
import type { TripRepository } from "../trips/trip.repository";
import { COVER_TYPES, detectImageType, MAX_COVER_BYTES, type TripCover } from "./cover";
import type { DestinationPhotoSource, ImageStorage } from "./ports";

const fileError = (message: string) => new ValidationError(message, { cover: [message] });

/**
 * The photo on top of a trip: the one the organizer uploaded or, by
 * default, a photo of the destination.
 */
export class CoverService {
  constructor(
    private readonly trips: Pick<TripRepository, "findById" | "updateCover">,
    private readonly photos: DestinationPhotoSource,
    /** `null` when no storage is configured: uploads are disabled. */
    private readonly storage: ImageStorage | null,
    private readonly access: TripAccessPolicy,
  ) {}

  get uploadsEnabled(): boolean {
    return this.storage !== null;
  }

  /**
   * Cover of a trip the caller already loaded (and so is allowed to see).
   * Never fails: without a photo, the UI falls back to a gradient.
   */
  async coverFor(trip: Pick<Trip, "coverImageUrl" | "destination">): Promise<TripCover | null> {
    if (trip.coverImageUrl) return { url: trip.coverImageUrl, source: "upload", credit: null };
    try {
      const photo = await this.photos.find(trip.destination);
      return photo
        ? { url: photo.url, source: "destination", credit: { label: "Wikimedia Commons", href: photo.creditUrl } }
        : null;
    } catch (error) {
      console.warn("[covers] destination photo lookup failed", error);
      return null;
    }
  }

  async upload(userId: string, tripId: string, file: { bytes: Uint8Array }): Promise<Trip> {
    const trip = await this.loadEditable(userId, tripId);
    const storage = this.requireStorage();

    if (file.bytes.length === 0) throw fileError("Elegí una foto");
    if (file.bytes.length > MAX_COVER_BYTES) throw fileError("La foto puede pesar como máximo 4 MB");
    const type = detectImageType(file.bytes);
    if (!type) throw fileError("La foto tiene que ser JPG, PNG o WebP");

    const url = await storage.save(`covers/${tripId}.${COVER_TYPES[type]}`, file.bytes, type);
    const updated = await this.trips.updateCover(tripId, url);
    await this.discard(trip.coverImageUrl);
    return updated;
  }

  /** Goes back to the destination's photo. */
  async remove(userId: string, tripId: string): Promise<Trip> {
    const trip = await this.loadEditable(userId, tripId);
    const updated = await this.trips.updateCover(tripId, null);
    await this.discard(trip.coverImageUrl);
    return updated;
  }

  /** Deletes an uploaded file. Best effort: a leftover file must not fail the user's action. */
  async discard(url: string | null): Promise<void> {
    if (!url || !this.storage) return;
    try {
      await this.storage.delete(url);
    } catch (error) {
      console.warn("[covers] could not delete an old cover", error);
    }
  }

  private async loadEditable(userId: string, tripId: string): Promise<Trip> {
    await this.access.require(tripId, userId, "trip:edit");
    const trip = await this.trips.findById(tripId);
    if (!trip) throw new NotFoundError("Viaje");
    return trip;
  }

  private requireStorage(): ImageStorage {
    if (!this.storage) throw fileError("La subida de fotos no está configurada en este servidor");
    return this.storage;
  }
}
