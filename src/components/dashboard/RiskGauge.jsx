import { riskLevel } from "@/utils/riskColors";

export default function RiskGauge({ score }) {
  const rl = riskLevel(score);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={rl.color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold" style={{ color: rl.color }}>
            {score}
          </span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: rl.color }} />
        <span className="font-semibold text-sm" style={{ color: rl.color }}>
          {rl.label} Risk
        </span>
      </div>
    </div>
  );
}