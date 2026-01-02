export type StormPoint = {
  tHours: number; // +12h, +24h...
  lat: number;
  lng: number;
  windKmh: number;
  pressureHpa: number;
};

export type Storm = {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  windKmh: number;
  pressureHpa: number;
  updatedAt: string;
  forecast: StormPoint[];
};

function isoNow() {
  return new Date().toISOString();
}

export function buildMockStorms(): Storm[] {
  // Demo: 2 "cơn" di chuyển về phía VN (chỉ để trình bày proposal)
  const s1: Storm = {
    id: "storm-01",
    name: "TYPHOON DEMO A",
    centerLat: 14.2,
    centerLng: 116.0,
    windKmh: 120,
    pressureHpa: 965,
    updatedAt: isoNow(),
    forecast: [
      { tHours: 12, lat: 14.8, lng: 114.5, windKmh: 125, pressureHpa: 960 },
      { tHours: 24, lat: 15.6, lng: 113.0, windKmh: 130, pressureHpa: 955 },
      { tHours: 36, lat: 16.2, lng: 111.6, windKmh: 125, pressureHpa: 960 },
      { tHours: 48, lat: 16.9, lng: 110.3, windKmh: 110, pressureHpa: 970 },
      { tHours: 72, lat: 18.0, lng: 108.8, windKmh: 90, pressureHpa: 980 },
    ],
  };

  const s2: Storm = {
    id: "storm-02",
    name: "TROPICAL STORM DEMO B",
    centerLat: 11.2,
    centerLng: 112.5,
    windKmh: 70,
    pressureHpa: 995,
    updatedAt: isoNow(),
    forecast: [
      { tHours: 12, lat: 11.6, lng: 111.2, windKmh: 75, pressureHpa: 992 },
      { tHours: 24, lat: 12.1, lng: 110.1, windKmh: 80, pressureHpa: 988 },
      { tHours: 36, lat: 12.6, lng: 109.2, windKmh: 75, pressureHpa: 992 },
      { tHours: 48, lat: 13.0, lng: 108.5, windKmh: 65, pressureHpa: 998 },
    ],
  };

  return [s1, s2];
}
