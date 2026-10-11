// Planet Pulse Prototype Risk Engine.
// Transparent composite score from normalized indicators.
// NOT an internationally validated environmental index.

export function calculateRisk(indicators) {
  const forestLossSev = Math.min((indicators.forest_loss_pct / 30) * 100, 100);
  const ndviSev = Math.min((Math.abs(indicators.ndvi_change_pct) / 20) * 100, 100);
  const tempSev = Math.min((indicators.temp_anomaly_c / 3) * 100, 100);
  const pm25Sev = Math.min((indicators.pm25 / 80) * 100, 100);

  const weights = { forestLoss: 0.3, ndvi: 0.25, temp: 0.2, pm25: 0.25 };

  const score = Math.round(
    forestLossSev * weights.forestLoss +
      ndviSev * weights.ndvi +
      tempSev * weights.temp +
      pm25Sev * weights.pm25
  );

  let level;
  if (score >= 80) level = "Critical";
  else if (score >= 60) level = "High";
  else if (score >= 40) level = "Moderate";
  else level = "Low";

  return {
    score,
    level,
    components: [
      { name: "Forest Loss", raw_value: indicators.forest_loss_pct, unit: "%", weight: weights.forestLoss, severity: Math.round(forestLossSev), contribution: Math.round(forestLossSev * weights.forestLoss) },
      { name: "NDVI Decline", raw_value: indicators.ndvi_change_pct, unit: "%", weight: weights.ndvi, severity: Math.round(ndviSev), contribution: Math.round(ndviSev * weights.ndvi) },
      { name: "Temperature Anomaly", raw_value: indicators.temp_anomaly_c, unit: "°C", weight: weights.temp, severity: Math.round(tempSev), contribution: Math.round(tempSev * weights.temp) },
      { name: "Air Quality (PM2.5)", raw_value: indicators.pm25, unit: "µg/m³", weight: weights.pm25, severity: Math.round(pm25Sev), contribution: Math.round(pm25Sev * weights.pm25) },
    ],
    weights,
    disclaimer: "Planet Pulse Prototype Environmental Risk Score — not an internationally validated index.",
  };
}