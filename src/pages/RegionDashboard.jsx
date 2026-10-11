import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Trees,
  Leaf,
  Thermometer,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  MapPin,
  Sparkles,
} from "lucide-react";
import { api } from "@/services/planetPulseApi";
import { hotspots } from "@/data/hotspots";
import { riskLevel, getMetricColor } from "@/utils/riskColors";
import RiskGauge from "@/components/dashboard/RiskGauge";
import IndicatorCard from "@/components/dashboard/IndicatorCard";
import RiskBreakdown from "@/components/dashboard/RiskBreakdown";
import HistoryChart from "@/components/dashboard/HistoryChart";
import ForecastChart from "@/components/dashboard/ForecastChart";
import RegionPicker from "@/components/dashboard/RegionPicker";
import NasaPowerCard from "@/components/dashboard/NasaPowerCard";
import NasaPowerChart from "@/components/dashboard/NasaPowerChart";
import CurrentAirQualityCard from "@/components/dashboard/CurrentAirQualityCard";

export default function RegionDashboard() {
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name");
  const lat = parseFloat(searchParams.get("lat"));
  const lng = parseFloat(searchParams.get("lng"));
  const id = searchParams.get("id");

  const [data, setData] = useState({
    info: null,
    history: null,
    forecast: null,
    nasa: null,
    nasaError: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hotspot = id ? hotspots.find((h) => h.id === id) : null;
  const hasCoords = !isNaN(lat) && !isNaN(lng);

  useEffect(() => {
    if (!hasCoords) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.allSettled([
      api.regionInfo({ lat, lng, name, id }),
      api.regionHistory({ lat, lng, name }),
      api.predict({ lat, lng, name, horizon: 4 }),
      api.nasaPower({ lat, lng, signal: controller.signal }),
    ]).then(([infoRes, histRes, fcRes, nasaRes]) => {
      if (controller.signal.aborted) return;
      if (infoRes.status === "rejected") throw infoRes.reason;
      setData({
        info: infoRes.value.data,
        history: histRes.status === "fulfilled" ? histRes.value.data.history : null,
        forecast: fcRes.status === "fulfilled" ? fcRes.value.data : null,
        nasa: nasaRes.status === "fulfilled" ? nasaRes.value.data : null,
        nasaError:
          nasaRes.status === "rejected"
            ? nasaRes.reason.message || "NASA POWER request failed."
            : null,
      });
    })
      .catch((e) => setError(e.message || "Failed to load region data"))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [lat, lng, name, id, hasCoords]);

  if (!hasCoords) return <RegionPicker />;
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data.info) return null;

  const { info, history, forecast } = data;
  const rl = riskLevel(info.risk.score);
  const ind = info.indicators;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/map"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to map
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: rl.color }} />
              <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: rl.color }}>
                {rl.label} Risk · Score {info.risk.score}
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{info.region.name}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
              {hotspot?.biome && <span>{hotspot.biome}</span>}
              {hotspot?.biome && <span>·</span>}
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {lat.toFixed(1)}°, {lng.toFixed(1)}°
              </span>
            </div>
          </div>
          <Link
            to={`/eco-analyst?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name || "")}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Sparkles className="h-4 w-4" /> Ask Eco Agent
          </Link>
        </div>
      </div>

      {/* Risk gauge + Indicator cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Risk card */}
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Prototype Risk Score
          </h2>
          <RiskGauge score={info.risk.score} />
          <div className="mt-5 pt-4 border-t border-border/60">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Score Breakdown
            </p>
            <RiskBreakdown components={info.risk.components} />
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-4 leading-relaxed">
            {info.risk.disclaimer}
          </p>
        </div>

        {/* Indicator cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <IndicatorCard
            icon={Trees}
            label="Forest Cover"
            value={ind.forest_cover_pct}
            unit="%"
            trend={-ind.forest_loss_pct}
            trendLabel={`-${ind.forest_loss_pct}% lost`}
            color={getMetricColor("forest", ind.forest_loss_pct)}
            source="Hansen Global Forest Change (planned)"
          />
          <IndicatorCard
            icon={Leaf}
            label="NDVI"
            value={ind.ndvi}
            unit=""
            trend={ind.ndvi_change_pct}
            trendLabel={`${ind.ndvi_change_pct}%`}
            color={getMetricColor("ndvi", ind.ndvi_change_pct)}
            source="MODIS MOD13A2 (planned)"
          />
          <IndicatorCard
            icon={Thermometer}
            label="Temperature Anomaly"
            value={
              data.nasa
                ? `${data.nasa.temp_anomaly_c >= 0 ? "+" : ""}${data.nasa.temp_anomaly_c}`
                : `+${ind.temp_anomaly_c}`
            }
            unit="°C"
            color={getMetricColor(
              "temperature",
              data.nasa ? data.nasa.temp_anomaly_c : ind.temp_anomaly_c
            )}
            source={data.nasa ? "NASA POWER (live)" : "NASA POWER (planned)"}
          />
          <CurrentAirQualityCard lat={lat} lng={lng} placeName={info.region.name} />
        </div>
      </div>

      {/* Live NASA POWER climate data */}
      <div className="mb-5">
        <NasaPowerCard data={data.nasa} error={data.nasaError} />
      </div>

      {/* Historical chart */}
      {history && (
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Historical Trends</h2>
              <p className="text-xs text-muted-foreground">2005–2026 · Prototype data</p>
            </div>
          </div>
          <HistoryChart history={history} />
        </div>
      )}

      {/* Live NASA POWER temperature & precipitation chart */}
      {data.nasa && (
        <div className="rounded-2xl border border-secondary/30 bg-card/60 backdrop-blur-sm p-6 mb-5">
          <div className="mb-4">
            <h2 className="font-display text-lg font-semibold">NASA POWER Monthly Climate History</h2>
            <p className="text-xs text-muted-foreground">
              Latest 12 available monthly periods · Gridded estimates
            </p>
          </div>
          <NasaPowerChart data={data.nasa} />
        </div>
      )}

      {/* Forecast chart + model metrics */}
      {forecast && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
            <div className="mb-4">
              <h2 className="font-display text-lg font-semibold">Forest Cover Forecast</h2>
              <p className="text-xs text-muted-foreground">
                2027–2030 · Linear trend regression with 95% confidence interval
              </p>
            </div>
            <ForecastChart history={history || []} forecast={forecast.forecast} />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
            <h2 className="font-display text-lg font-semibold mb-1">Model Performance</h2>
            <p className="text-xs text-muted-foreground mb-4">{forecast.model.name}</p>
            <div className="space-y-3">
              <Metric label="Forest Cover R²" value={forecast.model.metrics.forest_cover.r2} />
              <Metric label="MAE" value={forecast.model.metrics.forest_cover.mae} unit="%" />
              <Metric label="RMSE" value={forecast.model.metrics.forest_cover.rmse} unit="%" />
              <Metric
                label="Slope / year"
                value={forecast.model.slope_forest_cover_per_year}
                unit="%/yr"
                negative={forecast.model.slope_forest_cover_per_year < 0}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-4 leading-relaxed">
              {forecast.model.disclaimer}
            </p>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground/60 mt-8">
        🛰️ Live climate data from NASA POWER · Forest/NDVI/PM2.5 indicators are prototype
      </p>
    </div>
  );
}

function Metric({ label, value, unit = "", negative = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-semibold ${
          negative ? "text-red-400" : "text-foreground"
        }`}
      >
        {value}
        {unit && <span className="text-muted-foreground font-normal ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      <p className="text-sm text-muted-foreground">Loading region intelligence…</p>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
      <p className="font-semibold mb-1">Failed to load region data</p>
      <p className="text-sm text-muted-foreground max-w-md">{error}</p>
      <Link
        to="/map"
        className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to map
      </Link>
    </div>
  );
}