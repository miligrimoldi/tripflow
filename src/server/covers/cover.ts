/** What the trip's cover shows. */
export interface TripCover {
  url: string;
  source: "upload" | "destination";
  /** Credit for photos taken from elsewhere (required by their license). */
  credit: { label: string; href: string } | null;
}

/** A photo of a destination found in an external source. */
export interface DestinationPhoto {
  url: string;
  /** Page with the photo's author and license. */
  creditUrl: string;
}

/**
 * Comfortably above what the browser sends after resizing (usually a few
 * hundred KB) and below Vercel's 4.5 MB request limit.
 */
export const MAX_COVER_BYTES = 4 * 1024 * 1024;

export const COVER_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type CoverType = keyof typeof COVER_TYPES;

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);

/**
 * The image type according to the file's own bytes ("magic numbers"), not
 * to its name or the type the browser claims: those are trivial to fake. SVG
 * is deliberately not accepted, since it can carry scripts.
 */
export function detectImageType(bytes: Uint8Array): CoverType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // "RIFF" + 4 bytes of size + "WEBP".
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}
