import type { Activity } from "../activities/activity";
import type { DestinationPhoto } from "./cover";
import type { DestinationPhotoSource } from "./ports";

/** Lowercase, no accents or punctuation: "Museo de la Patagonia (Bariloche)" → "museo de la patagonia bariloche". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Whether a photo found by searching really shows the activity: the
 * article's title must appear in the activity's title or location. A search
 * always returns *something* ("Desayuno en el Centro Cívico" finds an
 * article about a TV presenter), and a wrong photo is worse than none.
 */
export function photoMatches(photoTitle: string, activity: Pick<Activity, "title" | "location">): boolean {
  const title = normalize(photoTitle);
  if (title.length < 4) return false;
  const haystack = ` ${normalize(`${activity.title} ${activity.location ?? ""}`)} `;
  return haystack.includes(` ${title} `);
}

/** A photo of the place an activity is about, when one can be found reliably. */
export class ActivityPhotoService {
  constructor(private readonly photos: DestinationPhotoSource) {}

  async photoFor(
    activity: Pick<Activity, "title" | "location">,
    destination: string,
  ): Promise<DestinationPhoto | null> {
    // The destination narrows the search ("Catedral" alone is ambiguous).
    const city = destination.split(",")[0].trim();
    try {
      const photo = await this.photos.find(`${activity.title} ${city}`);
      return photo && photoMatches(photo.title, activity) ? photo : null;
    } catch (error) {
      console.warn("[photos] activity photo lookup failed", error);
      return null;
    }
  }
}
