import { generateIndicators, generateHistory, generateForecast } from "../../shared/regionData.js";
import { calculateRisk } from "../../shared/riskEngine.js";

function buildRegion(lat, lng, name) {
  const indicators = generateIndicators(lat, lng);
  const history = generateHistory(lat, lng);
  const risk = calculateRisk(indicators);
  return { name, lat: Number(lat), lng: Number(lng), indicators, history, risk };
}

export default async function (req) {
  try {
    const body = await req.json();
    const { regionA, regionB } = body;
    if (!regionA || !regionB || regionA.lat == null || regionB.lat == null) {
      return Response.json({ error: "regionA and regionB with lat/lng are required" }, { status: 400 });
    }

    const a = buildRegion(regionA.lat, regionA.lng, regionA.name);
    const b = buildRegion(regionB.lat, regionB.lng, regionB.name);
    const forecastA = generateForecast(regionA.lat, regionA.lng, 4);
    const forecastB = generateForecast(regionB.lat, regionB.lng, 4);

    const deltas = {
      forest_loss_pct: round(a.indicators.forest_loss_pct - b.indicators.forest_loss_pct, 1),
      ndvi_change_pct: round(a.indicators.ndvi_change_pct - b.indicators.ndvi_change_pct, 1),
      temp_anomaly_c: round(a.indicators.temp_anomaly_c - b.indicators.temp_anomaly_c, 1),
      pm25: a.indicators.pm25 - b.indicators.pm25,
      risk_score: a.risk.score - b.risk.score,
    };

    return Response.json({
      regionA: a,
      regionB: b,
      forecastA,
      forecastB,
      deltas,
      data_mode: "prototype",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function round(v, d) {
  const p = Math.pow(10, d);
  return Math.round(v * p) / p;
}