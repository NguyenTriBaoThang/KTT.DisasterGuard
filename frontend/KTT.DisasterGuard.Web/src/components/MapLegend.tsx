export default function MapLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: 20,
        background: "white",
        padding: 12,
        borderRadius: 8,
        boxShadow: "0 0 5px rgba(0,0,0,0.3)",
        zIndex: 1000,
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      <div><b>Legend</b></div>
      <div>📍 Location (pin xanh dương = bình thường)</div>
      <div style={{ color: "#dc2626" }}>🚨 SOS (pin đỏ = SOS)</div>
      <div style={{ marginTop: 6 }}>
        <b>Risk Color:</b>{" "}
        <span style={{ color: "#16a34a" }}>LOW</span>{" "}
        <span style={{ color: "#eab308" }}>MEDIUM</span>{" "}
        <span style={{ color: "#f97316" }}>HIGH</span>{" "}
        <span style={{ color: "#dc2626" }}>CRITICAL</span>
      </div>
      <div style={{ marginTop: 6, opacity: 0.85 }}>
        Nếu pin đổi màu → điểm đó đang <b>Inside zone</b>.
      </div>
    </div>
  );
}