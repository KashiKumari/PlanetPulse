export const YEAR_RANGE = Array.from({ length: 21 }, (_, i) => 2006 + i);

export function getGreeneryColor(pct) {
  if (pct >= 75) return "#16a34a";
  if (pct >= 55) return "#65a30d";
  if (pct >= 35) return "#ca8a04";
  if (pct >= 20) return "#ea580c";
  return "#dc2626";
}

export function getChangeColor(change) {
  if (change >= 0) return "#16a34a";
  if (change >= -1) return "#facc15";
  if (change >= -2) return "#f97316";
  return "#dc2626";
}

export function getNdviColor(ndvi) {
  if (ndvi >= 0.7) return "#16a34a";
  if (ndvi >= 0.5) return "#65a30d";
  if (ndvi >= 0.3) return "#ca8a04";
  if (ndvi >= 0.1) return "#ea580c";
  return "#dc2626";
}

export function getGreeneryForYear(history, year) {
  return history?.find((h) => h.year === year)?.forest_cover_pct;
}

export function getNdviForYear(history, year) {
  return history?.find((h) => h.year === year)?.ndvi;
}

export function getChronologicalYears(yearA, yearB) {
  return yearA <= yearB ? [yearA, yearB] : [yearB, yearA];
}

export function computeGreeneryStats(history, startYear, endYear) {
  if (!history || history.length === 0) return null;
  const first = history.find((h) => h.year === startYear) || history[0];
  const last = history.find((h) => h.year === endYear) || history[history.length - 1];
  const totalChange = last.forest_cover_pct - first.forest_cover_pct;
  const totalChangePct = first.forest_cover_pct !== 0 ? (totalChange / first.forest_cover_pct) * 100 : 0;
  const yearSpan = last.year - first.year;
  const avgAnnualChange = yearSpan > 0 ? totalChangePct / yearSpan : 0;

  let highestLoss = { year: null, change: 0 };
  let lowestLoss = { year: null, change: Infinity };
  for (let i = 1; i < history.length; i++) {
    const change = history[i].forest_cover_pct - history[i - 1].forest_cover_pct;
    if (change < highestLoss.change) highestLoss = { year: history[i].year, change };
    if (change < 0 && change < lowestLoss.change) lowestLoss = { year: history[i].year, change };
  }
  if (lowestLoss.change === Infinity) lowestLoss = { year: null, change: 0 };

  const ndviChange = last.ndvi - first.ndvi;
  const ndviChangePct = first.ndvi !== 0 ? (ndviChange / first.ndvi) * 100 : 0;
  const trend = totalChange < -2 ? "Declining" : totalChange > 2 ? "Improving" : "Stable";

  return {
    firstYear: first.year,
    lastYear: last.year,
    firstGreenery: first.forest_cover_pct,
    lastGreenery: last.forest_cover_pct,
    totalChange,
    totalChangePct,
    avgAnnualChange,
    highestLossYear: highestLoss.year,
    lowestLossYear: lowestLoss.year,
    firstNdvi: first.ndvi,
    lastNdvi: last.ndvi,
    ndviChange,
    ndviChangePct,
    trend,
  };
}

export function getYearlyChanges(history) {
  if (!history || history.length === 0) return [];
  return history.map((h, i) => {
    const prev = i > 0 ? history[i - 1] : null;
    const yearlyChange = prev ? h.forest_cover_pct - prev.forest_cover_pct : null;
    const cumulativeChange = h.forest_cover_pct - history[0].forest_cover_pct;
    const cumulativeChangePct =
      history[0].forest_cover_pct !== 0 ? (cumulativeChange / history[0].forest_cover_pct) * 100 : 0;
    return {
      year: h.year,
      greenery: h.forest_cover_pct,
      ndvi: h.ndvi,
      yearlyChange,
      cumulativeChange,
      cumulativeChangePct,
    };
  });
}