import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/api";
import MapLegend from "./MapLegend";
import DisasterTestPanel from "./DisasterTestPanel";

const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
  iconSize: [28, 28],
});

const sosIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/564/564619.png",
  iconSize: [32, 32],
});

type Location = {
  latitude: number;
  longitude: number;
  updatedAt: string;
};

type Sos = {
  latitude: number;
  longitude: number;
  createdAt: string;
};

type Disaster = {
  id: string;
  type: string;
  severity: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  polygonGeoJson?: string | null;
  createdAt: string;
  isActive: boolean;
};

function severityColor(sev: string) {
  const s = sev.toUpperCase();
  if (s === "CRITICAL") return "red";
  if (s === "HIGH") return "orange";
  if (s === "MEDIUM") return "gold";
  return "green";
}

export default function MapDashboard() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [sosList, setSosList] = useState<Sos[]>([]);
  const [disasters, setDisasters] = useState<Disaster[]>([]);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, []);

  async function loadData() {
    try {
      const [locRes, sosRes, disRes] = await Promise.all([
        api.get("/api/location/active"),
        api.get("/api/sos"),
        api.get("/api/disaster/active"),
      ]);
      setLocations(locRes.data);
      setSosList(sosRes.data);
      setDisasters(disRes.data);
    } catch (err) {
      console.error("Load map data error", err);
    }
  }

  const geoJsonLayers = useMemo(() => {
    return disasters
      .filter(d => d.polygonGeoJson)
      .map(d => {
        try {
          return { d, geo: JSON.parse(d.polygonGeoJson as string) };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as { d: Disaster; geo: any }[];
  }, [disasters]);

  return (
    <>
      <MapContainer
        center={[10.8231, 106.6297]}
        zoom={12}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* DISASTER ZONES (Circle) */}
        {disasters.map(d => (
          <Circle
            key={d.id}
            center={[d.centerLat, d.centerLng]}
            radius={d.radiusMeters}
            pathOptions={{ color: severityColor(d.severity), fillOpacity: 0.12 }}
          >
            <Popup>
              🌪️ <b>Disaster Alert</b><br />
              Type: {d.type}<br />
              Severity: {d.severity}<br />
              Radius: {d.radiusMeters}m<br />
              Time: {new Date(d.createdAt).toLocaleString()}
            </Popup>
          </Circle>
        ))}

        {/* DISASTER ZONES (Polygon GeoJSON - optional) */}
        {geoJsonLayers.map(({ d, geo }) => (
          <GeoJSON
            key={`${d.id}-geo`}
            data={geo}
            style={{ color: severityColor(d.severity), weight: 2, fillOpacity: 0.1 }}
          />
        ))}

        {/* USER LOCATIONS */}
        {locations.map((l, i) => (
          <Marker key={`loc-${i}`} position={[l.latitude, l.longitude]} icon={userIcon} zIndexOffset={1000}>
            <Popup>
              📍 <b>Người dùng</b><br />
              Cập nhật: {new Date(l.updatedAt).toLocaleString()}
            </Popup>
          </Marker>
        ))}

        {/* SOS */}
        {sosList.map((s, i) => (
          <div key={`sos-${i}`}>
            <Marker position={[s.latitude, s.longitude]} icon={sosIcon} zIndexOffset={2000}>
              <Popup>
                🚨 <b>SOS khẩn cấp</b><br />
                {new Date(s.createdAt).toLocaleString()}
              </Popup>
            </Marker>
            <Circle
              center={[s.latitude, s.longitude]}
              radius={300}
              pathOptions={{ color: "red", fillOpacity: 0.2 }}
            />
          </div>
        ))}
      </MapContainer>

      <MapLegend />

      <DisasterTestPanel />
    </>
  );
}