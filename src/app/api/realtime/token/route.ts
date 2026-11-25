import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { realtimeService } from "@/server/container";
import { NotFoundError } from "@/server/shared/errors";

/**
 * GET /api/realtime/token?tripId=…
 *
 * Called by the browser's real-time SDK (as its `authUrl`) to get a token
 * for one trip's channel. Only members get one: the token is what stops
 * anyone else from listening to a trip.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const tripId = request.nextUrl.searchParams.get("tripId");
  if (!tripId) return NextResponse.json({ error: "Falta el viaje" }, { status: 400 });

  try {
    const token = await realtimeService.tokenFor(user.id, tripId);
    if (!token) return NextResponse.json({ error: "Tiempo real no configurado" }, { status: 503 });
    return NextResponse.json(token, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof NotFoundError) return NextResponse.json({ error: "Viaje no encontrado" }, { status: 404 });
    throw error;
  }
}
