import {
  BarChart,
  Bar,
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

export default function ComparisonBarChart({ regionA, regionB }) {
  const data = regionA.risk.components.map((c, i) => ({
    name: c.name,
    [regionA.name]: c.severity,
    [regionB.name]: regionB.risk.components[i].severity,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} domain={[0, 100]} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <Bar dataKey={regionA.name} fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey={regionB.name} fill="#06b6d4" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}