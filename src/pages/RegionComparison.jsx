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
import { Trees, Leaf, Thermometer, Loader2, ArrowRight } from "lucide-react";
import { api } from "@/services/planetPulseApi";
import { allRegions } from "@/data/allRegions";
import { indiaStates } from "@/data/indiaStates";
import { hotspots } from "@/data/hotspots";
import { riskLevel, getMetricColor } from "@/utils/riskColors";
import RiskGauge from "@/components/dashboard/RiskGauge";
import ComparisonBarChart from "@/components/compare/ComparisonBarChart";
import CurrentAirQualityCard from "@/components/dashboard/CurrentAirQualityCard";
import RegionClimatePanel from "@/components/dashboard/RegionClimatePanel";
import EcoAgentLink from "@/components/agent/EcoAgentLink";

export default function RegionComparison() {
  const [regionAId, setRegionAId] = useState("in-maharashtra");
  const [regionBId, setRegionBId] = useState("in-karnataka");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const regionA = allRegions.find((r) => r.id === regionAId);
  const regionB = allRegions.find((r) => r.id === regionBId);

  useEffect(() => {
    if (!regionA || !regionB || regionAId === regionBId) return;
    setLoading(true);
    setError(null);
    api
      .compare({
        regionA: { lat: regionA.lat, lng: regionA.lng, name: regionA.name },
        regionB: { lat: regionB.lat, lng: regionB.lng, name: regionB.name },
      })
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message || "Failed to load comparison"))
      .finally(() => setLoading(false));
  }, [regionAId, regionBId, regionA, regionB]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Region Comparison</h1>
        <p className="text-muted-foreground">Side-by-side comparison of two regions across every environmental metric.</p>
      </div>

      {/* Two region selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <RegionSelectorCard label="Region A" color="#22c55e" value={regionAId} onChange={setRegionAId} />
        <RegionSelectorCard label="Region B" color="#06b6d4" value={regionBId} onChange={setRegionBId} />
      </div>

      <div className="mb-5 flex justify-end">
        <EcoAgentLink
          regions={[regionA, regionB]}
          startYear={2005}
          endYear={2026}
        >
          Ask Eco Agent to compare
        </EcoAgentLink>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <RegionClimatePanel lat={regionA.lat} lng={regionA.lng} compact />
        <RegionClimatePanel lat={regionB.lat} lng={regionB.lng} compact />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      )}

      {error && <div className="text-center py-20 text-destructive text-sm">{error}</div>}

      {data && !loading && (
        <>
          {/* Risk gauges side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 flex flex-col items-center">
              <h2 className="font-display text-lg font-semibold mb-1">{data.regionA.name}</h2>
              <p className="text-xs text-muted-foreground mb-4">{data.regionA.risk.level} Risk</p>
              <RiskGauge score={data.regionA.risk.score} />
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 flex flex-col items-center">
              <h2 className="font-display text-lg font-semibold mb-1">{data.regionB.name}</h2>
              <p className="text-xs text-muted-foreground mb-4">{data.regionB.risk.level} Risk</p>
              <RiskGauge score={data.regionB.risk.score} />
            </div>
          </div>

          {/* Comparison bar chart */}
          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 mb-5">
            <h2 className="font-display text-lg font-semibold mb-1">Risk Component Severity</h2>
            <p className="text-xs text-muted-foreground mb-4">Normalized severity scores (0–100) per risk component</p>
            <ComparisonBarChart regionA={data.regionA} regionB={data.regionB} />
          </div>

          {/* Side-by-side indicators */}
          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 mb-5">
            <h2 className="font-display text-lg font-semibold mb-4">Indicator Comparison</h2>
            <div className="space-y-3">
              <IndicatorRow icon={Trees} label="Forest Cover" unit="%" a={data.regionA.indicators.forest_cover_pct} b={data.regionB.indicators.forest_cover_pct} />
              <IndicatorRow icon={Trees} label="Forest Loss" unit="%" a={data.regionA.indicators.forest_loss_pct} b={data.regionB.indicators.forest_loss_pct} lowerIsBetter />
              <IndicatorRow icon={Leaf} label="NDVI" unit="" a={data.regionA.indicators.ndvi} b={data.regionB.indicators.ndvi} precision={3} />
              <IndicatorRow icon={Leaf} label="NDVI Change" unit="%" a={data.regionA.indicators.ndvi_change_pct} b={data.regionB.indicators.ndvi_change_pct} lowerIsBetter />
              <IndicatorRow icon={Thermometer} label="Temp Anomaly" unit="°C" a={data.regionA.indicators.temp_anomaly_c} b={data.regionB.indicators.temp_anomaly_c} lowerIsBetter />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <CurrentAirQualityCard
              lat={regionA.lat}
              lng={regionA.lng}
              placeName={regionA.name}
              compact
            />
            <CurrentAirQualityCard
              lat={regionB.lat}
              lng={regionB.lng}
              placeName={regionB.name}
              compact
            />
          </div>

          {/* Deltas summary */}
          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
            <h2 className="font-display text-lg font-semibold mb-1">Difference (A − B)</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {data.regionA.name} vs {data.regionB.name}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <DeltaCard label="Forest Loss" value={data.deltas.forest_loss_pct} unit="%" />
              <DeltaCard label="NDVI Change" value={data.deltas.ndvi_change_pct} unit="%" />
              <DeltaCard label="Temp Anomaly" value={data.deltas.temp_anomaly_c} unit="°C" />
              <DeltaCard label="Risk Score" value={data.deltas.risk_score} unit="" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RegionSelectorCard({ label, color, value, onChange }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
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
  );
}

function IndicatorRow({
  icon: Icon,
  label,
  unit,
  a,
  b,
  precision = 1,
  lowerIsBetter = false,
}) {
  const aBetter = lowerIsBetter ? a < b : a > b;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground w-32 shrink-0">{label}</span>
      <div className="flex-1 flex items-center justify-end gap-2">
        <span className={`text-sm font-semibold ${aBetter ? "text-emerald-400" : "text-foreground"}`}>
          {a.toFixed(precision)}{unit}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className={`text-sm font-semibold ${!aBetter ? "text-emerald-400" : "text-foreground"}`}>
          {b.toFixed(precision)}{unit}
        </span>
      </div>
    </div>
  );
}

function DeltaCard({ label, value, unit }) {
  const positive = value > 0;
  return (
    <div className="rounded-lg bg-muted/40 p-3 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold ${positive ? "text-red-400" : value < 0 ? "text-emerald-400" : "text-foreground"}`}>
        {positive ? "+" : ""}{value.toFixed(1)}{unit}
      </p>
    </div>
  );
}