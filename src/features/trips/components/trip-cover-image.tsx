import Image from "next/image";
import { cn } from "@/lib/cn";
import { coverService } from "@/server/container";
import type { Trip } from "@/server/trips/trip";
import { coverTexture, tripCover } from "../trip-visuals";

interface TripCoverImageProps {
  trip: Pick<Trip, "id" | "destination" | "coverImageUrl">;
  /** Rendered width, for the browser to pick an image size (see next/image `sizes`). */
  sizes: string;
  /** Darkens the photo where text sits on top of it. */
  overlay: "top" | "bottom";
  /** Load it first: it is the largest element above the fold. */
  priority?: boolean;
  /** Shows the photo's credit (not inside links, where it would nest anchors). */
  showCredit?: boolean;
  /** Shown only when there is no photo (decorations over the gradient). */
  fallback?: React.ReactNode;
}

const OVERLAYS = {
  top: "bg-linear-to-b from-slate-950/55 via-slate-950/10 to-transparent",
  bottom: "bg-linear-to-t from-slate-950/80 via-slate-950/35 to-slate-950/10",
};

/**
 * The trip's photo filling its parent (which must be `relative`): the
 * uploaded one or a photo of the destination. Without either, the trip's
 * gradient.
 */
export async function TripCoverImage({ trip, sizes, overlay, priority, showCredit, fallback }: TripCoverImageProps) {
  const cover = await coverService.coverFor(trip);

  if (!cover) {
    return (
      <div aria-hidden className={cn("absolute inset-0 bg-linear-to-br", tripCover(trip.id))}>
        <div className={cn("absolute inset-0", coverTexture)} />
        {fallback}
      </div>
    );
  }

  return (
    <>
      <Image
        src={cover.url}
        // Decorative: the trip's name and destination are written on top.
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover transition duration-500 group-hover:scale-105"
      />
      <div aria-hidden className={cn("absolute inset-0", OVERLAYS[overlay])} />
      {showCredit && cover.credit && (
        <a
          href={cover.credit.href}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-4 z-10 text-[10px] font-medium text-white/70 hover:text-white hover:underline"
        >
          Foto: {cover.credit.label}
        </a>
      )}
    </>
  );
}
