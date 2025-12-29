import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  GeoJSON,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/api";
import MapLegend from "./MapLegend";
import DisasterTestPanel from "./DisasterTestPanel";
import { getRoleFromToken, getUserIdFromToken } from "../auth/auth";
import SosPanel from "./SosPanel";
import { distanceMeters } from "../utils/geoRisk";
import { estimateEtaMinutes, formatKm } from "../utils/mockRoute";

import {
  analyzeRisk,
  buildSafetyAdvice,
  severityColor,
  Disaster as DisasterType,
} from "../utils/geoRisk";
import { createPinIcon } from "../utils/markerIcons";
import {
  buildMockRoute,
  routeDistanceMeters,
  LatLng,
} from "../utils/mockRoute";
import RoutePanel from "./RoutePanel";

type Location = {
  userId?: string; // ✅ thêm để biết vị trí của rescuer
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

  status: string; // PENDING | ACCEPTED | RESCUED | CANCELLED
  createdAt: string;

  updatedAt?: string;
  acceptedAt?: string | null;
  rescuedAt?: string | null;
  cancelledAt?: string | null;
};

type Disaster = DisasterType;

function shortGuid(g?: string | null) {
  if (!g) return "";
  return `${g.slice(0, 8)}...`;
}

function FlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    map.flyTo(position, 16, { duration: 0.6 });
  }, [position, map]);
  return null;
}

