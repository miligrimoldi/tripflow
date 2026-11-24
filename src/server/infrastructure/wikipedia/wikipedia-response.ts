import { z } from "zod";
import type { DestinationPhoto } from "@/server/covers/cover";

/**
 * The part of a MediaWiki `generator=search&prop=pageimages` response we use.
 * Docs: https://www.mediawiki.org/wiki/Extension:PageImages
 */
const searchSchema = z.object({
  query: z
    .object({
      pages: z.array(
        z.object({
          index: z.number().optional(),
          title: z.string(),
          pageimage: z.string().optional(),
          thumbnail: z.object({ source: z.url() }).optional(),
        }),
      ),
    })
    .optional(),
});

/**
 * The main photo of the best search result, or `null`. Vector images (SVG)
 * are skipped: for countries and provinces they are flags, coats of arms or
 * maps, which make a poor cover.
 */
export function parseWikipediaPhoto(json: unknown): DestinationPhoto | null {
  const parsed = searchSchema.safeParse(json);
  if (!parsed.success) throw new Error("Unexpected Wikipedia response");

  const pages = [...(parsed.data.query?.pages ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const best = pages[0];
  if (!best?.thumbnail || !best.pageimage || best.pageimage.toLowerCase().endsWith(".svg")) return null;

  return {
    url: best.thumbnail.source,
    title: best.title,
    creditUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(best.pageimage)}`,
  };
}
