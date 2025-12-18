import { useState } from "react";
import { api } from "../api/api";

export default function DisasterTestPanel() {
  const [loading, setLoading] = useState(false);

  async function createMock(severity: string) {
    setLoading(true);
    try {
      await api.post("/api/disaster/mock", {
        type: "FLOOD",
        severity,
        centerLat: 10.8231,
        centerLng: 106.6297,
        radiusMeters: severity === "CRITICAL" ? 8000 : 4000,
      });
      alert("Đã tạo vùng thiên tai: " + severity);
    } catch {
      alert("Không đủ quyền (cần ADMIN / RESCUE)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.box}>
      <b>🧪 Test AI Alert</b>
      <div style={styles.row}>
        <button onClick={() => createMock("MEDIUM")}>Medium</button>
        <button onClick={() => createMock("HIGH")}>High</button>
        <button onClick={() => createMock("CRITICAL")}>Critical</button>
      </div>
      {loading && <div style={{ fontSize: 12 }}>Đang tạo...</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  box: {
    position: "absolute",
    top: 70,
    right: 16,
    background: "white",
    padding: 10,
    borderRadius: 10,
    zIndex: 1500,
    boxShadow: "0 0 6px rgba(0,0,0,0.3)",
    fontSize: 13,
  },
  row: {
    display: "flex",
    gap: 6,
    marginTop: 6,
  },
};