import L from "leaflet";

// Tạo pin SVG màu (không cần icon web)
function svgPin(color: string, label: string) {
  const safeLabel = (label || "").slice(0, 3);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="54" viewBox="0 0 40 54">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
    </defs>
    <path filter="url(#shadow)"
      d="M20 52s16-14.3 16-30C36 10.4 28.8 3 20 3S4 10.4 4 22c0 15.7 16 30 16 30z"
      fill="${color}" stroke="rgba(0,0,0,0.18)" stroke-width="1.2"/>
    <circle cx="20" cy="21" r="10.5" fill="white" opacity="0.92"/>
    <text x="20" y="25" text-anchor="middle" font-size="11.5"
      font-family="system-ui, Arial" font-weight="900" fill="#111827">${safeLabel}</text>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

export function createPinIcon(color: string, label: string) {
  return L.icon({
    iconUrl: svgPin(color, label),
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40],
  });
}