import TopBar from "../components/TopBar";
import { useMemo } from "react";

export default function WindyPage() {
  // ✅ Cho phép truyền lat/lon qua query: /windy?lat=10.8&lon=106.6
  const params = new URLSearchParams(window.location.search);
  const lat = Number(params.get("lat") ?? "10.8231");
  const lon = Number(params.get("lon") ?? "106.6297");

  const src = useMemo(() => {
    // Windy embed: overlay=wind / rainAccu / pressure / clouds...
    // Bạn có thể đổi overlay tùy ý.
    const overlay = params.get("overlay") ?? "wind"; // vd: rainAccu, wind, pressure, clouds
    const zoom = params.get("zoom") ?? "6";

    return (
      `https://embed.windy.com/embed2.html` +
      `?lat=${encodeURIComponent(String(lat))}` +
      `&lon=${encodeURIComponent(String(lon))}` +
      `&zoom=${encodeURIComponent(String(zoom))}` +
      `&level=surface` +
      `&overlay=${encodeURIComponent(String(overlay))}` +
      `&menu=&message=&marker=&calendar=now` +
      `&pressure=&type=map&location=coordinates` +
      `&detail=&detailLat=${encodeURIComponent(String(lat))}` +
      `&detailLon=${encodeURIComponent(String(lon))}` +
      `&metricWind=km%2Fh&metricTemp=%C2%B0C`
    );
  }, [lat, lon, params]);

  return (
    <>
      <TopBar />
      <div style={styles.wrap}>
        <iframe
          title="Windy"
          src={src}
          style={styles.iframe}
          allowFullScreen
        />
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    paddingTop: 52,
    height: "100vh",
    background: "#0b1220",
  },
  iframe: {
    width: "100%",
    height: "calc(100vh - 52px)",
    border: 0,
  },
};