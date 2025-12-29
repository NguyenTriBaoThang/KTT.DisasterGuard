import React from "react";

type Sos = {
  id: string;
  userId: string;
  rescuerId?: string | null;

  latitude: number;
  longitude: number;

  status: string;
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
  onSelect,
  onAccept,
  onUpdateStatus,
}: {
  role: string; // USER/RESCUE/ADMIN
  myUserId: string;
  isAdmin: boolean;

  sosList: Sos[];
  filter: string; // ACTIVE/PENDING/ACCEPTED/RESCUED/CANCELLED
  setFilter: (f: string) => void;

  busyId: string | null;

  onSelect: (id: string, lat: number, lng: number) => void;
  onAccept: (id: string) => void;
  onUpdateStatus: (id: string, status: "RESCUED" | "CANCELLED") => void;
}) {
  const isRescueOrAdmin = role === "RESCUE" || role === "ADMIN";

  return (
    <div style={styles.box}>
      <div style={styles.header}>
        <div>
          <b>🚨 SOS Dispatch</b>
          <div style={styles.sub}>Điều phối cứu hộ • Filter & xử lý</div>
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

          return (
            <div key={s.id} style={styles.item}>
              <div style={styles.row}>
                <div>
                  <b>{st}</b>{" "}
                  <span style={styles.time}>
                    {new Date(s.createdAt).toLocaleString()}
                  </span>
                </div>

                <button
                  style={styles.zoom}
                  onClick={() => onSelect(s.id, s.latitude, s.longitude)}
                >
                  🎯 Zoom
                </button>
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
                    <button
                      style={styles.btn}
                      disabled={busyId === s.id}
                      onClick={() => onAccept(s.id)}
                    >
                      {busyId === s.id ? "..." : "✅ Nhận"}
                    </button>
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
    width: 340,
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
  warn: {
    margin: 10,
    padding: 10,
    borderRadius: 10,
    background: "rgba(245,158,11,0.16)",
    border: "1px solid rgba(245,158,11,0.3)",
    fontSize: 12,
  },
  list: {
    padding: 10,
    overflow: "auto",
  },
  item: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.1)",
    marginBottom: 10,
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
    fontWeight: 800,
  },
  green: { background: "#16a34a", color: "white", border: "none" },
  red: { background: "#dc2626", color: "white", border: "none" },
};