import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

const tooltipStyle = {
  background: "hsl(222 42% 8%)",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontSize: "12px",
};

export default function ForecastChart({ history, forecast }) {
  const lastHist = history.length > 0 ? history[history.length - 1] : null;
  const data = [
    ...history.map((h) => ({ year: h.year, historical: h.forest_cover_pct })),
    ...forecast.map((f, i) => ({
      year: f.year,
      // Bridge the gap: first forecast point repeats the last historical value
      // so the dashed forecast line connects seamlessly to the solid historical line.
      forecast: i === 0 && lastHist ? lastHist.forest_cover_pct : f.forest_cover_pct,
      band: [f.forest_cover_lower, f.forest_cover_upper],
    })),
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(38 92% 56% / 0.25)" />
            <stop offset="100%" stopColor="hsl(38 92% 56% / 0.08)" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} domain={[0, 100]} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--muted-foreground))" }} />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <ReferenceLine x={2026} stroke="hsl(var(--border))" strokeDasharray="4 4" label={{ value: "Today", fontSize: 10, fill: "hsl(var(--muted-foreground))", position: "top" }} />
        <Area type="monotone" dataKey="band" stroke="none" fill="url(#forecastBand)" fillOpacity={1} name="95% CI" connectNulls />
        <Line type="monotone" dataKey="historical" stroke="#22c55e" name="Historical" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="forecast" stroke="#eab308" name="Forecast" strokeWidth={2.5} strokeDasharray="5 5" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}