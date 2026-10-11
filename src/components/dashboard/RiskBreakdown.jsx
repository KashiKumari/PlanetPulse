function severityColor(severity) {
  if (severity > 66) return "#ef4444";
  if (severity > 33) return "#f97316";
  return "#eab308";
}

export default function RiskBreakdown({ components }) {
  const maxContribution = Math.max(...components.map((c) => c.contribution), 1);

  return (
    <div className="space-y-3.5">
      {components.map((c) => (
        <div key={c.name}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-foreground">{c.name}</span>
            <span className="text-xs text-muted-foreground">
              {c.raw_value}
              {c.unit} ·{" "}
              <span className="font-semibold text-foreground">{c.contribution} pts</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${(c.contribution / maxContribution) * 100}%`,
                backgroundColor: severityColor(c.severity),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}