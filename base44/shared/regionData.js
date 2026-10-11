// Planet Pulse shared data layer (server-side).
// Generates deterministic prototype environmental data from lat/lng.
// Clearly labeled as PROTOTYPE — real data sources arrive in Phase 6.

function hashSeed(lat, lng) {
  return Math.abs(Math.round((lat + 90) * 1000 + (lng + 180)));
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(v, d) {
  const p = Math.pow(10, d);
  return Math.round(v * p) / p;
}

export function generateIndicators(lat, lng) {
  const rand = mulberry32(hashSeed(lat, lng));
  const tropicalness = Math.max(0, 1 - Math.abs(lat) / 90);
  const aridity = Math.max(0, (Math.abs(lat) - 10) / 60);

  const forestCover = 25 + tropicalness * 65 + rand() * 8;
  const forestLoss = rand() * 28 * Math.max(tropicalness, 0.3);
  const ndvi = 0.15 + tropicalness * 0.65 + rand() * 0.08;
  const ndviChange = -(rand() * 16 * Math.max(tropicalness, 0.2));
  const tempAnomaly = 0.3 + rand() * 2.8 + aridity * 0.5;
  const pm25 = 5 + rand() * 90 * (1 - tropicalness * 0.3);
  const carbonBiomass = 30 + tropicalness * 220 + rand() * 40;

  return {
    forest_cover_pct: round(forestCover, 1),
    forest_loss_pct: round(forestLoss, 1),
    ndvi: round(ndvi, 3),
    ndvi_change_pct: round(ndviChange, 1),
    temp_anomaly_c: round(tempAnomaly, 1),
    pm25: Math.round(pm25),
    carbon_biomass_mgha: Math.round(carbonBiomass),
  };
}

export function generateHistory(lat, lng) {
  const rand = mulberry32(hashSeed(lat, lng) + 1);
  const current = generateIndicators(lat, lng);
  const startForest = current.forest_cover_pct + current.forest_loss_pct;
  const startNdvi = current.ndvi + Math.abs(current.ndvi_change_pct / 100);
  const years = [];

  for (let year = 2006; year <= 2026; year++) {
    const t = (year - 2006) / 20;
    const noise = () => (rand() - 0.5) * 2;
    years.push({
      year,
      forest_cover_pct: round(startForest - current.forest_loss_pct * t + noise(), 1),
      ndvi: round(startNdvi - Math.abs(current.ndvi_change_pct / 100) * t + (rand() - 0.5) * 0.03, 3),
      temp_anomaly_c: round(current.temp_anomaly_c * (0.4 + t * 0.6) + (rand() - 0.5) * 0.3, 1),
      pm25: Math.round(current.pm25 * (0.85 + t * 0.3) + (rand() - 0.5) * 8),
    });
  }
  return years;
}

function linearRegression(points) {
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;
  const predicted = (x) => intercept + slope * x;
  const meanY = sumY / n;
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0) || 1;
  const ssRes = points.reduce((s, p) => s + Math.pow(p.y - predicted(p.x), 2), 0);
  const r2 = 1 - ssRes / ssTot;
  const mae = points.reduce((s, p) => s + Math.abs(p.y - predicted(p.x)), 0) / n;
  const rmse = Math.sqrt(ssRes / n);
  const residualStd = Math.sqrt(ssRes / Math.max(n - 2, 1));
  return { slope, intercept, r2, mae, rmse, residualStd, predict: predicted };
}

export function generateForecast(lat, lng, horizon = 4) {
  const history = generateHistory(lat, lng);
  const forestPts = history.map((h) => ({ x: h.year, y: h.forest_cover_pct }));
  const ndviPts = history.map((h) => ({ x: h.year, y: h.ndvi }));
  const tempPts = history.map((h) => ({ x: h.year, y: h.temp_anomaly_c }));

  const forestReg = linearRegression(forestPts);
  const ndviReg = linearRegression(ndviPts);
  const tempReg = linearRegression(tempPts);

  const lastYear = 2026;
  const forecast = [];

  for (let year = lastYear + 1; year <= lastYear + horizon; year++) {
    const fForest = Math.max(0, forestReg.predict(year));
    const fNdvi = Math.max(0, ndviReg.predict(year));
    const fTemp = tempReg.predict(year);
    forecast.push({
      year,
      forest_cover_pct: round(fForest, 1),
      forest_cover_lower: round(Math.max(0, fForest - 1.96 * forestReg.residualStd), 1),
      forest_cover_upper: round(fForest + 1.96 * forestReg.residualStd, 1),
      ndvi: round(fNdvi, 3),
      temp_anomaly_c: round(fTemp, 1),
    });
  }

  return {
    forecast,
    model: {
      name: "Linear Trend Regression (Prototype)",
      description: "Univariate linear regression per indicator on the 2005–2026 historical series.",
      metrics: {
        forest_cover: {
          mae: round(forestReg.mae, 2),
          rmse: round(forestReg.rmse, 2),
          r2: round(forestReg.r2, 3),
        },
        ndvi: { r2: round(ndviReg.r2, 3) },
        temperature: { r2: round(tempReg.r2, 3) },
      },
      slope_forest_cover_per_year: round(forestReg.slope, 3),
      confidence: "95% interval from historical residual standard deviation.",
      disclaimer: "Prototype trend forecast — not a guaranteed future outcome.",
    },
  };
}