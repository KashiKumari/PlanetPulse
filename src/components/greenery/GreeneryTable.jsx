import { getYearlyChanges, getGreeneryColor } from "@/utils/greeneryCalculations";

export default function GreeneryTable({ history }) {
  if (!history || history.length === 0) return null;
  const rows = getYearlyChanges(history);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
      <h2 className="font-display text-lg font-semibold mb-1">Yearly Change</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Greenery/forest cover by year · Demo data
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Year</th>
              <th className="text-right py-2 px-3 font-semibold text-muted-foreground">
                Greenery / Forest Cover
              </th>
              <th className="text-right py-2 px-3 font-semibold text-muted-foreground">
                Change From Previous
              </th>
              <th className="text-right py-2 px-3 font-semibold text-muted-foreground">
                Cumulative Change
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.year} className="border-b border-border/30 hover:bg-muted/30">
                <td className="py-2.5 px-3 font-semibold">{row.year}</td>
                <td className="text-right py-2.5 px-3">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: getGreeneryColor(row.greenery) }}
                    />
                    <span className="font-semibold">{row.greenery.toFixed(1)}%</span>
                  </span>
                </td>
                <td className="text-right py-2.5 px-3">
                  {row.yearlyChange === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span
                      className={row.yearlyChange < 0 ? "text-red-400" : "text-emerald-400"}
                    >
                      {row.yearlyChange >= 0 ? "+" : ""}
                      {row.yearlyChange.toFixed(1)}%
                    </span>
                  )}
                </td>
                <td className="text-right py-2.5 px-3">
                  <span
                    className={
                      row.cumulativeChange < 0
                        ? "text-red-400"
                        : row.cumulativeChange > 0
                          ? "text-emerald-400"
                          : "text-muted-foreground"
                    }
                  >
                    {row.cumulativeChange >= 0 ? "+" : ""}
                    {row.cumulativeChangePct.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}