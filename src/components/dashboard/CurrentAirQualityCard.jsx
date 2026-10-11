import { useEffect, useState } from "react";
import { Wind } from "lucide-react";
import { getCurrentAirQuality } from "@/services/airQualityApi";

function getAqiStatus(aqi) {
  if (aqi <= 50) return { label: "Good", color: "#4ade80" };
  if (aqi <= 100) return { label: "Moderate", color: "#facc15" };
  if (aqi <= 150) return { label: "Sensitive groups", color: "#fb923c" };
  if (aqi <= 200) return { label: "Unhealthy", color: "#f87171" };
  if (aqi <= 300) return { label: "Very unhealthy", color: "#c084fc" };
  return { label: "Hazardous", color: "#d946ef" };
}

export default function CurrentAirQualityCard({ lat, lng, placeName, compact = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    setLoading(true);

    getCurrentAirQuality({ lat, lng, signal: controller.signal })
      .then(setData)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [lat, lng]);

  const cardClass = compact
    ? "rounded-lg border border-border/50 bg-muted/30 p-3"
    : "rounded-xl border border-border/60 bg-card/60 p-4";

  return (
    <div className={cardClass} aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wind className="h-4 w-4 text-secondary" aria-hidden="true" />
          <span className="text-xs font-medium text-muted-foreground">Current air quality</span>
        </div>
        <span className="rounded-full border border-secondary/20 bg-secondary/10 px-2 py-0.5 text-[9px] text-secondary">
          Modeled · hourly
        </span>
      </div>

      {loading && <p className="py-2 text-xs text-muted-foreground">Loading latest air-quality estimate…</p>}
      {!loading && error && (
        <p role="alert" className="py-1 text-xs text-destructive">
          Current AQI could not be loaded: {error}
        </p>
      )}
      {!loading && data && (
        <>
          <div className="flex items-end gap-2">
            <span
              className="font-display text-3xl font-bold leading-none"
              style={{ color: getAqiStatus(data.us_aqi).color }}
            >
              {Math.round(data.us_aqi)}
            </span>
            <span className="pb-0.5 text-xs text-muted-foreground">
              US AQI · {getAqiStatus(data.us_aqi).label}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>PM2.5 {Number.isFinite(data.pm2_5) ? `${data.pm2_5} µg/m³` : "—"}</span>
            <span>PM10 {Number.isFinite(data.pm10) ? `${data.pm10} µg/m³` : "—"}</span>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/80">
            {placeName ? `Grid estimate near ${placeName}. ` : ""}
            Not a CPCB station reading or a state-wide average. {data.time} ({data.timezone}).
          </p>
          <a
            href={data.source_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-[10px] text-secondary hover:underline"
          >
            Source: {data.source} · {data.model}
          </a>
        </>
      )}
    </div>
  );
}
