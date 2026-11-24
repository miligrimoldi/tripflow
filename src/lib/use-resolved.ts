"use client";

import { useEffect, useState } from "react";

/**
 * The value of a promise streamed from a server component, or `fallback`
 * until it settles (and if it fails). Unlike `use()`, it never suspends: the
 * UI renders right away and fills in when the data arrives. A new promise
 * (after a refresh) replaces the value once it resolves.
 */
export function useResolved<T>(promise: Promise<T>, fallback: T): T {
  const [settled, setSettled] = useState<{ promise: Promise<T>; value: T } | null>(null);

  useEffect(() => {
    let active = true;
    promise.then(
      (value) => active && setSettled({ promise, value }),
      (error: unknown) => console.warn("[stream] optional data failed to load", error),
    );
    return () => {
      active = false;
    };
  }, [promise]);

  // Keep showing the previous value while a newer promise is pending, so
  // photos don't flash away after every change to the itinerary.
  return settled?.value ?? fallback;
}
