import { useState } from "react";
import { api } from "../api/api";
import { saveToken } from "../auth/auth";

type Mode = "login" | "register";

export default function AuthPage({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<Mode>("login");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string>("");

  async function submit() {
    setError("");
    try {
      if (mode === "login") {
        const res = await api.post("/api/auth/login", { email, password });
        saveToken(res.data.token);
        onAuthed();
      } else {
        const res = await api.post("/api/auth/register", {
          fullName,
          email,
          password,
        });
        saveToken(res.data.token);
        onAuthed();
      }
    } catch (e: any) {
      setError("Không thể xác thực. Kiểm tra email/mật khẩu hoặc email đã tồn tại.");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.logo}>KTT</div>
          <div>
            <div style={styles.title}>DisasterGuard</div>
            <div style={styles.sub}>AI cảnh báo sớm • Hỗ trợ cứu hộ</div>
          </div>
        </div>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === "login" ? styles.tabActive : {}) }}
            onClick={() => setMode("login")}
          >
            Đăng nhập
          </button>
          <button
            style={{ ...styles.tab, ...(mode === "register" ? styles.tabActive : {}) }}
            onClick={() => setMode("register")}
          >
            Đăng ký
          </button>
        </div>

        {mode === "register" && (
          <div style={styles.field}>
            <label>Họ tên</label>
            <input
              style={styles.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
            />
          </div>
        )}

        <div style={styles.field}>
          <label>Email</label>
          <input
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@ktt.com"
          />
        </div>

        <div style={styles.field}>
          <label>Mật khẩu</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="******"
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.primary} onClick={submit}>
          {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </button>

        <div style={styles.note}>
          Tip: dùng tài khoản <b>RESCUE/ADMIN</b> để xem SOS & Location.
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #0b1220, #111827)",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(8px)",
    borderRadius: 14,
    padding: 20,
    color: "white",
  },
  brand: { display: "flex", gap: 12, alignItems: "center", marginBottom: 14 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.12)",
    fontWeight: 800,
  },
  title: { fontSize: 22, fontWeight: 800, lineHeight: 1.1 },
  sub: { opacity: 0.8, fontSize: 12 },
  tabs: { display: "flex", gap: 8, margin: "14px 0" },
  tab: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "transparent",
    color: "white",
    cursor: "pointer",
    opacity: 0.85,
  },
  tabActive: { background: "rgba(255,255,255,0.14)", opacity: 1 },
  field: { display: "grid", gap: 6, marginBottom: 12 },
  input: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.18)",
    color: "white",
    outline: "none",
  },
  primary: {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 10,
    border: "none",
    background: "#E91E63",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 4,
  },
  error: {
    background: "rgba(239,68,68,0.18)",
    border: "1px solid rgba(239,68,68,0.35)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 13,
  },
  note: { marginTop: 12, fontSize: 12, opacity: 0.85 },
};