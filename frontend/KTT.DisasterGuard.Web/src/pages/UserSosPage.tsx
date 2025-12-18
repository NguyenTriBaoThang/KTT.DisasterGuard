import { useEffect, useState } from "react";
import { api } from "../api/api";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";

type Position = {
  lat: number;
  lng: number;
};

export default function UserSosPage() {
  const navigate = useNavigate();

  const [pos, setPos] = useState<Position | null>(null);
  const [loadingGps, setLoadingGps] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    requestGps();
  }, []);

  function requestGps() {
    setLoadingGps(true);
    setError("");

    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ GPS.");
      setLoadingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
        });
        setLoadingGps(false);
      },
      (err) => {
        console.error(err);
        setError(
          "Không thể lấy vị trí. Vui lòng cho phép quyền Location trên trình duyệt."
        );
        setLoadingGps(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10s
      }
    );
  }

  async function sendSOS() {
    if (!pos) return;

    setSending(true);
    setError("");

    try {
      await api.post("/api/location/update", {
        latitude: pos.lat,
        longitude: pos.lng,
        accuracy: 10,
      });

      await api.post("/api/sos", {
        latitude: pos.lat,
        longitude: pos.lng,
      });

      setSent(true);
    } catch {
      setError("Không thể gửi SOS. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <TopBar />
      <div style={styles.page}>
        <div style={styles.card}>
          <h2>🆘 SOS Khẩn Cấp</h2>

          {/* ERROR */}
          {error && (
            <div style={styles.error}>
                {error}

                <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={requestGps}>🔄 Thử lại</button>
                <button
                    onClick={() => {
                    setPos({ lat: 10.8231, lng: 106.6297 }); // HCM
                    setError("");
                    setLoadingGps(false);
                    }}
                >
                    🎬 Dùng vị trí demo
                </button>
                </div>
            </div>
            )}

          {/* LOADING GPS */}
          {loadingGps && <div>📡 Đang lấy vị trí GPS...</div>}

          {/* GPS OK */}
          {pos && !sent && (
            <>
              <div style={styles.info}>
                <b>📍 Vị trí hiện tại</b>
                <div>Lat: {pos.lat.toFixed(6)}</div>
                <div>Lng: {pos.lng.toFixed(6)}</div>
              </div>

              <button
                style={styles.sosBtn}
                disabled={sending}
                onClick={sendSOS}
              >
                {sending ? "Đang gửi SOS..." : "🚨 GỬI SOS"}
              </button>
            </>
          )}

          {/* SENT */}
          {sent && (
            <div style={styles.success}>
              ✅ SOS đã được gửi thành công <br />
              Lực lượng cứu hộ đang được thông báo
            </div>
          )}

          <div style={styles.back}>
            <button onClick={() => navigate("/")}>⬅ Trang chủ</button>
          </div>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b1220",
    display: "grid",
    placeItems: "center",
    paddingTop: 52,
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    textAlign: "center",
  },
  info: {
    margin: "16px 0",
    fontSize: 14,
  },
  sosBtn: {
    marginTop: 16,
    padding: "14px 18px",
    fontSize: 18,
    borderRadius: 12,
    border: "none",
    background: "#dc2626",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
    width: "100%",
  },
  success: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 600,
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 14,
  },
  back: {
    marginTop: 20,
  },
};