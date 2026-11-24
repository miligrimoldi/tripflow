import "server-only";
import { del, put } from "@vercel/blob";
import type { ImageStorage } from "@/server/covers/ports";

/** Public files in Vercel Blob. The token comes from BLOB_READ_WRITE_TOKEN. */
export class VercelBlobImageStorage implements ImageStorage {
  async save(name: string, bytes: Uint8Array, contentType: string): Promise<string> {
    // The random suffix makes URLs unguessable and lets browsers cache each
    // version forever: a new photo always gets a new URL.
    const blob = await put(name, Buffer.from(bytes), { access: "public", contentType, addRandomSuffix: true });
    return blob.url;
  }

  async delete(url: string): Promise<void> {
    await del(url);
  }
}
