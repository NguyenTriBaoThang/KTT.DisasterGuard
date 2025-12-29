import React, { useEffect } from "react";
import { severityColor } from "../utils/geoRisk";

export default function WarningToast({
  open,
  title,
  message,
  severity,
  onClose,
  durationMs = 5000,
}: {
  open: boolean;
  title: string;
  message: string;
  severity: string;
  onClose: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  const color = severityColor(severity);

  return (
    <div style={{ ...styles.toast, borderLeft: `6px solid ${color}` }}>
      <div style={styles.row}>
        <b style={{ color }}>{title}</b>
        <button onClick={onClose} style={styles.close}>
          ✕
        </button>
      </div>
      <div style={styles.msg}>{message}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toast: {
    position: "fixed",
    bottom: 18,
    left: "50%",
    transform: "translateX(-50%)",
    width: "min(720px, calc(100vw - 28px))",
    background: "white",
    borderRadius: 14,
    padding: 12,
    boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
    zIndex: 5000,
  },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  close: {
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    borderRadius: 10,
    padding: "4px 8px",
    cursor: "pointer",
    fontWeight: 900,
  },
  msg: { marginTop: 6, fontSize: 13, opacity: 0.9, lineHeight: 1.4 },
};