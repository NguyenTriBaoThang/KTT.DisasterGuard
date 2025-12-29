import React from "react";
import { estimateEtaMinutes, formatKm } from "../utils/mockRoute";

export default function RoutePanel({
  open,
  fromLabel,
  toLabel,
  distanceMeters,
  onClear,
}: {
  open: boolean;
  fromLabel: string;
  toLabel: string;
  distanceMeters: number;
  onClear: () => void;
}) {
  if (!open) return null;

  const eta = estimateEtaMinutes(distanceMeters);

  return (
    <div style={styles.box}>
      <div style={styles.row}>
        <b>🧭 Route Suggestion</b>
        <button style={styles.clear} onClick={onClear}>
          ✕
        </button>
      </div>

      <div style={styles.meta}>
        <div>
          <b>From:</b> {fromLabel}
        </div>
        <div>
          <b>To:</b> {toLabel}
        </div>
        <div>
          <b>Distance:</b> {formatKm(distanceMeters)}
        </div>
        <div>
          <b>ETA (mock):</b> ~{eta} phút
        </div>
      </div>

      <div style={styles.note}>
        *Đây là tuyến đường <b>mock</b> để demo “điều phối cứu hộ”.
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  box: {
    position: "absolute",
    bottom: 20,
    right: 16,
    zIndex: 1800,
    background: "white",
    padding: 12,
    borderRadius: 14,
    boxShadow: "0 0 10px rgba(0,0,0,0.25)",
    width: 260,
  },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  clear: {
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    borderRadius: 10,
    padding: "4px 8px",
    cursor: "pointer",
    fontWeight: 900,
  },
  meta: { marginTop: 10, fontSize: 13, display: "grid", gap: 4, opacity: 0.95 },
  note: { marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.35 },
};