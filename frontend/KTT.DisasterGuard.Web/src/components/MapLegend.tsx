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
      }}
    >
      <div>📍 Vị trí người dùng</div>
      <div style={{ color: "red" }}>🚨 SOS khẩn cấp</div>
      <div>⭕ Vùng ưu tiên cứu hộ</div>
      <div>🌪️ Vùng cảnh báo thiên tai (AI)</div>
    </div>
  );
}