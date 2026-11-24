import type { DestinationPhoto } from "./cover";

/** Finds a representative photo of a place ("Bariloche, Argentina"). */
export interface DestinationPhotoSource {
  find(destination: string): Promise<DestinationPhoto | null>;
}

/** Where uploaded images are kept. */
export interface ImageStorage {
  /** Stores the file under a unique name based on `name` and returns its public URL. */
  save(name: string, bytes: Uint8Array, contentType: string): Promise<string>;
  /** Deletes a file previously returned by {@link save}. */
  delete(url: string): Promise<void>;
}
