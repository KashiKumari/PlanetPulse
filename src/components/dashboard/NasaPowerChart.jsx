import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const tooltipStyle = {
  background: "hsl(222 42% 8%)",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontSize: "12px",
};

export default function NasaPowerChart({ data, height = 280 }) {
  if (!data?.series?.length) return null;
  const precipitationUnit = data.units?.precipitation_mm || "mm/day";

  const chartData = data.series.map((s) => ({
    label: `${monthNames[s.month - 1]} '${String(s.year).slice(2)}`,
    temperature_c: s.temperature_c,
    precipitation_mm: s.precipitation_mm,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          stroke="#f97316"
          fontSize={12}
          tickLine={false}
          label={{
            value: "°C",
            angle: -90,
            position: "insideLeft",
            style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#06b6d4"
          fontSize={12}
          tickLine={false}
          label={{
            value: precipitationUnit,
            angle: 90,
            position: "insideRight",
            style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
          }}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <Bar
          yAxisId="right"
          dataKey="precipitation_mm"
          fill="#06b6d4"
          fillOpacity={0.3}
          name={`Precipitation (${precipitationUnit})`}
          radius={[4, 4, 0, 0]}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="temperature_c"
          stroke="#f97316"
          name="Temperature (°C)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}