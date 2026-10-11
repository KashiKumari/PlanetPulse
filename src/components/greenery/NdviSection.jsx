import { Leaf, TrendingDown, TrendingUp } from "lucide-react";
import { getNdviColor, getNdviForYear, computeGreeneryStats } from "@/utils/greeneryCalculations";

export default function NdviSection({ history, startYear, endYear }) {
  if (!history || history.length === 0) return null;
  const stats = computeGreeneryStats(history, startYear, endYear);
  if (!stats) return null;

  const allYears = history.map((h) => h.year);
  const sampleYears = [];
  const step = Math.max(1, Math.floor((allYears.length - 1) / 4));
  for (let i = 0; i < allYears.length; i += step) sampleYears.push(allYears[i]);
  if (sampleYears[sampleYears.length - 1] !== endYear) sampleYears.push(endYear);

  const TrendIcon = stats.ndviChange < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Leaf className="h-5 w-5 text-secondary" />
        <h2 className="font-display text-lg font-semibold">NDVI — Vegetation Health</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {sampleYears.map((year) => {
          const ndvi = getNdviForYear(history, year);
          if (ndvi == null)
            return (
              <div key={year} className="rounded-lg bg-muted/30 px-3 py-2.5">
                <p className="text-xs text-muted-foreground">{year}</p>
                <p className="text-sm font-semibold text-muted-foreground">Data unavailable</p>
              </div>
            );
          return (
            <div key={year} className="rounded-lg bg-muted/30 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{year}</p>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: getNdviColor(ndvi) }}
                />
                <p
                  className="font-display text-lg font-bold"
                  style={{ color: getNdviColor(ndvi) }}
                >
                  {ndvi.toFixed(2)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between rounded-xl bg-muted/20 px-4 py-3">
        <div>
          <p className="text-sm text-muted-foreground">
            NDVI Change ({startYear} → {endYear})
          </p>
          <div className="flex items-center gap-2">
            <TrendIcon
              className={`h-5 w-5 ${stats.ndviChange < 0 ? "text-red-400" : "text-emerald-400"}`}
            />
            <p
              className={`font-display text-2xl font-bold ${
                stats.ndviChange < 0 ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {stats.ndviChangePct >= 0 ? "+" : ""}
              {stats.ndviChangePct.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/70 mt-3 leading-relaxed">
        NDVI (Normalized Difference Vegetation Index) is a satellite-derived indicator of vegetation
        health, calculated from near-infrared and red light reflectance. Values range from -1 to 1 —
        higher values indicate denser, healthier vegetation. NDVI measures vegetation health, not
        forest area directly.
      </p>
    </div>
  );
}