import { useEffect, useState } from "react";
import { api } from "../api/api";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import WarningToast from "../components/WarningToast";
import {
  analyzeRisk,
  buildSafetyAdvice,
  Disaster,
  severityColor,
} from "../utils/geoRisk";

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

  // ✅ WARNING states
  const [inRisk, setInRisk] = useState(false);
  const [riskSeverity, setRiskSeverity] = useState<string>("MEDIUM");
  const [riskText, setRiskText] = useState<string>("");
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    requestGps();
  }, []);

  // ✅ Check risk whenever pos changes
  useEffect(() => {
    if (!pos) return;
    checkDisasterRisk(pos.lat, pos.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.lat, pos?.lng]);

  async function checkDisasterRisk(lat: number, lng: number) {
    try {
      const res = await api.get("/api/disaster/active");
      const disasters: Disaster[] = res.data || [];

      const r = analyzeRisk(lat, lng, disasters);

      if (!r.inRisk) {
        setInRisk(false);
        setToastOpen(false);
        return;
      }

      const top = r.topSeverity || "MEDIUM";
      setInRisk(true);
      setRiskSeverity(top);

      // build message: show top hit + count
      const topHit = r.hits[0];
      const msg =
        `Bạn đang nằm trong vùng cảnh báo (${top}). ` +
        (topHit?.type ? `Loại: ${topHit.type}. ` : "") +
        `Số vùng trùng: ${r.hits.length}. ` +
        buildSafetyAdvice(topHit?.type, top);

      setRiskText(msg);
      setToastOpen(true);
    } catch (e) {
      // nếu API lỗi thì thôi không cảnh báo (không chặn SOS)
      console.error("checkDisasterRisk error", e);
    }
  }

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
        setError("Không thể lấy vị trí. Vui lòng cho phép quyền Location trên trình duyệt.");
        setLoadingGps(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
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

  const borderColor = inRisk ? severityColor(riskSeverity) : "transparent";

  return (
    <>
      <TopBar />

      {/* ✅ TOAST */}
      <WarningToast
        open={toastOpen && inRisk}
        severity={riskSeverity}
        title={`⚠ CẢNH BÁO THIÊN TAI (${riskSeverity})`}
        message={riskText}
        onClose={() => setToastOpen(false)}
        durationMs={7000}
      />

      <div style={styles.page}>
        <div style={{ ...styles.card, border: `2px solid ${borderColor}` }}>
          <h2>🆘 SOS Khẩn Cấp</h2>

          {/* ✅ WARNING BANNER */}
          {inRisk && (
            <div
              style={{
                ...styles.warnBanner,
                border: `1px solid ${borderColor}`,
                background: `${borderColor}18`,
              }}
            >
              <b style={{ color: borderColor }}>⚠ Cảnh báo sớm:</b>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.35 }}>
                {riskText}
              </div>
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => setToastOpen(true)}
                  style={{ ...styles.smallBtn, borderColor: borderColor }}
                >
                  Xem lại cảnh báo
                </button>
              </div>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div style={styles.error}>
              {error}
              <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={requestGps}>🔄 Thử lại</button>
                <button
                  onClick={() => {
                    setPos({ lat: 10.8231, lng: 106.6297 }); // HCM demo
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

                {inRisk && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    Trạng thái:{" "}
                    <b style={{ color: borderColor }}>
                      Trong vùng cảnh báo ({riskSeverity})
                    </b>
                  </div>
                )}
              </div>

              <button style={styles.sosBtn} disabled={sending} onClick={sendSOS}>
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
    maxWidth: 480,
    textAlign: "center",
    transition: "border-color 0.2s ease",
  },
  warnBanner: {
    textAlign: "left",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  smallBtn: {
    padding: "7px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  },
  info: {
    margin: "16px 0",
    fontSize: 14,
  },
  sosBtn: {
    marginTop: 12,
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
