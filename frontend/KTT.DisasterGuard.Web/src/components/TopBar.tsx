import { useNavigate } from "react-router-dom";
import { clearToken } from "../auth/auth";

export default function TopBar() {
  const navigate = useNavigate();

  function logout() {
    clearToken();
    navigate("/auth");
  }

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <b>KTT DisasterGuard</b>
      </div>

      <div style={styles.right}>
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
  left: { fontSize: 16 },
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