import React, { useEffect, useRef, useState } from "react";

export type WindyOverlay = "wind" | "rainAccu" | "pressure";
export type LatLng = [number, number];

declare global {
  interface Window {
    windyInit?: (options: any, cb: (windyAPI: any) => void) => void;
  }
}

const WINDY_BOOT_URL = "https://api.windy.com/assets/map-forecast/libBoot.js";

let windyBootPromise: Promise<void> | null = null;

function loadWindyBoot(): Promise<void> {
  if (windyBootPromise) return windyBootPromise;

  windyBootPromise = new Promise<void>((resolve, reject) => {
    // already loaded?
    if (window.windyInit) return resolve();

    // already appended?
    const existed = document.querySelector(`script[src="${WINDY_BOOT_URL}"]`);
    if (existed) {
      const timer = setInterval(() => {
        if (window.windyInit) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(timer);
        if (!window.windyInit) reject(new Error("Windy boot loaded but windyInit not found"));
      }, 15000);
      return;
    }

    const script = document.createElement("script");
    script.src = WINDY_BOOT_URL;
    script.async = true;

    script.onload = () => {
      if (window.windyInit) resolve();
      else reject(new Error("Windy loaded but windyInit not found"));
    };
    script.onerror = () => reject(new Error("Failed to load Windy boot script"));

    document.body.appendChild(script);
  });

  return windyBootPromise;
}

export default function WindyModal({
  open,
  onClose,
  center,
  overlay,
  zoom = 8,
}: {
  open: boolean;
  onClose: () => void;
  center: LatLng;
  overlay: WindyOverlay;
  zoom?: number;
}) {
  const apiRef = useRef<any>(null);
  const [initError, setInitError] = useState<string>("");

  const windyKey = (import.meta as any).env?.VITE_WINDY_KEY as string | undefined;

  // init once
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!open) return;
      setInitError("");

      if (!windyKey) {
        setInitError("Thiếu VITE_WINDY_KEY trong .env (frontend).");
        return;
      }

      try {
        await loadWindyBoot();
        if (cancelled) return;

        // already init
        if (apiRef.current) {
          return;
        }

        const options = {
          key: windyKey,
          lat: center[0],
          lon: center[1],
          zoom,
          overlay, // wind | rainAccu | pressure :contentReference[oaicite:2]{index=2}
          verbose: false,
        };

        window.windyInit?.(options, (windyAPI: any) => {
          apiRef.current = windyAPI;
          // sync overlay + view
          try {
            windyAPI?.store?.set("overlay", overlay);
            windyAPI?.map?.setView([center[0], center[1]], zoom);
          } catch {}
        });
      } catch (e: any) {
        setInitError(e?.message || "Không thể tải Windy.");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // sync overlay / center every time open & ready
  useEffect(() => {
    if (!open) return;
    const windyAPI = apiRef.current;
    if (!windyAPI) return;

    try {
      windyAPI.store.set("overlay", overlay); // đổi overlay runtime :contentReference[oaicite:3]{index=3}
      windyAPI.map.setView([center[0], center[1]], zoom);
    } catch {}
  }, [open, overlay, center, zoom]);

  return (
    <div style={{ ...styles.backdrop, display: open ? "flex" : "none" }}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <b>🌬 Windy (Live)</b>
            <div style={styles.sub}>Overlay: <b>{overlay}</b></div>
          </div>

          <button style={styles.close} onClick={onClose}>
            ✕
          </button>
        </div>

        {initError && <div style={styles.error}>⚠ {initError}</div>}

        {/* Windy yêu cầu div id="windy" */}
        <div id="windy" style={styles.windyBox} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 4000,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    width: "min(1200px, 96vw)",
    height: "min(720px, 88vh)",
    background: "white",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 0 18px rgba(0,0,0,0.35)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    height: 54,
    padding: "10px 12px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sub: { fontSize: 12, opacity: 0.75, marginTop: 2 },
  close: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "white",
    cursor: "pointer",
    fontWeight: 800,
  },
  error: {
    padding: 10,
    margin: 10,
    borderRadius: 10,
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.25)",
    color: "#991b1b",
    fontSize: 13,
  },
  windyBox: {
    flex: 1,
    minHeight: 0,
  },
};
