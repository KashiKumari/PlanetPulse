const legend = [
  { color: "#16a34a", label: "Healthy / Increased" },
  { color: "#facc15", label: "Moderate change" },
  { color: "#f97316", label: "Vegetation loss" },
  { color: "#dc2626", label: "Significant loss" },
];

export default function ChangeDetectionSection({ history, startYear, endYear }) {
  if (!history || history.length === 0) return null;
  const first = history.find((h) => h.year === startYear) || history[0];
  const last = history.find((h) => h.year === endYear) || history[history.length - 1];
  const change = last.forest_cover_pct - first.forest_cover_pct;
  const classification =
    change >= 0 ? "Healthy" : change >= -1 ? "Moderate" : change >= -2 ? "Loss" : "Significant loss";
  const classColor =
    change >= 0 ? "#16a34a" : change >= -1 ? "#facc15" : change >= -2 ? "#f97316" : "#dc2626";

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
      <h2 className="font-display text-lg font-semibold mb-1">Where did the greenery disappear?</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Change detection · {startYear} → {endYear} · Demo data
      </p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {legend.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2"
          >
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-muted/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Net change ({startYear} → {endYear})
            </p>
            <p
              className={`font-display text-2xl font-bold ${
                change < 0 ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Classification</p>
            <p className="font-semibold" style={{ color: classColor }}>
              {classification}
            </p>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/70 mt-3">
        Full pixel-level change detection requires Sentinel-2/Landsat processing (planned).
      </p>
    </div>
  );
}