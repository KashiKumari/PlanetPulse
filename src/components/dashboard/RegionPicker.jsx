import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { hotspots } from "@/data/hotspots";
import { riskLevel } from "@/utils/riskColors";

export default function RegionPicker() {
  const sorted = [...hotspots].sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Region Dashboard</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Select an environmental hotspot to view its indicators, risk score, historical trends, and forecast.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((h) => {
          const rl = riskLevel(h.risk_score);
          return (
            <Link
              key={h.id}
              to={`/dashboard?name=${encodeURIComponent(h.name)}&lat=${h.lat}&lng=${h.lng}&id=${h.id}`}
              className="group rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 hover:border-primary/40 hover:bg-card transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {h.country}
                </div>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: rl.color }} />
                  <span className="text-sm font-bold" style={{ color: rl.color }}>
                    {h.risk_score}
                  </span>
                </span>
              </div>
              <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {h.name}
              </h3>
              <p className="text-xs text-muted-foreground">{h.biome}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}