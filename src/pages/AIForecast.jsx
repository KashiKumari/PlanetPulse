import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trees, Leaf, Thermometer, Loader2, TrendingDown } from "lucide-react";
import { api } from "@/services/planetPulseApi";
import { allRegions } from "@/data/allRegions";
import { indiaStates } from "@/data/indiaStates";
import { hotspots } from "@/data/hotspots";
import ForecastChart from "@/components/dashboard/ForecastChart";
import NasaPowerChart from "@/components/dashboard/NasaPowerChart";
import NasaPowerCard from "@/components/dashboard/NasaPowerCard";
import { Satellite } from "lucide-react";
import EcoAgentLink from "@/components/agent/EcoAgentLink";

export default function AIForecast() {
  const [regionId, setRegionId] = useState("in-maharashtra");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nasaState, setNasaState] = useState({ data: null, loading: false, error: null });

  const region = allRegions.find((r) => r.id === regionId);

  useEffect(() => {
    if (!region) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setNasaState({ data: null, loading: true, error: null });
    api
      .predict({ lat: region.lat, lng: region.lng, name: region.name, horizon: 4 })
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message || "Failed to load forecast"))
      .finally(() => setLoading(false));
    api
      .nasaPower({ lat: region.lat, lng: region.lng, signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          setNasaState({ data: res.data, loading: false, error: null });
        }
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setNasaState({
            data: null,
            loading: false,
            error: requestError.message || "NASA POWER request failed.",
          });
        }
      });
    return () => controller.abort();
  }, [regionId, region]);

  const lastForecast = data?.forecast?.[data.forecast.length - 1];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1">AI Forecast</h1>
        <p className="text-muted-foreground">
          Prototype ML trend forecast — linear regression with 95% confidence intervals.
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 mb-5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          Select Region
        </label>
        <Select value={regionId} onValueChange={setRegionId}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>🇮🇳 India States & UTs</SelectLabel>
              {indiaStates.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>🌍 Global Hotspots</SelectLabel>
              {hotspots.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-5 flex justify-end">
        <EcoAgentLink region={region} startYear={2005} endYear={2026}>
          Ask Eco Agent about this forecast
        </EcoAgentLink>
      </div>

      <div className="mb-5">
        <NasaPowerCard
          data={nasaState.data}
          loading={nasaState.loading}
          error={nasaState.error}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      )}

      {error && <div className="text-center py-20 text-destructive text-sm">{error}</div>}

      {data && !loading && (
        <>
          {/* Key 2030 predictions */}
          {lastForecast && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <PredictionCard
                icon={Trees}
                label="Forest Cover (2030)"
                value={`${lastForecast.forest_cover_pct}%`}
                range={`${lastForecast.forest_cover_lower}% – ${lastForecast.forest_cover_upper}%`}
                color="#22c55e"
                trend={data.model.slope_forest_cover_per_year}
                trendUnit="%/yr"
              />
              <PredictionCard
                icon={Leaf}
                label="NDVI (2030)"
                value={lastForecast.ndvi}
                color="#06b6d4"
              />
              <PredictionCard
                icon={Thermometer}
                label="Temp Anomaly (2030)"
                value={`+${lastForecast.temp_anomaly_c}°C`}
                color="#f97316"
              />
            </div>
          )}

          {/* Live NASA POWER temperature & precipitation trend */}
          {nasaState.data && (
            <div className="rounded-2xl border border-secondary/30 bg-card/60 backdrop-blur-sm p-6 mb-5">
              <div className="flex items-center gap-2 mb-4">
                <Satellite className="h-5 w-5 text-secondary" />
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    NASA POWER Monthly Climate History
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Latest 12 available monthly periods · Gridded estimates
                  </p>
                </div>
              </div>
              <NasaPowerChart data={nasaState.data} />
            </div>
          )}

          {/* Forecast chart + model metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
              <h2 className="font-display text-lg font-semibold mb-1">Forest Cover Forecast</h2>
              <p className="text-xs text-muted-foreground mb-4">
                2005–2026 historical (solid) · 2027–2030 forecast (dashed) · 95% confidence band
              </p>
              <ForecastChart history={[]} forecast={data.forecast} />
              <p className="text-[10px] text-muted-foreground/70 mt-3 text-center">
                {data.model.disclaimer}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
              <h2 className="font-display text-lg font-semibold mb-1">Model Performance</h2>
              <p className="text-xs text-muted-foreground mb-4">{data.model.name}</p>
              <div className="space-y-3">
                <MetricRow label="Forest Cover R²" value={data.model.metrics.forest_cover.r2} />
                <MetricRow label="MAE" value={data.model.metrics.forest_cover.mae} unit="%" />
                <MetricRow label="RMSE" value={data.model.metrics.forest_cover.rmse} unit="%" />
                <MetricRow label="NDVI R²" value={data.model.metrics.ndvi.r2} />
                <MetricRow label="Temperature R²" value={data.model.metrics.temperature.r2} />
                <MetricRow
                  label="Slope / year"
                  value={data.model.slope_forest_cover_per_year}
                  unit="%/yr"
                  negative={data.model.slope_forest_cover_per_year < 0}
                />
              </div>
              <div className="mt-4 pt-4 border-t border-border/60">
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                  {data.model.description}
                </p>
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed mt-1">
                  {data.model.confidence}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PredictionCard({
  icon: Icon,
  label,
  value,
  range = null,
  color,
  trend = null,
  trendUnit = "",
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="font-display text-3xl font-bold" style={{ color }}>{value}</p>
      {range && <p className="text-xs text-muted-foreground mt-1">95% CI: {range}</p>}
      {trend != null && (
        <p className={`flex items-center gap-0.5 text-xs mt-1.5 ${trend < 0 ? "text-red-400" : "text-emerald-400"}`}>
          {trend < 0 && <TrendingDown className="h-3 w-3" />}
          {trend > 0 ? "+" : ""}{trend}{trendUnit} trend
        </p>
      )}
    </div>
  );
}

function MetricRow({ label, value, unit = "", negative = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${negative ? "text-red-400" : "text-foreground"}`}>
        {value}
        {unit && <span className="text-muted-foreground font-normal ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}