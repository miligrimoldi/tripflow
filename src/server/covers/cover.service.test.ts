import { beforeEach, describe, expect, it } from "vitest";
import { TripAccessPolicy } from "../members/trip-access";
import { ForbiddenError, NotFoundError, ValidationError } from "../shared/errors";
import { createTestApp } from "../testing/in-memory";
import { MAX_COVER_BYTES } from "./cover";
import { CoverService } from "./cover.service";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const BARILOCHE = {
  url: "https://photos.test/catedral.jpg",
  title: "San Carlos de Bariloche",
  creditUrl: "https://commons.test/File:Catedral.jpg",
};

describe("CoverService", () => {
  let app: ReturnType<typeof createTestApp>;
  let ana: { id: string };
  let tripId: string;

  beforeEach(async () => {
    app = createTestApp();
    ana = app.addUser("Ana");
    ({ id: tripId } = await app.tripService.create(ana.id, {
      name: "Patagonia",
      destination: "Bariloche, Argentina",
      startDate: "2026-07-10",
      endDate: "2026-07-12",
    }));
    app.destinationPhotos.photos.set("Bariloche, Argentina", BARILOCHE);
  });

  const cover = async () => app.coverService.coverFor((await app.tripService.get(ana.id, tripId)).trip);

  it("uses a photo of the destination by default, with its credit", async () => {
    expect(await cover()).toEqual({
      url: BARILOCHE.url,
      source: "destination",
      credit: { label: "Wikimedia Commons", href: BARILOCHE.creditUrl },
    });
  });

  it("falls back to no photo when the destination has none or the source fails", async () => {
    app.destinationPhotos.photos.clear();
    expect(await cover()).toBeNull();

    app.destinationPhotos.failing = true;
    expect(await cover()).toBeNull();
  });

  it("prefers the uploaded photo and replaces the old file on a new upload", async () => {
    const first = await app.coverService.upload(ana.id, tripId, { bytes: JPEG });
    expect(await cover()).toEqual({ url: first.coverImageUrl, source: "upload", credit: null });
    expect(app.storage.files.get(first.coverImageUrl!)?.contentType).toBe("image/jpeg");
    expect(first.coverImageUrl).toMatch(new RegExp(`covers/${tripId}\\.jpg$`));

    const second = await app.coverService.upload(ana.id, tripId, { bytes: PNG });
    expect([...app.storage.files.keys()]).toEqual([second.coverImageUrl]);
  });

  it("goes back to the destination photo when the upload is removed", async () => {
    await app.coverService.upload(ana.id, tripId, { bytes: JPEG });
    await app.coverService.remove(ana.id, tripId);

    expect((await cover())?.source).toBe("destination");
    expect(app.storage.files.size).toBe(0);
  });

  it("deletes the uploaded photo with the trip", async () => {
    await app.coverService.upload(ana.id, tripId, { bytes: JPEG });
    await app.tripService.delete(ana.id, tripId);
    expect(app.storage.files.size).toBe(0);
  });

  it("only accepts real JPEG, PNG or WebP files up to 4 MB", async () => {
    const svg = new TextEncoder().encode('<svg onload="alert(1)"></svg>');
    const huge = new Uint8Array(MAX_COVER_BYTES + 1);
    huge.set(JPEG);

    for (const bytes of [svg, huge, new Uint8Array()]) {
      await expect(app.coverService.upload(ana.id, tripId, { bytes })).rejects.toBeInstanceOf(ValidationError);
    }
    expect(app.storage.files.size).toBe(0);
  });

  it("lets only the organizer change the cover", async () => {
    const bruno = app.addUser("Bruno");
    await app.repositories.members.add(tripId, bruno.id, "EDITOR");
    await expect(app.coverService.upload(bruno.id, tripId, { bytes: JPEG })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(app.coverService.remove(bruno.id, tripId)).rejects.toBeInstanceOf(ForbiddenError);

    const carla = app.addUser("Carla");
    await expect(app.coverService.upload(carla.id, tripId, { bytes: JPEG })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses uploads when no storage is configured", async () => {
    const service = new CoverService(
      app.repositories.trips,
      app.destinationPhotos,
      null,
      new TripAccessPolicy(app.repositories.members),
    );
    expect(service.uploadsEnabled).toBe(false);
    await expect(service.upload(ana.id, tripId, { bytes: JPEG })).rejects.toBeInstanceOf(ValidationError);
  });
});
