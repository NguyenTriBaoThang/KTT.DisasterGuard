import React from "react";

export default function WeatherPanel({
  showWind,
  showRain,
  showPressure,
  showClouds,
  onToggle,
}: {
  showWind: boolean;
  showRain: boolean;
  showPressure: boolean;
  showClouds: boolean;
  onToggle: (k: "wind" | "rain" | "pressure" | "clouds") => void;
}) {
  return (
    <div style={styles.box}>
      <b>🌦 Weather Layers</b>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
        Overlay gió/mưa/áp suất lên bản đồ
      </div>

      <div style={styles.row}>
        <button
          style={{ ...styles.btn, ...(showWind ? styles.on : {}) }}
          onClick={() => onToggle("wind")}
        >
          💨 Wind
        </button>
        <button
          style={{ ...styles.btn, ...(showRain ? styles.on : {}) }}
          onClick={() => onToggle("rain")}
        >
          🌧 Rain
        </button>
      </div>

      <div style={styles.row}>
        <button
          style={{ ...styles.btn, ...(showPressure ? styles.on : {}) }}
          onClick={() => onToggle("pressure")}
        >
          🧭 Pressure
        </button>
        <button
          style={{ ...styles.btn, ...(showClouds ? styles.on : {}) }}
          onClick={() => onToggle("clouds")}
        >
          ☁ Clouds
        </button>
      </div>

      <div style={{ fontSize: 11, opacity: 0.75, marginTop: 6 }}>
        *Dữ liệu phụ thuộc nhà cung cấp (OWM).
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  box: {
    position: "absolute",
    top: 70,
    left: 16,
    zIndex: 1700,
    width: 220,
    background: "white",
    padding: 10,
    borderRadius: 12,
    boxShadow: "0 0 10px rgba(0,0,0,0.2)",
  },
  row: { display: "flex", gap: 8, marginTop: 8 },
  btn: {
    flex: 1,
    padding: "7px 8px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "white",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  },
  on: {
    background: "#0f172a",
    color: "white",
    border: "1px solid #0f172a",
  },
};