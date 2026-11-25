import { describe, expect, it } from "vitest";
import { ActivityPhotoService, photoMatches } from "./activity-photo";
import type { DestinationPhotoSource } from "./ports";

const activity = (title: string, location: string | null = null) => ({ title, location });

describe("photoMatches", () => {
  it("accepts photos of the place the activity is about", () => {
    expect(photoMatches("Museo de la Patagonia", activity("Museo de la Patagonia"))).toBe(true);
    expect(photoMatches("Hotel Llao Llao", activity("Noche en el hotel llao llao"))).toBe(true);
    expect(photoMatches("Cerro Catedral", activity("Esquí", "Cerro Catedral, Bariloche"))).toBe(true);
    expect(photoMatches("Colonia Suiza", activity("Cena en Colonia Suiza"))).toBe(true);
  });

  it("rejects whatever else the search returned", () => {
    expect(photoMatches("Ernestina Pais", activity("Desayuno en el Centro Cívico"))).toBe(false);
    expect(photoMatches("San Carlos de Bariloche", activity("Cerro Campanario"))).toBe(false);
    // Whole words only: "Colon" is not "Colonia Suiza".
    expect(photoMatches("Colon", activity("Cena en Colonia Suiza"))).toBe(false);
  });
});

describe("ActivityPhotoService", () => {
  const source = (title: string): DestinationPhotoSource => ({
    find: async () => ({ url: "https://photos.test/p.jpg", title, creditUrl: "https://commons.test" }),
  });

  it("searches with the destination's city and keeps only matching photos", async () => {
    const queries: string[] = [];
    const recording: DestinationPhotoSource = {
      find: async (query) => {
        queries.push(query);
        return null;
      },
    };
    await new ActivityPhotoService(recording).photoFor(activity("Museo de la Patagonia"), "Bariloche, Argentina");
    expect(queries).toEqual(["Museo de la Patagonia Bariloche"]);

    const service = new ActivityPhotoService(source("Museo de la Patagonia"));
    expect(await service.photoFor(activity("Museo de la Patagonia"), "Bariloche")).not.toBeNull();
    expect(await new ActivityPhotoService(source("Ernestina Pais")).photoFor(activity("Desayuno"), "X")).toBeNull();
  });

  it("collects the reliable photos of several activities by id", async () => {
    const byQuery: DestinationPhotoSource = {
      find: async (query) =>
        query.startsWith("Museo")
          ? { url: "https://photos.test/museo.jpg", title: "Museo de la Patagonia", creditUrl: "x" }
          : { url: "https://photos.test/other.jpg", title: "Ernestina Pais", creditUrl: "x" },
    };
    const photos = await new ActivityPhotoService(byQuery).photosFor(
      [
        { id: "a", title: "Museo de la Patagonia", location: null },
        { id: "b", title: "Desayuno", location: null },
      ],
      "Bariloche",
    );
    expect(photos).toEqual({ a: "https://photos.test/museo.jpg" });
  });

  it("returns no photo when the source fails", async () => {
    const failing: DestinationPhotoSource = {
      find: async () => {
        throw new Error("down");
      },
    };
    expect(await new ActivityPhotoService(failing).photoFor(activity("Museo"), "Bariloche")).toBeNull();
  });
});
