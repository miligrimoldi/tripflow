import "server-only";
import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth/session";
import { tripService } from "@/server/container";

/** Page title for a trip route, only revealed to the trip's members. */
export async function tripMetadata(tripId: string, section?: string): Promise<Metadata> {
  const user = await getCurrentUser();
  if (!user) return {};
  try {
    const { trip } = await tripService.get(user.id, tripId);
    return { title: section ? `${section} · ${trip.name}` : trip.name };
  } catch {
    return {};
  }
}
