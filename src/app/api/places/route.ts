import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { placeService } from "@/server/container";
import { PlaceSearchUnavailableError } from "@/server/places/place-search";
import { ValidationError } from "@/server/shared/errors";

/**
 * GET /api/places?q=cerro catedral&lat=-41.1&lon=-71.4
 *
 * Autocomplete for activity locations. Only for signed-in users, so the
 * endpoint can't be used as an open proxy to the geocoding provider.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  try {
    const places = await placeService.search({
      query: params.get("q"),
      nearLatitude: params.get("lat"),
      nearLongitude: params.get("lon"),
    });
    return NextResponse.json({ places });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, fieldErrors: error.fieldErrors }, { status: 400 });
    }
    if (error instanceof PlaceSearchUnavailableError) {
      console.error("[places] provider unavailable", error.cause);
      return NextResponse.json({ error: "El buscador de lugares no está disponible" }, { status: 502 });
    }
    throw error;
  }
}
