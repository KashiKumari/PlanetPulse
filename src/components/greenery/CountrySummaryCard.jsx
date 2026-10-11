import { Trees, TrendingDown, TrendingUp, Minus, ArrowRight, Calendar } from "lucide-react";
import { computeGreeneryStats, getGreeneryColor } from "@/utils/greeneryCalculations";

export default function CountrySummaryCard({
  region,
  history,
  startYear,
  endYear,
  onViewFullHistory,
}) {
  if (!region || !history) return null;
  const stats = computeGreeneryStats(history, startYear, endYear);
  if (!stats) return null;

  const TrendIcon =
    stats.trend === "Declining" ? TrendingDown : stats.trend === "Improving" ? TrendingUp : Minus;
  const trendColor =
    stats.trend === "Declining"
      ? "text-red-400"
      : stats.trend === "Improving"
        ? "text-emerald-400"
        : "text-muted-foreground";

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trees className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">{region.name}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Greenery Cover"
          value={`${stats.lastGreenery.toFixed(1)}%`}
          color={getGreeneryColor(stats.lastGreenery)}
        />
        <Metric
          label={`Change since ${startYear}`}
          value={`${stats.totalChangePct >= 0 ? "+" : ""}${stats.totalChangePct.toFixed(1)}%`}
          negative={stats.totalChange < 0}
        />
        <Metric label="NDVI" value={stats.lastNdvi.toFixed(2)} />
        <Metric
          label="NDVI change"
          value={`${stats.ndviChangePct >= 0 ? "+" : ""}${stats.ndviChangePct.toFixed(1)}%`}
          negative={stats.ndviChange < 0}
        />
        <Metric label="Highest annual loss" value={stats.highestLossYear || "N/A"} />
        <Metric
          label="Current trend"
          value={stats.trend}
          icon={TrendIcon}
          iconColor={trendColor}
        />
      </div>
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/60 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" /> Historical data: {startYear}–{endYear}
      </div>
      <button
        onClick={onViewFullHistory}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        View Full History <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Metric({
  label,
  value,
  color = null,
  negative = false,
  icon: Icon = null,
  iconColor = "",
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className={`h-4 w-4 ${iconColor || ""}`} />}
        <p
          className="font-display text-lg font-bold"
          style={color ? { color } : negative ? { color: "#f87171" } : {}}
        >
          {value}
        </p>
      </div>
    </div>
  );
}