export type OverlayId = "none" | "wind" | "rainAccu" | "pressure";

export function overlayLabel(id: OverlayId) {
  if (id === "wind") return "Wind";
  if (id === "rainAccu") return "Rain Accu";
  if (id === "pressure") return "Pressure";
  return "None";
}

// OpenWeatherMap tiles (dữ liệu thật) — cần API key
export function overlayTileUrl(id: OverlayId, apiKey: string) {
  if (id === "wind") return `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${apiKey}`;
  if (id === "pressure") return `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${apiKey}`;
  if (id === "rainAccu") return `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`;
  return "";
}

export function overlayAttribution() {
  return "&copy; OpenWeatherMap";
}