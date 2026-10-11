import { riskLevel } from "@/utils/riskColors";

const items = [
  { key: "critical", label: "Critical", range: "80–100" },
  { key: "high", label: "High", range: "60–79" },
  { key: "moderate", label: "Moderate", range: "40–59" },
  { key: "low", label: "Low", range: "0–39" },
];

export default function RiskLegend({ activeLayer }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {activeLayer === "risk" ? "Risk Legend" : "Severity Legend"}
      </p>
      <div className="space-y-2">
        {items.map((item) => {
          const rl = riskLevel(item.key === "critical" ? 85 : item.key === "high" ? 70 : item.key === "moderate" ? 50 : 25);
          return (
            <div key={item.key} className="flex items-center gap-2.5 text-sm">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: rl.color }} />
              <span className="text-foreground font-medium">{item.label}</span>
              <span className="text-muted-foreground text-xs ml-auto">{item.range}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Planet Pulse Prototype Risk Score — not an internationally validated index.
      </p>
    </div>
  );
}