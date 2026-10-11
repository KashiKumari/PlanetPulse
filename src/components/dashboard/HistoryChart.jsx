import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const tooltipStyle = {
  background: "hsl(222 42% 8%)",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontSize: "12px",
};

export default function HistoryChart({ history }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={history} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
        <YAxis
          yAxisId="left"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          domain={[0, 100]}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          domain={[0, 4]}
        />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--muted-foreground))" }} />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="forest_cover_pct"
          stroke="#22c55e"
          name="Forest Cover %"
          strokeWidth={2.5}
          dot={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="temp_anomaly_c"
          stroke="#f97316"
          name="Temp Anomaly °C"
          strokeWidth={2.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}