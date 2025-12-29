// src/utils/mockRoute.ts
import { distanceMeters } from "./geoRisk";

export type LatLng = [number, number];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Tạo đường cong “giống đường đi” (mock)
// curveStrength: 0.0015–0.004 (tuỳ khoảng cách)
export function buildMockRoute(
  start: LatLng,
  end: LatLng,
  steps = 24,
  curveStrength = 0.0022
): LatLng[] {
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;

  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const len = Math.sqrt(dx * dx + dy * dy) + 1e-9;

  // vector vuông góc (perpendicular)
  const px = -dy / len;
  const py = dx / len;

  // scale theo độ dài (đường dài -> cong rõ hơn)
  const scale = Math.min(1.0, Math.max(0.35, len * 8)); // len ở "độ"
  const amp = curveStrength * scale;

  const pts: LatLng[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    let lat = lerp(lat1, lat2, t);
    let lng = lerp(lng1, lng2, t);

    // offset cong: sin(pi*t) để cong ở giữa
    const off = Math.sin(Math.PI * t) * amp;

    lat += py * off;
    lng += px * off;

    pts.push([lat, lng]);
  }
  return pts;
}

export function routeDistanceMeters(route: LatLng[]) {
  if (!route || route.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const [aLat, aLng] = route[i - 1];
    const [bLat, bLng] = route[i];
    total += distanceMeters(aLat, aLng, bLat, bLng);
  }
  return total;
}

export function formatKm(meters: number) {
  const km = meters / 1000;
  if (km < 1) return `${Math.round(meters)} m`;
  return `${km.toFixed(2)} km`;
}

// ETA mock: speedKmh mặc định 35 km/h
export function estimateEtaMinutes(meters: number, speedKmh = 35) {
  const km = meters / 1000;
  const hours = km / speedKmh;
  return Math.max(1, Math.round(hours * 60));
}