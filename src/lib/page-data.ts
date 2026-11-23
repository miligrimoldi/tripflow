import "server-only";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/server/shared/errors";

/** Awaits a service call, turning a domain NotFoundError into Next's 404 page. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
