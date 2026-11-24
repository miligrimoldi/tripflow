import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ImageStorage } from "@/server/covers/ports";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_PATH = "/uploads";

/**
 * Development-only storage in `public/uploads` (git-ignored), so the app can
 * be run locally without a Vercel account. It can't work in production:
 * serverless file systems are read-only and not shared between instances.
 */
export class LocalDiskImageStorage implements ImageStorage {
  async save(name: string, bytes: Uint8Array): Promise<string> {
    const { dir, name: base, ext } = path.parse(name);
    const relative = path.posix.join(UPLOADS_PATH, dir, `${base}-${randomBytes(6).toString("hex")}${ext}`);
    const file = path.join(PUBLIC_DIR, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    return relative;
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith(`${UPLOADS_PATH}/`)) return;
    const file = path.join(PUBLIC_DIR, path.normalize(url));
    // Never delete anything outside the uploads folder.
    if (!file.startsWith(path.join(PUBLIC_DIR, UPLOADS_PATH) + path.sep)) return;
    await rm(file, { force: true });
  }
}
