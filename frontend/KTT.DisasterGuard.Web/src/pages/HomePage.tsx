import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearToken, getToken } from "../auth/auth";
//import { useMemo } from "react";

export default function HomePage() {
  const navigate = useNavigate();
  //const isLoggedIn = useMemo(() => !!getToken(), []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);

  function logout() {
    clearToken();
    setIsLoggedIn(false);
    navigate("/auth");
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.badge}>KTT • DisasterGuard</div>

        <h1 style={styles.h1}>AI cảnh báo sớm thiên tai & hỗ trợ cứu hộ</h1>
        <p style={styles.p}>
          Nền tảng bản đồ thời gian thực giúp định vị nạn nhân, ưu tiên SOS và trực quan hóa vùng nguy hiểm.
        </p>

        {/* ACTIONS */}
        <div style={styles.actions}>
          {!isLoggedIn ? (
            <>
              <Link to="/auth" style={styles.primary}>
                Đăng nhập / Đăng ký
              </Link>
              <Link to="/dashboard" style={styles.secondary}>
                Vào Dashboard
              </Link>
              <Link to="/sos" style={styles.danger}>
                🚨 SOS khẩn cấp
              </Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" style={styles.secondary}>
                Vào Dashboard
              </Link>
              <Link to="/sos" style={styles.danger}>
                🚨 SOS khẩn cấp
              </Link>
              <button onClick={logout} style={styles.logoutBtn}>
                Đăng xuất
              </button>
            </>
          )}
        </div>

        <div style={styles.features}>
          <div style={styles.card}>
            <b>📍 Location</b>
            <br />
            Cập nhật GPS liên tục
          </div>
          <div style={styles.card}>
            <b>🚨 SOS</b>
            <br />
            Ưu tiên cứu hộ khẩn cấp
          </div>
          <div style={styles.card}>
            <b>🌪️ AI Alert</b>
            <br />
            Mock vùng nguy hiểm
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0b1220", color: "white", padding: 24 },
  hero: { maxWidth: 960, margin: "0 auto", paddingTop: 40 },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(233,30,99,0.18)",
    border: "1px solid rgba(233,30,99,0.35)",
    color: "#ff7aa8",
    fontWeight: 700,
    marginBottom: 14,
  },
  h1: { fontSize: 44, margin: "10px 0 10px" },
  p: { fontSize: 16, opacity: 0.85, maxWidth: 720 },
  actions: { display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap", alignItems: "center" },
  primary: {
    background: "#E91E63",
    padding: "10px 14px",
    borderRadius: 10,
    color: "white",
    textDecoration: "none",
    fontWeight: 800,
  },
  secondary: {
    background: "rgba(255,255,255,0.08)",
    padding: "10px 14px",
    borderRadius: 10,
    color: "white",
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  danger: {
    background: "#dc2626",
    padding: "10px 14px",
    borderRadius: 10,
    color: "white",
    textDecoration: "none",
    fontWeight: 800,
  },
  logoutBtn: {
    background: "transparent",
    padding: "10px 14px",
    borderRadius: 10,
    color: "white",
    border: "1px solid rgba(255,255,255,0.22)",
    cursor: "pointer",
    fontWeight: 800,
  },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginTop: 26,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
};