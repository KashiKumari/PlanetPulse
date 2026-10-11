import { Gauge, Trees, Leaf, Thermometer, Wind } from "lucide-react";

export const layers = [
  { id: "risk", label: "Risk Score", icon: Gauge, field: "risk_score", unit: "/100" },
  { id: "forest", label: "Forest Loss", icon: Trees, field: "forest_loss_pct", unit: "%" },
  { id: "ndvi", label: "NDVI Change", icon: Leaf, field: "ndvi_change_pct", unit: "%" },
  { id: "temperature", label: "Temperature", icon: Thermometer, field: "temp_anomaly_c", unit: "°C" },
  { id: "air", label: "Air Quality", icon: Wind, field: "pm25", unit: "µg/m³" },
];

// Severity thresholds: [yellow, orange, red]
const thresholds = {
  risk: [40, 60, 80],
  forest: [5, 12, 20],
  ndvi: [-3, -7, -10], // negative is worse
  temperature: [1, 1.5, 2.5],
  air: [15, 35, 55],
};

const colors = {
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
};

export function getMetricColor(layerId, value) {
  const t = thresholds[layerId];
  if (!t) return colors.green;
  if (layerId === "ndvi") {
    if (value <= t[2]) return colors.red;
    if (value <= t[1]) return colors.orange;
    if (value <= t[0]) return colors.yellow;
    return colors.green;
  }
  if (value >= t[2]) return colors.red;
  if (value >= t[1]) return colors.orange;
  if (value >= t[0]) return colors.yellow;
  return colors.green;
}

export function riskLevel(score) {
  if (score >= 80) return { label: "Critical", color: colors.red, key: "critical", emoji: "🔴" };
  if (score >= 60) return { label: "High", color: colors.orange, key: "high", emoji: "🟠" };
  if (score >= 40) return { label: "Moderate", color: colors.yellow, key: "moderate", emoji: "🟡" };
  return { label: "Low", color: colors.green, key: "low", emoji: "🟢" };
}

export function getRadius(layerId, value) {
  const t = thresholds[layerId];
  if (!t) return 8;
  if (layerId === "ndvi") {
    const sev = Math.abs(value) / Math.abs(t[2]);
    return 6 + Math.min(sev, 1) * 10;
  }
  const sev = value / t[2];
  return 6 + Math.min(Math.max(sev, 0), 1) * 10;
}