import React from "react";

type Sos = {
  id: string;
  userId: string;
  rescuerId?: string | null;

  latitude: number;
  longitude: number;

  status: string; // PENDING | ACCEPTED | RESCUED | CANCELLED
  createdAt: string;

  acceptedAt?: string | null;
  rescuedAt?: string | null;
  cancelledAt?: string | null;
};

function shortGuid(g?: string | null) {
  if (!g) return "";
  return `${g.slice(0, 8)}...`;
}

export default function SosPanel({
  role,
  myUserId,
  isAdmin,
  sosList,
  filter,
  setFilter,
  busyId,

  nearestPendingId,
  nearestPendingInfo,

  onSelect,
  onRoute,
  onAccept,
  onAcceptAndRouteNearest,
  onAcceptAndRoute,
  onUpdateStatus,
}: {
  role: string; // USER/RESCUE/ADMIN
  myUserId: string;
  isAdmin: boolean;

  sosList: Sos[];
  filter: string; // ACTIVE/PENDING/ACCEPTED/RESCUED/CANCELLED
  setFilter: (f: string) => void;

  busyId: string | null;

  // ✅ nearest SOS pending
  nearestPendingId: string | null;
  nearestPendingInfo: string; // e.g. "2.14 km • ~5 phút"

  onSelect: (id: string, lat: number, lng: number) => void; // zoom
  onRoute: (id: string, lat: number, lng: number) => void;  // route only
  onAccept: (id: string) => void;
  onAcceptAndRouteNearest: () => void; // ✅ 1-click nearest
  onAcceptAndRoute: (id: string, lat: number, lng: number) => void; // ✅ 1-click item
  onUpdateStatus: (id: string, status: "RESCUED" | "CANCELLED") => void;
}) {
  const isRescueOrAdmin = role === "RESCUE" || role === "ADMIN";

  return (
    <div style={styles.box}>
      <div style={styles.header}>
        <div>
          <b>🚨 SOS Dispatch</b>
          <div style={styles.sub}>Điều phối cứu hộ • Auto nearest + 1 click</div>
        </div>
        <div style={styles.badge}>Role: {role}</div>
      </div>

      <div style={styles.filters}>
        {["ACTIVE", "PENDING", "ACCEPTED", "RESCUED", "CANCELLED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...styles.filterBtn,
              ...(filter === f ? styles.filterBtnActive : {}),
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ✅ One-click nearest */}
      {isRescueOrAdmin && (
        <div style={styles.nearestRow}>
          <button
            style={{
              ...styles.nearestBtn,
              ...(nearestPendingId ? {} : styles.nearestBtnDisabled),
            }}
            disabled={!nearestPendingId}
            onClick={onAcceptAndRouteNearest}
          >
            ⚡ Nhận & Route gần nhất
          </button>

          <div style={styles.nearestInfo}>
            {nearestPendingId ? (
              <>
                Nearest: <b>{shortGuid(nearestPendingId)}</b>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{nearestPendingInfo}</div>
              </>
            ) : (
              <span style={{ opacity: 0.75, fontSize: 12 }}>Không có SOS PENDING.</span>
            )}
          </div>
        </div>
      )}

      {!isRescueOrAdmin && (
        <div style={styles.warn}>
          Chỉ <b>RESCUE/ADMIN</b> mới xem & xử lý SOS.
        </div>
      )}

      <div style={styles.list}>
        {sosList.length === 0 && (
          <div style={{ opacity: 0.8, fontSize: 13 }}>Không có SOS.</div>
        )}

        {sosList.map((s) => {
          const st = (s.status || "").toUpperCase();
          const rescuerId = (s.rescuerId || "").toLowerCase();
          const assignedToMe = !!myUserId && !!rescuerId && rescuerId === myUserId;
          const isNearest = nearestPendingId && s.id === nearestPendingId;

          return (
            <div
              key={s.id}
              style={{
                ...styles.item,
                ...(isNearest ? styles.itemNearest : {}),
              }}
            >
              <div style={styles.row}>
                <div>
                  <b>{st}</b>{" "}
                  {isNearest && <span style={styles.nearestTag}>NEAREST</span>}
                  <span style={styles.time}>
                    {new Date(s.createdAt).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={styles.zoom}
                    onClick={() => onSelect(s.id, s.latitude, s.longitude)}
                  >
                    🎯 Zoom
                  </button>

                  {isRescueOrAdmin && (
                    <button
                      style={{ ...styles.zoom, border: "1px solid rgba(233,30,99,0.35)" }}
                      onClick={() => onRoute(s.id, s.latitude, s.longitude)}
                    >
                      🧭 Route
                    </button>
                  )}
                </div>
              </div>

              <div style={styles.meta}>
                <div>
                  📍 {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}
                </div>
                <div>
                  👤 Rescuer:{" "}
                  {s.rescuerId ? (
                    assignedToMe ? (
                      <b>YOU</b>
                    ) : (
                      shortGuid(s.rescuerId)
                    )
                  ) : (
                    <i>Chưa nhận</i>
                  )}
                </div>
              </div>

              {isRescueOrAdmin && (
                <div style={styles.actions}>
                  {st === "PENDING" && (
                    <>
                      <button
                        style={{ ...styles.btn, ...styles.pink }}
                        disabled={busyId === s.id}
                        onClick={() => onAcceptAndRoute(s.id, s.latitude, s.longitude)}
                      >
                        {busyId === s.id ? "..." : "⚡ Nhận & Route"}
                      </button>

                      <button
                        style={styles.btn}
                        disabled={busyId === s.id}
                        onClick={() => onAccept(s.id)}
                      >
                        {busyId === s.id ? "..." : "✅ Nhận"}
                      </button>
                    </>
                  )}

                  {st === "ACCEPTED" && (assignedToMe || isAdmin) && (
                    <>
                      <button
                        style={{ ...styles.btn, ...styles.green }}
                        disabled={busyId === s.id}
                        onClick={() => onUpdateStatus(s.id, "RESCUED")}
                      >
                        {busyId === s.id ? "..." : "🏁 Đã cứu"}
                      </button>
                      <button
                        style={{ ...styles.btn, ...styles.red }}
                        disabled={busyId === s.id}
                        onClick={() => onUpdateStatus(s.id, "CANCELLED")}
                      >
                        {busyId === s.id ? "..." : "✖ Hủy"}
                      </button>
                    </>
                  )}

                  {st === "ACCEPTED" && !(assignedToMe || isAdmin) && (
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      SOS đã được người khác nhận.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  box: {
    position: "absolute",
    top: 70,
    right: 16,
    width: 360,
    maxHeight: "calc(100vh - 90px)",
    overflow: "hidden",
    background: "white",
    borderRadius: 14,
    boxShadow: "0 0 10px rgba(0,0,0,0.25)",
    zIndex: 1600,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: 12,
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
  },
  sub: { fontSize: 12, opacity: 0.75, marginTop: 2 },
  badge: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
    background: "rgba(233,30,99,0.14)",
    border: "1px solid rgba(233,30,99,0.25)",
    color: "#b01349",
    height: "fit-content",
    whiteSpace: "nowrap",
  },
  filters: {
    padding: 10,
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    borderBottom: "1px solid rgba(0,0,0,0.08)",
  },
  filterBtn: {
    fontSize: 12,
    padding: "6px 8px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  filterBtnActive: {
    background: "#0f172a",
    color: "white",
    border: "1px solid #0f172a",
  },
  nearestRow: {
    padding: 10,
    display: "flex",
    gap: 10,
    alignItems: "center",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
  },
  nearestBtn: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "none",
    background: "#E91E63",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  nearestBtnDisabled: { opacity: 0.45, cursor: "not-allowed" },
  nearestInfo: { fontSize: 12, flex: 1, lineHeight: 1.2 },
  warn: {
    margin: 10,
    padding: 10,
    borderRadius: 10,
    background: "rgba(245,158,11,0.16)",
    border: "1px solid rgba(245,158,11,0.3)",
    fontSize: 12,
  },
  list: { padding: 10, overflow: "auto" },
  item: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.1)",
    marginBottom: 10,
  },
  itemNearest: {
    border: "2px solid rgba(233,30,99,0.6)",
    background: "rgba(233,30,99,0.06)",
  },
  nearestTag: {
    fontSize: 10,
    fontWeight: 900,
    marginLeft: 6,
    padding: "2px 6px",
    borderRadius: 999,
    background: "rgba(233,30,99,0.16)",
    border: "1px solid rgba(233,30,99,0.35)",
    color: "#b01349",
  },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  time: { fontSize: 12, opacity: 0.75, marginLeft: 6 },
  zoom: {
    fontSize: 12,
    padding: "6px 8px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    cursor: "pointer",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  meta: { marginTop: 8, fontSize: 12, opacity: 0.9, display: "grid", gap: 4 },
  actions: { marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  btn: {
    fontSize: 12,
    padding: "7px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    cursor: "pointer",
    fontWeight: 900,
  },
  pink: { background: "#E91E63", color: "white", border: "none" },
  green: { background: "#16a34a", color: "white", border: "none" },
  red: { background: "#dc2626", color: "white", border: "none" },
};
