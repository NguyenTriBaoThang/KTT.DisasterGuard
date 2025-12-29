import { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import { api } from "../api/api";

type Msg = {
  sender: "USER" | "AI";
  message: string;
  createdAt: string;
};

export default function ChatbotPage() {
  const [list, setList] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [list]);

  async function loadHistory() {
    try {
      const res = await api.get("/api/chatbot/history?limit=100");
      setList(res.data || []);
    } catch {
      // ignore
    }
  }

  async function send() {
    const m = text.trim();
    if (!m) return;

    setSending(true);
    setText("");

    // optimistic
    const now = new Date().toISOString();
    setList((prev) => [...prev, { sender: "USER", message: m, createdAt: now }]);

    try {
      const res = await api.post("/api/chatbot/ask", { message: m });
      setList((prev) => [
        ...prev,
        { sender: "AI", message: res.data.reply, createdAt: new Date().toISOString() },
      ]);
    } catch {
      setList((prev) => [
        ...prev,
        { sender: "AI", message: "❌ Không thể trả lời lúc này. Vui lòng thử lại.", createdAt: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
    }
  }

  function quick(q: string) {
    setText(q);
  }

  return (
    <>
      <TopBar />
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.title}>🤖 Chatbot hỗ trợ khẩn cấp</div>

          <div style={styles.quick}>
            <button style={styles.qbtn} onClick={() => quick("Khu vực tôi đang bị lũ, tôi nên làm gì?")}>Lũ</button>
            <button style={styles.qbtn} onClick={() => quick("Sắp có bão lớn, cần chuẩn bị gì?")}>Bão</button>
            <button style={styles.qbtn} onClick={() => quick("Nguy cơ sạt lở gần nhà, xử lý thế nào?")}>Sạt lở</button>
          </div>

          <div style={styles.chat}>
            {list.map((m, i) => (
              <div
                key={i}
                style={{
                  ...styles.bubble,
                  ...(m.sender === "USER" ? styles.user : styles.ai),
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 4 }}>
                  {m.sender === "USER" ? "Bạn" : "AI"}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.message}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div style={styles.inputRow}>
            <input
              style={styles.input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập tình huống bạn đang gặp..."
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              disabled={sending}
            />
            <button style={styles.send} onClick={send} disabled={sending}>
              {sending ? "..." : "Gửi"}
            </button>
          </div>

          <div style={styles.note}>
            * Đây là bản demo “AI mock” theo proposal. Sau này bạn thay `GenerateEmergencyReply()` bằng LLM thật.
          </div>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, any> = {
  page: {
    minHeight: "100vh",
    paddingTop: 52,
    background: "#0b1220",
    display: "grid",
    placeItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 820,
    background: "white",
    borderRadius: 16,
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: 900, marginBottom: 10 },
  quick: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  qbtn: {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    cursor: "pointer",
    fontWeight: 800,
  },
  chat: {
    height: 420,
    overflow: "auto",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.1)",
    padding: 12,
    background: "#f8fafc",
  },
  bubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    maxWidth: "78%",
  },
  user: { background: "rgba(233,30,99,0.12)", marginLeft: "auto", border: "1px solid rgba(233,30,99,0.25)" },
  ai: { background: "white", border: "1px solid rgba(0,0,0,0.08)" },
  inputRow: { display: "flex", gap: 8, marginTop: 10 },
  input: {
    flex: 1,
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.14)",
    outline: "none",
  },
  send: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    background: "#E91E63",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  note: { marginTop: 10, fontSize: 12, opacity: 0.75 },
};