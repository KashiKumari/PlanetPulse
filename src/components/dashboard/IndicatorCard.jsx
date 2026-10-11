import { TrendingDown, TrendingUp } from "lucide-react";

export default function IndicatorCard({ icon: Icon, label, value, unit, trend, trendLabel, color, source }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 hover:border-border transition-colors">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        {trend != null && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              trend < 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {trend < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {trendLabel}
          </span>
        )}
      </div>
      <p className="font-display text-2xl font-bold" style={{ color }}>
        {value}
        <span className="text-sm text-muted-foreground ml-1 font-normal">{unit}</span>
      </p>
      {source && <p className="text-[10px] text-muted-foreground/70 mt-1.5 truncate">{source}</p>}
    </div>
  );
}