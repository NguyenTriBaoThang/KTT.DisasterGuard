import { useEffect, useMemo, useState } from "react";
import TopBar from "../components/TopBar";
import { api } from "../api/api";

type SosDailyCount = {
  dateUtc: string;
  total: number;
  pending: number;
  accepted: number;
  rescued: number;
  cancelled: number;
};

type SosStats = {
  total: number;
  active: number;
  pending: number;
  accepted: number;
  rescued: number;
  cancelled: number;
  last24h: number;
  todayUtc: number;
  daily: SosDailyCount[];
};

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ReportsPage() {
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<SosStats | null>(null);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("ACTIVE");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(todayYYYYMMDD());

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function loadStats() {
    setLoading(true);
    try {
      const res = await api.get(`/api/reports/sos/stats?days=${days}`);
      setStats(res.data);
    } catch {
      alert("Không tải được báo cáo (cần RESCUE/ADMIN).");
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    try {
      // ưu tiên: nếu có from/to thì export theo range; không thì export theo days
      const qs =
        from || to
          ? `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&status=${encodeURIComponent(status)}`
          : `days=${days}&status=${encodeURIComponent(status)}`;

      const res = await api.get(`/api/reports/sos/export?${qs}`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `sos_report_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export thất bại (kiểm tra quyền hoặc API).");
    }
  }

  const dailyRows = useMemo(() => stats?.daily ?? [], [stats]);

  return (
    <>
      <TopBar />
      <div style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.header}>
            <div>
              <div style={styles.h1}>📊 Báo cáo điều phối SOS</div>
              <div style={styles.sub}>Thống kê + export CSV (demo đúng proposal)</div>
            </div>

            <div style={styles.controls}>
              <label style={styles.label}>
                Days:
                <select
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value, 10))}
                  style={styles.select}
                >
                  {[3, 7, 14, 30].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <button style={styles.btn} onClick={loadStats} disabled={loading}>
                {loading ? "..." : "🔄 Refresh"}
              </button>
            </div>
          </div>

          {/* CARDS */}
          <div style={styles.grid}>
            <Card title="Total" value={stats?.total ?? "-"} />
            <Card title="Active" value={stats?.active ?? "-"} />
            <Card title="Pending" value={stats?.pending ?? "-"} />
            <Card title="Accepted" value={stats?.accepted ?? "-"} />
            <Card title="Rescued" value={stats?.rescued ?? "-"} />
            <Card title="Cancelled" value={stats?.cancelled ?? "-"} />
            <Card title="Last 24h" value={stats?.last24h ?? "-"} />
            <Card title="Today (UTC)" value={stats?.todayUtc ?? "-"} />
          </div>

          {/* EXPORT */}
          <div style={styles.exportBox}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>⬇ Export CSV</div>

            <div style={styles.exportRow}>
              <label style={styles.label}>
                Status:
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
                  {["ACTIVE", "PENDING", "ACCEPTED", "RESCUED", "CANCELLED"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.label}>
                From:
                <input value={from} onChange={(e) => setFrom(e.target.value)} type="date" style={styles.input} />
              </label>

              <label style={styles.label}>
                To:
                <input value={to} onChange={(e) => setTo(e.target.value)} type="date" style={styles.input} />
              </label>

              <button style={{ ...styles.btn, ...styles.primary }} onClick={exportCsv}>
                Export
              </button>
            </div>

            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
              Nếu bạn để From/To trống thì export theo Days. (Tính theo UTC)
            </div>
          </div>

          {/* TABLE */}
          <div style={styles.tableBox}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>📅 Daily breakdown (UTC)</div>

            <div style={styles.table}>
              <div style={styles.trHead}>
                <div>Date</div>
                <div>Total</div>
                <div>Pending</div>
                <div>Accepted</div>
                <div>Rescued</div>
                <div>Cancelled</div>
              </div>

              {dailyRows.map((r) => (
                <div key={r.dateUtc} style={styles.tr}>
                  <div>{r.dateUtc}</div>
                  <div>{r.total}</div>
                  <div>{r.pending}</div>
                  <div>{r.accepted}</div>
                  <div>{r.rescued}</div>
                  <div>{r.cancelled}</div>
                </div>
              ))}

              {dailyRows.length === 0 && (
                <div style={{ padding: 10, opacity: 0.75 }}>Không có dữ liệu.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

const styles: Record<string, any> = {
  page: { minHeight: "100vh", paddingTop: 52, background: "#0b1220", padding: 16 },
  wrap: { maxWidth: 1100, margin: "0 auto", color: "white" },
  header: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" },
  h1: { fontSize: 22, fontWeight: 900 },
  sub: { opacity: 0.8, fontSize: 13 },
  controls: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  grid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
  },
  card: {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 12,
  },
  cardTitle: { fontSize: 12, opacity: 0.8, fontWeight: 800 },
  cardValue: { fontSize: 22, fontWeight: 900, marginTop: 6 },

  exportBox: {
    marginTop: 14,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 12,
  },
  exportRow: { display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" },

  tableBox: {
    marginTop: 14,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 12,
  },
  table: {
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.18)",
  },
  trHead: {
    display: "grid",
    gridTemplateColumns: "1.2fr repeat(5, 1fr)",
    gap: 0,
    padding: "10px 10px",
    fontWeight: 900,
    background: "rgba(255,255,255,0.06)",
  },
  tr: {
    display: "grid",
    gridTemplateColumns: "1.2fr repeat(5, 1fr)",
    padding: "10px 10px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    fontSize: 13,
  },

  label: { fontSize: 12, opacity: 0.9, fontWeight: 800, display: "grid", gap: 6 },
  select: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
  },
  input: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
  },
  btn: {
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "transparent",
    color: "white",
    cursor: "pointer",
    fontWeight: 900,
  },
  primary: { background: "#E91E63", border: "none" },
};