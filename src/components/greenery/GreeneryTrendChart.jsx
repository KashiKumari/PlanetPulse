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
import { computeGreeneryStats } from "@/utils/greeneryCalculations";

const tooltipStyle = {
  background: "hsl(222 42% 8%)",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontSize: "12px",
};

export default function GreeneryTrendChart({ history, startYear, endYear }) {
  if (!history || history.length === 0) return null;
  const data = history.map((h) => ({
    year: h.year,
    greenery: h.forest_cover_pct,
    ndvi: h.ndvi,
  }));
  const stats = computeGreeneryStats(history, startYear, endYear);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
      <h2 className="font-display text-lg font-semibold mb-1">Greenery / Forest Cover Trend</h2>
      <p className="text-xs text-muted-foreground mb-4">
        {startYear}–{endYear} · Demo data
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="year"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            stroke="#22c55e"
            fontSize={12}
            tickLine={false}
            domain={[0, 100]}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#06b6d4"
            fontSize={12}
            tickLine={false}
            domain={[0, 1]}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <ReferenceLine
            x={startYear}
            yAxisId="left"
            stroke="hsl(var(--border))"
            strokeDasharray="4 4"
          />
          <ReferenceLine
            x={endYear}
            yAxisId="left"
            stroke="hsl(var(--border))"
            strokeDasharray="4 4"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="greenery"
            stroke="#22c55e"
            name="Greenery %"
            strokeWidth={2.5}
            dot={{ r: 4 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ndvi"
            stroke="#06b6d4"
            name="NDVI"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/60">
          <StatCard
            label="Total change"
            value={`${stats.totalChangePct >= 0 ? "+" : ""}${stats.totalChangePct.toFixed(1)}%`}
            negative={stats.totalChange < 0}
          />
          <StatCard
            label="Avg annual"
            value={`${stats.avgAnnualChange >= 0 ? "+" : ""}${stats.avgAnnualChange.toFixed(1)}%`}
            negative={stats.avgAnnualChange < 0}
          />
          <StatCard label="Highest loss" value={stats.highestLossYear || "N/A"} />
          <StatCard label="Lowest loss" value={stats.lowestLossYear || "N/A"} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, negative = false }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`font-display text-lg font-bold ${
          negative ? "text-red-400" : "text-emerald-400"
        }`}
      >
        {value}
      </p>
    </div>
  );
}