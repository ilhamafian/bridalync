export function buildWazeNavigateUrl(lat: number, lng: number) {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

export function buildWazeDeepLink(lat: number, lng: number) {
  return `waze://?ll=${lat},${lng}&navigate=yes`;
}

export function buildGoogleMapsNavigateUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function isNavigableLocation(location: {
  placeId?: string;
  location?: { lat: number; lng: number };
} | null | undefined) {
  if (!location?.location) return false;
  if (location.placeId === "travel-disabled") return false;
  const { lat, lng } = location.location;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}
