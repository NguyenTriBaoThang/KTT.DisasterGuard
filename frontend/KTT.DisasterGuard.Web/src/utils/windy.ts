export type WindyOverlay = "wind" | "rainAccu" | "pressure";

export function buildWindyEmbedUrl(
  lat: number,
  lon: number,
  overlay: WindyOverlay,
  zoom = 7
) {
  // Windy embed2 parameters (overlay: wind/rainAccu/pressure...) :contentReference[oaicite:2]{index=2}
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    detailLat: String(lat),
    detailLon: String(lon),
    width: "100%",
    height: "100%",
    zoom: String(zoom),
    level: "surface",
    overlay,
    product: "ecmwf",
    menu: "",
    message: "",
    marker: "",
    calendar: "now",
    pressure: "",
    type: "map",
    location: "coordinates",
    detail: "",
    metricWind: "kmh",
    metricTemp: "°C",
    radarRange: "-1",
  });

  return `https://embed.windy.com/embed2.html?${params.toString()}`;
}

export function buildWindyExternalUrl(
  lat: number,
  lon: number,
  overlay: WindyOverlay,
  zoom = 7
) {
  // Open windy full site (not embed)
  return `https://www.windy.com/?${overlay},${lat},${lon},${zoom}`;
}