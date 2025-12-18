import { useState } from "react";
import { api } from "../api/api";
import { saveToken } from "../auth/auth";

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin() {
    try {
      const res = await api.post("/api/auth/login", {
        email,
        password,
      });

      saveToken(res.data.token);
      onLogin();
    } catch {
      setError("Đăng nhập thất bại");
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "100px auto" }}>
      <h2>KTT DisasterGuard</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <br /><br />

      <input
        type="password"
        placeholder="Mật khẩu"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <br /><br />

      <button onClick={handleLogin}>Đăng nhập</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}