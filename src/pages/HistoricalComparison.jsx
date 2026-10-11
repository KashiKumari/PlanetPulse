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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Trees, Leaf, Thermometer, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { api } from "@/services/planetPulseApi";
import { allRegions } from "@/data/allRegions";
import { indiaStates } from "@/data/indiaStates";
import { hotspots } from "@/data/hotspots";
import { getMetricColor } from "@/utils/riskColors";
import TimeSlider from "@/components/history/TimeSlider";
import NasaPowerChart from "@/components/dashboard/NasaPowerChart";
import NasaPowerCard from "@/components/dashboard/NasaPowerCard";
import CurrentAirQualityCard from "@/components/dashboard/CurrentAirQualityCard";
import EcoAgentLink from "@/components/agent/EcoAgentLink";
import { getHistorySnapshot, requestHistory } from "@/utils/historyData";

const tooltipStyle = {
  background: "hsl(222 42% 8%)",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontSize: "12px",
};

export default function HistoricalComparison() {
  const [regionId, setRegionId] = useState("in-maharashtra");
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [nasaState, setNasaState] = useState({ data: null, loading: true, error: null });

  const region = allRegions.find((r) => r.id === regionId);

  useEffect(() => {
    if (!region) return;
    const controller = new AbortController();
    setLoading(true);
    setHistory(null);
    setError(null);
    setNasaState({ data: null, loading: true, error: null });
    requestHistory(api.regionHistory, {
      lat: region.lat,
      lng: region.lng,
      name: region.name,
    })
      .then((historyData) => {
        if (!controller.signal.aborted) setHistory(historyData);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(requestError.message || "Failed to load historical data.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
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

  const { current, deltas } = getHistorySnapshot(history || [], selectedYear);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Historical Comparison</h1>
        <p className="text-muted-foreground">Track environmental changes from 2005 → 2026 with an interactive timeline.</p>
      </div>

      {/* Region selector */}
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
        <EcoAgentLink region={region} startYear={2005} endYear={selectedYear}>
          Ask Eco Agent about this history
        </EcoAgentLink>
      </div>

      <div className="mb-5">
        <NasaPowerCard
          data={nasaState.data}
          year={selectedYear}
          loading={nasaState.loading}
          error={nasaState.error}
        />
      </div>

      {loading && (
        <div role="status" className="flex items-center justify-center gap-3 py-20 text-sm text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          Loading historical data…
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
          Historical data could not be loaded: {error}
        </div>
      )}

      {history && !loading && history.length === 0 && (
        <div role="status" className="rounded-xl border border-border/60 bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
          No historical records are available for this region.
        </div>
      )}

      {history && !loading && history.length > 0 && !current && (
        <div role="status" className="mb-5 rounded-xl border border-border/60 bg-card/60 px-4 py-4 text-sm text-muted-foreground">
          No historical record is available for {selectedYear}. Other available years are shown below.
        </div>
      )}

      {history && !loading && history.length > 0 && (
        <>
          {/* Time slider */}
          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 mb-5">
            <TimeSlider min={2005} max={2026} value={selectedYear} onChange={setSelectedYear} />
          </div>

          {/* Metric snapshot cards */}
          {current && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <SnapshotCard
                icon={Trees}
                label="Forest Cover"
                value={current.forest_cover_pct}
                unit="%"
                delta={deltas?.forest_cover_pct}
                color={getMetricColor("forest", region.forest_loss_pct)}
              />
              <SnapshotCard
                icon={Leaf}
                label="NDVI"
                value={current.ndvi}
                unit=""
                delta={deltas?.ndvi}
                color={getMetricColor("ndvi", region.ndvi_change_pct)}
                deltaPrecision={3}
              />
              <SnapshotCard
                icon={Thermometer}
                label="Temp Anomaly"
                value={`+${current.temp_anomaly_c}`}
                unit="°C"
                delta={deltas?.temp_anomaly_c}
                color={getMetricColor("temperature", region.temp_anomaly_c)}
              />
            </div>
          )}

          <div className="mb-5">
            <CurrentAirQualityCard
              lat={region.lat}
              lng={region.lng}
              placeName={region.name}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Forest Cover & Temperature" subtitle="2005–2026">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={history} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} domain={[0, 4]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <ReferenceLine yAxisId="left" x={selectedYear} stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="4 4" />
                  <Line yAxisId="left" type="monotone" dataKey="forest_cover_pct" stroke="#22c55e" name="Forest Cover %" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="temp_anomaly_c" stroke="#f97316" name="Temp °C" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="NDVI Trend" subtitle="Prototype historical series · 2005–2026">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={history} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} domain={[0, 1]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <ReferenceLine yAxisId="left" x={selectedYear} stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="4 4" />
                  <Line yAxisId="left" type="monotone" dataKey="ndvi" stroke="#06b6d4" name="NDVI" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Live NASA POWER climate chart */}
          {nasaState.data && (
            <div className="rounded-2xl border border-secondary/30 bg-card/60 backdrop-blur-sm p-6 mb-5">
              <div className="mb-4">
                <h2 className="font-display text-lg font-semibold">NASA POWER Monthly Climate History</h2>
                <p className="text-xs text-muted-foreground">
                  NASA POWER · Latest available monthly climate data
                </p>
              </div>
              <NasaPowerChart data={nasaState.data} />
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground/60 mt-6">
            NASA POWER monthly climate observations are separate from prototype historical greenery trends · Drag the slider to explore each year
          </p>
        </>
      )}
    </div>
  );
}

function SnapshotCard({ icon: Icon, label, value, unit, delta, color, deltaPrecision = 1, deltaUnit = unit }) {
  const isNegative = delta < 0;
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="font-display text-2xl font-bold" style={{ color }}>
        {value}<span className="text-sm text-muted-foreground ml-1 font-normal">{unit}</span>
      </p>
      {delta != null && (
        <p className={`flex items-center gap-0.5 text-xs mt-1.5 ${isNegative ? "text-red-400" : "text-emerald-400"}`}>
          {isNegative ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          {isNegative ? "" : "+"}
          {delta.toFixed(deltaPrecision)}{deltaUnit} vs 2005
        </p>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      {children}
    </div>
  );
}