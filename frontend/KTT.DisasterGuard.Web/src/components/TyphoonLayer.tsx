import { GeoJSON } from "react-leaflet";
import L from "leaflet";
import { createPinIcon } from "../utils/markerIcons";

// GeoJSON FeatureCollection (backend trả)
type FC = {
  type: "FeatureCollection";
  features: any[];
  meta?: any;
};

export default function TyphoonLayer({ data }: { data: FC }) {
  const centerIcon = createPinIcon("#0ea5e9", "TC");     // storm center
  const forecastIcon = createPinIcon("#38bdf8", "F");    // forecast point

  return (
    <GeoJSON
      data={data as any}
      style={(feature: any) => {
        const kind = feature?.properties?.kind;
        if (kind === "forecast_track") {
          return { color: "#0ea5e9", weight: 3, opacity: 0.9, dashArray: "6 6" };
        }
        return { color: "#0ea5e9", weight: 2, opacity: 0.8 };
      }}
      pointToLayer={(feature: any, latlng) => {
        const kind = feature?.properties?.kind;
        if (kind === "storm_center") {
          return L.marker(latlng, { icon: centerIcon, zIndexOffset: 5000 });
        }
        if (kind === "forecast_point") {
          return L.marker(latlng, { icon: forecastIcon, zIndexOffset: 4500 });
        }
        return L.circleMarker(latlng, { radius: 6 });
      }}
      onEachFeature={(feature: any, layer) => {
        const p = feature?.properties || {};
        const kind = p.kind;

        if (kind === "storm_center" || kind === "forecast_point") {
          const time = p.timeUtc ? new Date(p.timeUtc).toLocaleString() : "";
          const fh = typeof p.forecastHour === "number" ? `+${p.forecastHour}h` : "";
          const pressure = p.pressureHpa ? `${p.pressureHpa} hPa` : "N/A";
          const wind = p.maxWindMs ? `${p.maxWindMs} m/s` : "N/A";

          const html = `
            <div>
              <b>🌀 ${p.name || "Typhoon"}</b><br/>
              ${kind === "storm_center" ? "<b>Center</b>" : `<b>Forecast</b> ${fh}`}<br/>
              Time: ${time}<br/>
              Pressure: ${pressure}<br/>
              Wind: ${wind}<br/>
              <small>Provider: ${p.provider || "JMA"}</small>
            </div>
          `;
          (layer as any).bindPopup(html);
        }
      }}
    />
  );
}