import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/api";
import MapLegend from "./MapLegend";
import DisasterTestPanel from "./DisasterTestPanel";
import { getRoleFromToken, getUserIdFromToken } from "../auth/auth";
import SosPanel from "./SosPanel";
import { startRealtime, getRealtimeConnection, stopRealtime } from "../realtime/realtime";

const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
  iconSize: [28, 28],
});

const sosIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/564/564619.png",
  iconSize: [32, 32],
});

type Location = {
  userId?: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
};

type Sos = {
  id: string;
  userId: string;
  rescuerId?: string | null;

  latitude: number;
  longitude: number;

  status: string;
  createdAt: string;

  updatedAt?: string;
  acceptedAt?: string | null;
  rescuedAt?: string | null;
  cancelledAt?: string | null;
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
  const s = (sev || "").toUpperCase();
  if (s === "CRITICAL") return "red";
  if (s === "HIGH") return "orange";
  if (s === "MEDIUM") return "gold";
  return "green";
}

function shortGuid(g?: string | null) {
  if (!g) return "";
  return `${g.slice(0, 8)}...`;
}

// Component nhỏ để map flyTo khi chọn SOS
function FlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    map.flyTo(position, 16, { duration: 0.6 });
  }, [position, map]);
  return null;
}

export default function MapDashboard() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [sosList, setSosList] = useState<Sos[]>([]);
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [needRescueRole, setNeedRescueRole] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sosFilter, setSosFilter] = useState<string>("ACTIVE");
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);

  const role = (getRoleFromToken() || "").toUpperCase();
  const myUserId = (getUserIdFromToken() || "").toLowerCase();

  const isRescueOrAdmin = role === "RESCUE" || role === "ADMIN";
  const isAdmin = role === "ADMIN";

  const reloadTimer = useRef<any>(null);

  useEffect(() => {
    loadData();

    const timer = setInterval(loadData, 15000); // fallback
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sosFilter]);

  // ✅ SignalR realtime subscribe
  useEffect(() => {
    let mounted = true;

    (async () => {
      await startRealtime();
      if (!mounted) return;

      const conn = getRealtimeConnection();

      const scheduleReload = () => {
        if (reloadTimer.current) return;
        reloadTimer.current = setTimeout(() => {
          reloadTimer.current = null;
          loadData();
        }, 400);
      };

      // ✅ Locations: upsert để mượt
      conn.on("locationUpdated", (p: any) => {
        // p: { userId, latitude, longitude, accuracy, updatedAt }
        const u = String(p?.userId || "");
        if (!u) return;

        setLocations((prev) => {
          const idx = prev.findIndex((x) => String(x.userId || "").toLowerCase() === u.toLowerCase());
          const next: Location = {
            userId: u,
            latitude: p.latitude,
            longitude: p.longitude,
            updatedAt: p.updatedAt,
          };

          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...next };
            return copy;
          }
          return [next, ...prev];
        });
      });

      // ✅ SOS: do filter nhiều trạng thái -> debounced reload cho chắc 100%
      conn.on("sosUpdated", () => {
        scheduleReload();
      });

      // ✅ Disaster: update map
      conn.on("disasterUpdated", (d: Disaster) => {
        if (!d?.id) return;

        setDisasters((prev) => {
          if (!d.isActive) return prev.filter((x) => x.id !== d.id);

          const idx = prev.findIndex((x) => x.id === d.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...d };
            return copy;
          }
          return [d, ...prev];
        });
      });

      conn.onreconnected(() => scheduleReload());
      conn.onclose(() => scheduleReload());
    })();

    return () => {
      mounted = false;
      const conn = getRealtimeConnection();
      conn.off("locationUpdated");
      conn.off("sosUpdated");
      conn.off("disasterUpdated");
      stopRealtime().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sosFilter]);

  async function loadData() {
    const sosUrl =
      sosFilter === "ACTIVE" ? "/api/sos" : `/api/sos?status=${encodeURIComponent(sosFilter)}`;

    const results = await Promise.allSettled([
      api.get("/api/location/active"),
      api.get(sosUrl),
      api.get("/api/disaster/active"),
    ]);

    // locations
    if (results[0].status === "fulfilled") {
      setLocations(results[0].value.data || []);
    } else {
      const status = (results[0].reason?.response?.status ?? 0) as number;
      if (status === 403) setNeedRescueRole(true);
      setLocations([]);
    }

    // sos
    if (results[1].status === "fulfilled") {
      setSosList(results[1].value.data || []);
    } else {
      const status = (results[1].reason?.response?.status ?? 0) as number;
      if (status === 403) setNeedRescueRole(true);
      setSosList([]);
    }

    // disasters
    if (results[2].status === "fulfilled") {
      setDisasters(results[2].value.data || []);
    } else {
      setDisasters([]);
    }
  }

  async function acceptSos(id: string) {
    setBusyId(id);
    try {
      await api.post(`/api/sos/${id}/accept`);
      // realtime sẽ tự cập nhật, nhưng gọi reload nhẹ cho chắc
      await loadData();
      alert("✅ Đã nhận SOS");
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 403) alert("❌ Không đủ quyền (cần RESCUE/ADMIN).");
      else alert("❌ Không thể nhận SOS (có thể đã được người khác nhận).");
    } finally {
      setBusyId(null);
    }
  }

  async function updateSosStatus(id: string, status: "RESCUED" | "CANCELLED") {
    const ok = confirm(`Xác nhận cập nhật trạng thái: ${status}?`);
    if (!ok) return;

    setBusyId(id);
    try {
      await api.patch(`/api/sos/${id}/status`, { status });
      await loadData();
      alert(`✅ Đã cập nhật: ${status}`);
    } catch (e: any) {
      const code = e?.response?.status;
      if (code === 403) alert("❌ Không đủ quyền hoặc SOS không thuộc bạn.");
      else alert("❌ Không thể cập nhật trạng thái.");
    } finally {
      setBusyId(null);
    }
  }

  const geoJsonLayers = useMemo(() => {
    return disasters
      .filter((d) => d.polygonGeoJson)
      .map((d) => {
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
      <MapContainer center={[10.8231, 106.6297]} zoom={12} style={{ height: "100vh", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* FlyTo khi chọn SOS */}
        <FlyTo position={selectedPos} />

        {/* DISASTER ZONES (Circle) */}
        {disasters.map((d) => (
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

        {/* DISASTER ZONES (Polygon GeoJSON) */}
        {geoJsonLayers.map(({ d, geo }) => (
          <GeoJSON
            key={`${d.id}-geo`}
            data={geo}
            style={{ color: severityColor(d.severity), weight: 2, fillOpacity: 0.1 }}
          />
        ))}

        {/* USER LOCATIONS */}
        {locations.map((l, i) => (
          <Marker key={`loc-${l.userId ?? i}`} position={[l.latitude, l.longitude]} icon={userIcon} zIndexOffset={1000}>
            <Popup>
              📍 <b>Người dùng</b><br />
              Cập nhật: {new Date(l.updatedAt).toLocaleString()}
            </Popup>
          </Marker>
        ))}

        {/* SOS markers */}
        {sosList.map((s, i) => {
          const st = (s.status || "").toUpperCase();
          const id = s.id || `idx-${i}`;
          const rescuerId = (s.rescuerId || "").toLowerCase();
          const assignedToMe = !!myUserId && !!rescuerId && rescuerId === myUserId;

          return (
            <div key={`sos-${id}`}>
              <Marker position={[s.latitude, s.longitude]} icon={sosIcon} zIndexOffset={2000}>
                <Popup>
                  🚨 <b>SOS</b><br />
                  Status: <b>{st}</b><br />
                  Time: {new Date(s.createdAt).toLocaleString()}<br />
                  {s.rescuerId ? (
                    <>Rescuer: {assignedToMe ? <b>YOU</b> : shortGuid(s.rescuerId)}<br /></>
                  ) : (
                    <>Rescuer: <i>Chưa nhận</i><br /></>
                  )}

                  {/* ACTIONS */}
                  {isRescueOrAdmin ? (
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {st === "PENDING" && (
                        <button style={btnStyle} disabled={busyId === id} onClick={() => acceptSos(id)}>
                          {busyId === id ? "..." : "✅ Nhận SOS"}
                        </button>
                      )}

                      {st === "ACCEPTED" && (assignedToMe || isAdmin) && (
                        <>
                          <button
                            style={{ ...btnStyle, background: "#16a34a", color: "white", border: "none" }}
                            disabled={busyId === id}
                            onClick={() => updateSosStatus(id, "RESCUED")}
                          >
                            {busyId === id ? "..." : "🏁 Đã cứu"}
                          </button>

                          <button
                            style={{ ...btnStyle, background: "#dc2626", color: "white", border: "none" }}
                            disabled={busyId === id}
                            onClick={() => updateSosStatus(id, "CANCELLED")}
                          >
                            {busyId === id ? "..." : "✖ Hủy"}
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                      (Chỉ <b>RESCUE/ADMIN</b> mới xử lý)
                    </div>
                  )}
                </Popup>
              </Marker>

              <Circle center={[s.latitude, s.longitude]} radius={300} pathOptions={{ color: "red", fillOpacity: 0.2 }} />
            </div>
          );
        })}
      </MapContainer>

      {needRescueRole && (
        <div style={hintStyle}>
          ⚠ Dashboard cần quyền <b>RESCUE/ADMIN</b> để xem SOS & Locations.
        </div>
      )}

      <MapLegend />

      {/* Panel điều phối SOS */}
      <SosPanel
        role={role || "USER"}
        myUserId={myUserId}
        isAdmin={isAdmin}
        sosList={sosList}
        filter={sosFilter}
        setFilter={(f) => setSosFilter(f)}
        busyId={busyId}
        onSelect={(id, lat, lng) => setSelectedPos([lat, lng])}
        onAccept={acceptSos}
        onUpdateStatus={updateSosStatus}
      />

      {/* Panel mock disaster chỉ hiện khi có quyền */}
      {isRescueOrAdmin && <DisasterTestPanel />}
    </>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const hintStyle: React.CSSProperties = {
  position: "absolute",
  top: 70,
  left: 16,
  zIndex: 1600,
  background: "white",
  padding: 10,
  borderRadius: 10,
  boxShadow: "0 0 6px rgba(0,0,0,0.25)",
  fontSize: 13,
};