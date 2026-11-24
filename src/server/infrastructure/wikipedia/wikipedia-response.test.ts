import { describe, expect, it } from "vitest";
import { parseWikipediaPhoto } from "./wikipedia-response";

const page = (pageimage: string, index = 1) => ({
  index,
  pageimage,
  thumbnail: { source: `https://upload.wikimedia.org/thumb/${pageimage}/1600px-${pageimage}` },
});

describe("parseWikipediaPhoto", () => {
  it("returns the best result's photo with a link to its license page", () => {
    expect(
      parseWikipediaPhoto({ query: { pages: [page("Otra.jpg", 2), page("Catedral de Bariloche.jpg", 1)] } }),
    ).toEqual({
      url: "https://upload.wikimedia.org/thumb/Catedral de Bariloche.jpg/1600px-Catedral de Bariloche.jpg",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Catedral%20de%20Bariloche.jpg",
    });
  });

  it("skips flags and maps (SVG), articles without a photo and empty searches", () => {
    expect(parseWikipediaPhoto({ query: { pages: [page("Flag_of_Argentina.svg")] } })).toBeNull();
    expect(parseWikipediaPhoto({ query: { pages: [{ index: 1 }] } })).toBeNull();
    expect(parseWikipediaPhoto({ batchcomplete: true })).toBeNull();
  });

  it("rejects unexpected responses", () => {
    expect(() => parseWikipediaPhoto({ query: { pages: "nope" } })).toThrow();
  });
});
