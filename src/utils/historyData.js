const requiredMetrics = ["forest_cover_pct", "ndvi", "temp_anomaly_c"];

export function parseHistoryResponse(response) {
  const history = response?.data?.history;

  if (!Array.isArray(history)) {
    throw new Error("Historical data response did not contain a history list.");
  }

  if (
    history.some(
      (record) =>
        !record ||
        !Number.isInteger(record.year) ||
        requiredMetrics.some((metric) => !Number.isFinite(record[metric])),
    )
  ) {
    throw new Error("Historical data response contains invalid records.");
  }

  return history;
}

export async function requestHistory(regionHistory, region) {
  return parseHistoryResponse(await regionHistory(region));
}

export function getHistorySnapshot(history, selectedYear) {
  const current = history.find((record) => record.year === selectedYear);
  const baseline = history.find((record) => record.year === 2005);

  const deltas =
    current && baseline
      ? {
          forest_cover_pct: current.forest_cover_pct - baseline.forest_cover_pct,
          ndvi: current.ndvi - baseline.ndvi,
          temp_anomaly_c: current.temp_anomaly_c - baseline.temp_anomaly_c,
        }
      : null;

  return { current, deltas };
}
