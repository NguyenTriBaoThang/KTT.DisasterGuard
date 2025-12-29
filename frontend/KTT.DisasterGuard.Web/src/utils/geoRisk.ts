// src/utils/geoRisk.ts

export type Disaster = {
  id: string;
  type: string;
  severity: string; // LOW|MEDIUM|HIGH|CRITICAL
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  polygonGeoJson?: string | null;
  createdAt: string;
  isActive: boolean;
};

export type RiskHit = {
  disasterId: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reason: "CIRCLE" | "POLYGON";
};

export type RiskResult = {
  inRisk: boolean;
  topSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  hits: RiskHit[];
};

const severityRank: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export function severityColor(sev?: string) {
  const s = (sev || "").toUpperCase();
  if (s === "CRITICAL") return "#dc2626"; // red
  if (s === "HIGH") return "#f97316"; // orange
  if (s === "MEDIUM") return "#eab308"; // yellow
  return "#16a34a"; // green
}

// Haversine distance (meters)
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// point = [lng, lat]
function pointInRing(point: [number, number], ring: [number, number][]) {
  // Ray-casting
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: [number, number], rings: [number, number][][]) {
  // rings[0] = outer, rings[1..] = holes
  if (!rings || rings.length === 0) return false;

  const outer = rings[0];
  if (!pointInRing(point, outer)) return false;

  // if inside any hole -> false
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(point, rings[i])) return false;
  }
  return true;
}

function pointInMultiPolygon(point: [number, number], polys: [number, number][][][]) {
  for (const rings of polys) {
    if (pointInPolygon(point, rings)) return true;
  }
  return false;
}

// Accept: GeoJSON Geometry | Feature | FeatureCollection
export function geoJsonContainsPoint(geo: any, lat: number, lng: number) {
  if (!geo) return false;

  // unwrap Feature/FeatureCollection
  if (geo.type === "Feature") return geoJsonContainsPoint(geo.geometry, lat, lng);
  if (geo.type === "FeatureCollection") {
    return (geo.features || []).some((f: any) => geoJsonContainsPoint(f, lat, lng));
  }

  const point: [number, number] = [lng, lat];

  if (geo.type === "Polygon") {
    // coordinates: [ [ [lng,lat], ... ] , hole... ]
    return pointInPolygon(point, geo.coordinates);
  }

  if (geo.type === "MultiPolygon") {
    // coordinates: [ Polygon1Rings, Polygon2Rings, ...]
    return pointInMultiPolygon(point, geo.coordinates);
  }

  return false;
}

export function analyzeRisk(lat: number, lng: number, disasters: Disaster[]): RiskResult {
  const hits: RiskHit[] = [];

  for (const d of disasters || []) {
    if (!d?.isActive) continue;

    const sev = ((d.severity || "MEDIUM").toUpperCase() as any) as RiskHit["severity"];

    // 1) Circle check
    const dist = distanceMeters(lat, lng, d.centerLat, d.centerLng);
    if (dist <= (d.radiusMeters || 0)) {
      hits.push({ disasterId: d.id, type: d.type, severity: sev, reason: "CIRCLE" });
      continue; // circle already hit, no need polygon
    }

    // 2) Polygon check (optional)
    if (d.polygonGeoJson) {
      try {
        const geo = JSON.parse(d.polygonGeoJson);
        if (geoJsonContainsPoint(geo, lat, lng)) {
          hits.push({ disasterId: d.id, type: d.type, severity: sev, reason: "POLYGON" });
        }
      } catch {
        // ignore invalid geojson
      }
    }
  }

  if (hits.length === 0) {
    return { inRisk: false, topSeverity: null, hits: [] };
  }

  const top = hits.reduce((best, cur) => {
    const b = severityRank[best.severity] || 0;
    const c = severityRank[cur.severity] || 0;
    return c > b ? cur : best;
  });

  return { inRisk: true, topSeverity: top.severity, hits };
}

export function buildSafetyAdvice(type?: string, severity?: string) {
  const t = (type || "").toUpperCase();
  const s = (severity || "").toUpperCase();

  if (t.includes("FLOOD") || t.includes("LŨ")) {
    return "⚠ Khuyến nghị: tránh khu vực thấp trũng/ngập, di chuyển lên nơi cao ráo an toàn, theo dõi thông báo chính quyền.";
  }
  if (t.includes("STORM") || t.includes("BÃO")) {
    return "⚠ Khuyến nghị: ở trong nơi kiên cố, tránh cây lớn/cột điện, theo dõi cảnh báo thời tiết và hướng dẫn sơ tán.";
  }
  if (t.includes("LANDSLIDE") || t.includes("SẠT")) {
    return "⚠ Khuyến nghị: tránh sườn dốc/khu vực có nguy cơ sạt lở, di chuyển đến nơi an toàn và cập nhật cảnh báo.";
  }

  if (s === "CRITICAL") return "⚠ Cảnh báo mức CRITICAL: ưu tiên rời khỏi khu vực nguy hiểm và tìm nơi trú ẩn an toàn.";
  if (s === "HIGH") return "⚠ Cảnh báo mức HIGH: hạn chế di chuyển, theo dõi thông báo và chuẩn bị phương án an toàn.";
  return "⚠ Cảnh báo: theo dõi thông tin và tránh khu vực rủi ro.";
}