// Fit bounds theo route
function FitRoute({ points }: { points: LatLng[] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length < 2) return;
    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [points, map]);
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

  // ✅ Route states
  const [routePoints, setRoutePoints] = useState<LatLng[] | null>(null);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeMeta, setRouteMeta] = useState<{ from: string; to: string } | null>(null);
  const [routeSosId, setRouteSosId] = useState<string | null>(null);

  const role = (getRoleFromToken() || "").toUpperCase();
  const myUserId = (getUserIdFromToken() || "").toLowerCase();

  const isRescueOrAdmin = role === "RESCUE" || role === "ADMIN";
  const isAdmin = role === "ADMIN";

  const RESCUE_BASE: LatLng = [10.8231, 106.6297]; // mock base (HCM)

  // ICONS
  const icons = useMemo(() => {
    const safeUser = createPinIcon("#2563eb", "U");
    const safeSos = createPinIcon("#dc2626", "SOS");

    const make = (sev: string, label: string) => createPinIcon(severityColor(sev), label);

    return {
      user: {
        SAFE: safeUser,
        LOW: make("LOW", "U"),
        MEDIUM: make("MEDIUM", "U"),
        HIGH: make("HIGH", "U"),
        CRITICAL: make("CRITICAL", "U"),
      },
      sos: {
        SAFE: safeSos,
        LOW: make("LOW", "SOS"),
        MEDIUM: make("MEDIUM", "SOS"),
        HIGH: make("HIGH", "SOS"),
        CRITICAL: make("CRITICAL", "SOS"),
      },
    };
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sosFilter]);

  async function loadData() {
    const sosUrl =
      sosFilter === "ACTIVE"
        ? "/api/sos"
        : `/api/sos?status=${encodeURIComponent(sosFilter)}`;

    const results = await Promise.allSettled([
      api.get("/api/location/active"),
      api.get(sosUrl),
      api.get("/api/disaster/active"),
    ]);

    if (results[0].status === "fulfilled") {
      setLocations(results[0].value.data || []);
    } else {
      const status = (results[0].reason?.response?.status ?? 0) as number;
      if (status === 403) setNeedRescueRole(true);
      setLocations([]);
    }

    if (results[1].status === "fulfilled") {
      setSosList(results[1].value.data || []);
    } else {
      const status = (results[1].reason?.response?.status ?? 0) as number;
      if (status === 403) setNeedRescueRole(true);
      setSosList([]);
    }

    if (results[2].status === "fulfilled") {
      setDisasters(results[2].value.data || []);
    } else {
      setDisasters([]);
    }
  }

  async function acceptSos(id: string, silent = false): Promise<boolean> {
    setBusyId(id);
    try {
      await api.post(`/api/sos/${id}/accept`);
      await loadData();
      if (!silent) alert("✅ Đã nhận SOS");
      return true;
    } catch (e: any) {
      const status = e?.response?.status;
      if (!silent) {
        if (status === 403) alert("❌ Không đủ quyền (cần RESCUE/ADMIN).");
        else alert("❌ Không thể nhận SOS (có thể đã được người khác nhận).");
      }
      return false;
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

  // GeoJSON layers
  const geoJsonLayers = useMemo(() => {
    return (disasters || [])
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

  // Risk precompute
  const locationWithRisk = useMemo(() => {
    return (locations || []).map((l) => {
      const r = analyzeRisk(l.latitude, l.longitude, disasters || []);
      return { l, r };
    });
  }, [locations, disasters]);

  const sosWithRisk = useMemo(() => {
    return (sosList || []).map((s) => {
      const r = analyzeRisk(s.latitude, s.longitude, disasters || []);
      return { s, r };
    });
  }, [sosList, disasters]);

  // ✅ tìm vị trí của rescuer (chính bạn)
  const myRescuerPos: LatLng = useMemo(() => {
    const me = (locations || []).find((x) => (x.userId || "").toLowerCase() === myUserId);
    if (me) return [me.latitude, me.longitude];
    return RESCUE_BASE;
  }, [locations, myUserId]);

  const nearestPending = useMemo(() => {
    if (!isRescueOrAdmin) return null;

    const pending = (sosList || []).filter(s => (s.status || "").toUpperCase() === "PENDING");
    if (pending.length === 0) return null;

    let best = pending[0];
    let bestDist = Infinity;

    for (const s of pending) {
      const d = distanceMeters(myRescuerPos[0], myRescuerPos[1], s.latitude, s.longitude);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }

    return { sos: best, distMeters: bestDist, etaMin: estimateEtaMinutes(bestDist) };
  }, [sosList, myRescuerPos, isRescueOrAdmin]);

  const nearestPendingId = nearestPending?.sos?.id ?? null;
  const nearestPendingInfo = nearestPending
    ? `${formatKm(nearestPending.distMeters)} • ~${nearestPending.etaMin} phút`
    : "";

  function clearRoute() {
    setRoutePoints(null);
    setRouteDistance(0);
    setRouteMeta(null);
    setRouteSosId(null);
  }

  // ✅ gợi ý route tới SOS
  function routeTo(lat: number, lng: number, sosId?: string) {
    const start = myRescuerPos;
    const end: LatLng = [lat, lng];

    const pts = buildMockRoute(start, end, 26, 0.0022);
    const dist = routeDistanceMeters(pts);

    setRoutePoints(pts);
    setRouteDistance(dist);
    setRouteMeta({
      from: start === RESCUE_BASE ? "Rescue Base (mock)" : "My location (rescuer)",
      to: sosId ? `SOS ${sosId.slice(0, 8)}...` : "SOS",
    });
    setRouteSosId(sosId || null);

    // auto zoom
    setSelectedPos([lat, lng]);
  }

  async function acceptAndRoute(id: string, lat: number, lng: number) {
    const ok = await acceptSos(id, true);
    if (!ok) {
      // nếu fail -> reload & thử lại nearest mới
      await loadData();
      return;
    }
    routeTo(lat, lng, id);
    alert("⚡ Đã nhận & gợi ý tuyến đường");
  }

  async function acceptAndRouteNearest() {
    if (!nearestPending) {
      alert("Không có SOS PENDING.");
      return;
    }
    const s = nearestPending.sos;
    await acceptAndRoute(s.id, s.latitude, s.longitude);
  }

  // ✅ Auto-route: nếu có SOS ACCEPTED thuộc bạn, tự vẽ route
  useEffect(() => {
    if (!isRescueOrAdmin) return;

    const myAccepted = (sosList || []).find((s) => {
      const st = (s.status || "").toUpperCase();
      const rid = (s.rescuerId || "").toLowerCase();
      return st === "ACCEPTED" && rid && rid === myUserId;
    });

    if (!myAccepted) return;

    // tránh spam vẽ lại nếu đang vẽ đúng SOS đó
    if (routeSosId && routeSosId === myAccepted.id) return;

    routeTo(myAccepted.latitude, myAccepted.longitude, myAccepted.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sosList, myUserId, isRescueOrAdmin]);

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

        <FlyTo position={selectedPos} />

        {/* ✅ Route polyline */}
        {routePoints && (
          <>
            <FitRoute points={routePoints} />
            <Polyline
              positions={routePoints}
              pathOptions={{
                color: "#E91E63",
                weight: 5,
                opacity: 0.9,
              }}
            />
          </>
        )}

        {/* DISASTER ZONES (Circle) */}
        {(disasters || []).map((d) => (
          <Circle
            key={d.id}
            center={[d.centerLat, d.centerLng]}
            radius={d.radiusMeters}
            pathOptions={{
              color: severityColor(d.severity),
              fillOpacity: 0.12,
              weight: 2,
            }}
          >
            <Popup>
              🌪️ <b>Disaster Alert</b>
              <br />
              Type: {d.type}
              <br />
              Severity: <b>{(d.severity || "").toUpperCase()}</b>
              <br />
              Radius: {d.radiusMeters}m
              <br />
              Time: {new Date(d.createdAt).toLocaleString()}
            </Popup>
          </Circle>
        ))}

        {/* DISASTER ZONES (Polygon GeoJSON) */}
        {geoJsonLayers.map(({ d, geo }) => (
          <GeoJSON
            key={`${d.id}-geo`}
            data={geo}
            style={{
              color: severityColor(d.severity),
              weight: 2,
              fillOpacity: 0.1,
            }}
          />
        ))}

        {/* USER LOCATIONS + risk highlight */}
        {locationWithRisk.map(({ l, r }, i) => {
          const inRisk = r.inRisk;
          const sev = (r.topSeverity || "LOW").toUpperCase();
          const color = severityColor(sev);

          const icon = inRisk
            ? (icons.user as any)[sev] || icons.user.MEDIUM
            : icons.user.SAFE;

          return (
            <div key={`loc-${i}`}>
              <Marker
                position={[l.latitude, l.longitude]}
                icon={icon}
                zIndexOffset={1000}
              >
                <Popup>
                  📍 <b>Người dùng</b>
                  <br />
                  Cập nhật: {new Date(l.updatedAt).toLocaleString()}
                  <br />
                  {l.userId && (
                    <>
                      UserId: {shortGuid(l.userId)}
                      <br />
                    </>
                  )}

                  {inRisk ? (
                    <>
                      <hr />
                      ⚠ <b style={{ color }}>Inside zone</b>
                      <br />
                      Severity: <b>{sev}</b>
                      <br />
                      Hits: {r.hits.length}
                      <br />
                      {buildSafetyAdvice(r.hits[0]?.type, sev)}
                    </>
                  ) : (
                    <>
                      <hr />
                      ✅ <b>Outside zone</b>
                    </>
                  )}
                </Popup>
              </Marker>

              {inRisk && (
                <Circle
                  center={[l.latitude, l.longitude]}
                  radius={120}
                  pathOptions={{
                    color,
                    fillOpacity: 0.06,
                    weight: 2,
                    dashArray: "6 6",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* SOS markers + risk highlight + route button */}
        {sosWithRisk.map(({ s, r }) => {
          const st = (s.status || "").toUpperCase();
          const id = s.id;

          const rescuerId = (s.rescuerId || "").toLowerCase();
          const assignedToMe = !!myUserId && !!rescuerId && rescuerId === myUserId;

          const inRisk = r.inRisk;
          const sev = (r.topSeverity || "LOW").toUpperCase();
          const color = severityColor(sev);

          const icon = inRisk
            ? (icons.sos as any)[sev] || icons.sos.HIGH
            : icons.sos.SAFE;

          return (
            <div key={`sos-${id}`}>
              <Marker
                position={[s.latitude, s.longitude]}
                icon={icon}
                zIndexOffset={2000}
              >
                <Popup>
                  🚨 <b>SOS</b>
                  <br />
                  Status: <b>{st}</b>
                  <br />
                  Time: {new Date(s.createdAt).toLocaleString()}
                  <br />

                  {s.rescuerId ? (
                    <>
                      Rescuer: {assignedToMe ? <b>YOU</b> : shortGuid(s.rescuerId)}
                      <br />
                    </>
                  ) : (
                    <>
                      Rescuer: <i>Chưa nhận</i>
                      <br />
                    </>
                  )}

                  {inRisk ? (
                    <>
                      <hr />
                      ⚠ <b style={{ color }}>Inside zone</b>
                      <br />
                      Severity: <b>{sev}</b>
                      <br />
                      Hits: {r.hits.length}
                      <br />
                      {buildSafetyAdvice(r.hits[0]?.type, sev)}
                    </>
                  ) : (
                    <>
                      <hr />
                      ✅ <b>Outside zone</b>
                    </>
                  )}

                  {/* ACTIONS */}
                  {isRescueOrAdmin ? (
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        style={{ ...btnStyle, border: "1px solid rgba(233,30,99,0.35)" }}
                        onClick={() => routeTo(s.latitude, s.longitude, s.id)}
                      >
                        🧭 Route
                      </button>

                      {st === "PENDING" && (
                        <>
                          <button
                            style={{ ...btnStyle, background: "#E91E63", color: "white", border: "none" }}
                            disabled={busyId === id}
                            onClick={() => acceptAndRoute(id, s.latitude, s.longitude)}
                          >
                            {busyId === id ? "..." : "⚡ Nhận & Route"}
                          </button>

                          <button
                            style={btnStyle}
                            disabled={busyId === id}
                            onClick={() => acceptSos(id)}
                          >
                            {busyId === id ? "..." : "✅ Nhận SOS"}
                          </button>
                        </>
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

              {/* vòng ưu tiên cứu hộ */}
              <Circle
                center={[s.latitude, s.longitude]}
                radius={300}
                pathOptions={{ color: "#dc2626", fillOpacity: 0.2, weight: 2 }}
              />

              {/* highlight risk ring */}
              {inRisk && (
                <Circle
                  center={[s.latitude, s.longitude]}
                  radius={420}
                  pathOptions={{ color, fillOpacity: 0.05, weight: 2, dashArray: "6 6" }}
                />
              )}
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

      {/* ✅ Panel điều phối SOS */}
      <SosPanel
        role={role || "USER"}
        myUserId={myUserId}
        isAdmin={isAdmin}
        sosList={sosList}
        filter={sosFilter}
        setFilter={(f) => setSosFilter(f)}
        busyId={busyId}
        nearestPendingId={nearestPendingId}
        nearestPendingInfo={nearestPendingInfo}
        onSelect={(id, lat, lng) => setSelectedPos([lat, lng])}
        onRoute={(id, lat, lng) => routeTo(lat, lng, id)}
        onAccept={(id) => acceptSos(id)}
        onAcceptAndRouteNearest={acceptAndRouteNearest}
        onAcceptAndRoute={(id, lat, lng) => acceptAndRoute(id, lat, lng)}
        onUpdateStatus={updateSosStatus}
      />

      {/* ✅ Route Info Panel */}
      <RoutePanel
        open={!!routePoints && !!routeMeta}
        fromLabel={routeMeta?.from || ""}
        toLabel={routeMeta?.to || ""}
        distanceMeters={routeDistance}
        onClear={clearRoute}
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