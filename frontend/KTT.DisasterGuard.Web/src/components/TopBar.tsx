import { useNavigate } from "react-router-dom";
import { clearToken, getRoleFromToken } from "../auth/auth";
import { clearAuthToken } from "../api/api";
import { stopRealtime } from "../realtime/realtime";

export default function TopBar() {
  const navigate = useNavigate();
  const role = (getRoleFromToken() || "GUEST").toUpperCase();
  const isRescueOrAdmin = role === "RESCUE" || role === "ADMIN";

  async function logout() {
    clearToken();
    clearAuthToken();
    await stopRealtime();
    navigate("/auth");
  }

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <b>KTT DisasterGuard</b>
        <span style={styles.role}>Role: {role}</span>
      </div>

      <div style={styles.right}>
        <button style={styles.btn} onClick={() => navigate("/windy")}>
          🌀 Windy
        </button>

        <button style={styles.btn} onClick={() => navigate("/chat")}>
          🤖 Chatbot
        </button>

        {isRescueOrAdmin && (
          <button style={styles.btn} onClick={() => navigate("/reports")}>
            📊 Reports
          </button>
        )}

        <button style={styles.btn} onClick={() => navigate("/")}>
          ⬅ Trang chủ
        </button>

        <button style={{ ...styles.btn, ...styles.logout }} onClick={logout}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    background: "rgba(15,23,42,0.85)",
    backdropFilter: "blur(6px)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 14px",
    zIndex: 2000,
    borderBottom: "1px solid rgba(255,255,255,0.12)",
  },
  left: { fontSize: 16, display: "flex", gap: 10, alignItems: "center" },
  role: {
    fontSize: 12,
    opacity: 0.85,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
  },
  right: { display: "flex", gap: 8 },
  btn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    color: "white",
    cursor: "pointer",
  },
  logout: {
    background: "#E91E63",
    border: "none",
    fontWeight: 700,
  },
};