/** A point on Earth in decimal degrees (WGS 84, as used by OpenStreetMap). */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function isValidCoordinates({ latitude, longitude }: Coordinates): boolean {
  return (
    Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
  );
}

/**
 * Average of a set of points, or `null` if there are none. Good enough to
 * bias place searches toward where a trip is happening (trips span a small
 * area, so we don't need spherical math).
 */
export function centroid(points: Coordinates[]): Coordinates | null {
  if (points.length === 0) return null;
  const sum = points.reduce(
    (acc, point) => ({ latitude: acc.latitude + point.latitude, longitude: acc.longitude + point.longitude }),
    { latitude: 0, longitude: 0 },
  );
  return { latitude: sum.latitude / points.length, longitude: sum.longitude / points.length };
}
