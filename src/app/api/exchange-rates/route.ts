import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { exchangeRateService } from "@/server/container";
import { ValidationError } from "@/server/shared/errors";

/**
 * GET /api/exchange-rates?from=USD&to=ARS
 *
 * Suggested rates for an expense paid in another currency. Only for
 * signed-in users, so it can't be used as an open proxy to the rate APIs.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  try {
    const quotes = await exchangeRateService.quotes({ from: params.get("from"), to: params.get("to") });
    return NextResponse.json({ quotes });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message, fieldErrors: error.fieldErrors }, { status: 400 });
    }
    throw error;
  }
}
