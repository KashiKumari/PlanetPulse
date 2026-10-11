import {
  generateForecast,
  generateHistory,
  generateIndicators,
} from "../../base44/shared/regionData.js";
import { calculateRisk } from "../../base44/shared/riskEngine.js";
import {
  getLatestValidByField,
  getNasaPowerApiError,
  getNasaPowerDailyRange,
  NASA_POWER_FIELDS,
  NASA_POWER_PARAMETERS,
  parseNasaPowerSeries,
} from "./nasaPowerData.js";

function response(data) {
  return Promise.resolve({ data });
}

export function requireCoordinates(lat, lng) {
  const latitude = typeof lat === "string" && !lat.trim() ? NaN : Number(lat);
  const longitude = typeof lng === "string" && !lng.trim() ? NaN : Number(lng);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Valid latitude and longitude are required.");
  }
  return { lat: latitude, lng: longitude };
}

function regionInfo({ lat, lng, name, id }) {
  requireCoordinates(lat, lng);
  const indicators = generateIndicators(Number(lat), Number(lng));
  const history = generateHistory(Number(lat), Number(lng));
  return {
    region: { name: name || "Unnamed Region", id: id || null, lat: Number(lat), lng: Number(lng) },
    indicators,
    risk: calculateRisk(indicators),
    history_summary: {
      start_year: 2005,
      end_year: 2026,
      data_points: history.length,
    },
    data_mode: "prototype",
    disclaimer:
      "Prototype data — most environmental indicators are generated estimates, not satellite observations.",
  };
}

async function requestNasaPower(url, signal) {
  const result = await fetch(url, { signal: signal || AbortSignal.timeout(30000) });
  const body = await result.text();
  let raw;

  try {
    raw = JSON.parse(body);
  } catch {
    if (!result.ok) {
      throw new Error(`NASA POWER API returned HTTP ${result.status}: ${body.slice(0, 300)}`);
    }
    throw new Error("NASA POWER returned a non-JSON response.");
  }

  if (!result.ok) throw new Error(getNasaPowerApiError(raw, result.status));
  return raw;
}

function makeNasaPowerUrl(temporal, { lat, lng, start, end }) {
  const url = new URL(`https://power.larc.nasa.gov/api/temporal/${temporal}/point`);
  url.search = new URLSearchParams({
    parameters: NASA_POWER_PARAMETERS,
    community: "AG",
    longitude: String(lng),
    latitude: String(lat),
    start,
    end,
    format: "JSON",
  }).toString();
  return url;
}

/**
 * @param {{lat: number|string, lng: number|string, signal?: AbortSignal, startDate?: string, endDate?: string, monthlyStartYear?: number, monthlyEndYear?: number}} options
 */
async function nasaPower({
  lat,
  lng,
  signal,
  startDate,
  endDate,
  monthlyStartYear = 2005,
  monthlyEndYear = new Date().getUTCFullYear(),
}) {
  const coordinates = requireCoordinates(lat, lng);
  if (
    !Number.isInteger(monthlyStartYear) ||
    !Number.isInteger(monthlyEndYear) ||
    monthlyStartYear < 1981 ||
    monthlyEndYear > new Date().getUTCFullYear() ||
    monthlyStartYear > monthlyEndYear
  ) {
    throw new Error("NASA POWER monthly years must be supported integer years in chronological order.");
  }

  const today = new Date();
  const dailyRange = getNasaPowerDailyRange({ startDate, endDate, now: today });
  const requests = await Promise.allSettled([
    requestNasaPower(
      makeNasaPowerUrl("daily", {
        ...coordinates,
        start: dailyRange.startDate,
        end: dailyRange.endDate,
      }),
      signal,
    ),
    requestNasaPower(
      makeNasaPowerUrl("monthly", {
        ...coordinates,
        start: String(monthlyStartYear),
        end: String(monthlyEndYear),
      }),
      signal,
    ),
  ]);

  let dailyError =
    requests[0].status === "rejected" ? requests[0].reason.message || "Daily request failed." : null;
  let monthlyError =
    requests[1].status === "rejected"
      ? requests[1].reason.message || "Monthly request failed."
      : null;
  let daily = { series: [], units: {}, timeStandard: null, source: [] };
  let monthly = { series: [], units: {}, timeStandard: null, source: [] };

  if (requests[0].status === "fulfilled") {
    try {
      daily = parseNasaPowerSeries(requests[0].value, "daily");
    } catch (error) {
      dailyError = error.message;
    }
  }
  if (requests[1].status === "fulfilled") {
    try {
      monthly = parseNasaPowerSeries(requests[1].value, "monthly");
    } catch (error) {
      monthlyError = error.message;
    }
  }

  const latest = getLatestValidByField(daily.series, monthly.series);
  const availableFields = NASA_POWER_FIELDS.filter((field) =>
    Number.isFinite(latest.current[field.field]),
  );
  if (!availableFields.length) {
    throw new Error(
      [
        "NASA POWER returned no valid observations for this location.",
        dailyError && `Daily data: ${dailyError}`,
        monthlyError && `Monthly data: ${monthlyError}`,
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  const latestMonthlyTemperature = [...monthly.series]
    .reverse()
    .find((point) => Number.isFinite(point.temperature_c));
  const baselineTemperatures = latestMonthlyTemperature
    ? monthly.series
        .filter(
          (point) =>
            point.month === latestMonthlyTemperature.month &&
            point.year < latestMonthlyTemperature.year,
        )
    .map((point) => point.temperature_c)
        .filter(Number.isFinite)
    : [];
  const baselineTemperature = baselineTemperatures.length
    ? baselineTemperatures.reduce((sum, value) => sum + value, 0) /
      baselineTemperatures.length
    : null;
  const resolutions = Object.values(latest.observationResolution);
  const unavailableMetrics = Object.values(latest.metricStatus).some(
    (metric) => metric.status === "unavailable",
  );
  const mixedGranularity = resolutions.includes("monthly");
  const dataStatus =
    unavailableMetrics || mixedGranularity || dailyError || monthlyError ? "partial" : "available";
  const units = { ...monthly.units, ...daily.units };
  const monthlySeries = monthly.series;

  return response({
    region: coordinates,
    source: "NASA POWER",
    source_url: "https://power.larc.nasa.gov",
    latest_period: latest.latestDate,
    latest_date: latest.latestDate,
    current: latest.current,
    observation_dates: latest.observationDates,
    observation_resolution: latest.observationResolution,
    metric_status: latest.metricStatus,
    data_status: dataStatus,
    data_errors: { daily: dailyError, monthly: monthlyError },
    units,
    time_standard: daily.timeStandard || monthly.timeStandard,
    requested_daily_period: dailyRange,
    temp_anomaly_c:
      latestMonthlyTemperature && baselineTemperature != null
        ? Number((latestMonthlyTemperature.temperature_c - baselineTemperature).toFixed(2))
        : null,
    temp_anomaly_period: latestMonthlyTemperature?.date || null,
    daily_series: daily.series,
    monthly_series: monthlySeries,
    series: monthlySeries.slice(-12),
    data_mode: "live",
    disclaimer:
      "NASA POWER meteorological measurements are gridded estimates. They do not provide NDVI, forest cover, PM2.5, or biomass.",
  });
}

function buildRegion(lat, lng, name) {
  const indicators = generateIndicators(Number(lat), Number(lng));
  return {
    name: name || "Unnamed Region",
    lat: Number(lat),
    lng: Number(lng),
    indicators,
    history: generateHistory(Number(lat), Number(lng)),
    risk: calculateRisk(indicators),
  };
}

function roundedDifference(a, b, places = 1) {
  const factor = 10 ** places;
  return Math.round((a - b) * factor) / factor;
}

function localAnalysis({ lat, lng, name, question }) {
  requireCoordinates(lat, lng);
  const indicators = generateIndicators(Number(lat), Number(lng));
  const risk = calculateRisk(indicators);
  const history = generateHistory(Number(lat), Number(lng));
  const forecast = generateForecast(Number(lat), Number(lng), 4);
  const q = (question || "").toLowerCase();
  const summary =
    `**${name || "This region"} — prototype environmental summary**\n\n` +
    `- Prototype risk score: **${risk.score}/100 (${risk.level})**.\n` +
    `- Forest cover: **${indicators.forest_cover_pct}%**; prototype forest loss: **${indicators.forest_loss_pct}%**.\n` +
    `- NDVI: **${indicators.ndvi}** (${indicators.ndvi_change_pct}% change); temperature anomaly: **${indicators.temp_anomaly_c} °C**.\n` +
    `- PM2.5 estimate: **${indicators.pm25} µg/m³**.\n\n` +
    `These indicators are generated prototype estimates, not observations from satellites or air-quality monitors. The risk score is a prototype composite, not a validated scientific index. NASA POWER climate data is available separately in the dashboard.`;

  let answer = summary;
  if (q.includes("forecast") || q.includes("predict") || q.includes("2030") || q.includes("future")) {
    const last = forecast.forecast.at(-1);
    answer =
      `**Prototype trend forecast for ${name || "this region"}**\n\n` +
      `The linear trend model estimates **${last.forest_cover_pct}% forest cover** and **${last.ndvi} NDVI** in ${last.year}, with a temperature-anomaly trend of **${last.temp_anomaly_c} °C**. ` +
      `${forecast.model.disclaimer}\n\n` +
      `This extrapolates generated prototype history; it is not a real-world prediction.`;
  } else if (q.includes("histor") || q.includes("trend") || q.includes("change")) {
    const first = history[0];
    const last = history.at(-1);
    answer =
      `**Prototype historical trend for ${name || "this region"} (2005–2026)**\n\n` +
      `Forest cover changes from **${first.forest_cover_pct}%** to **${last.forest_cover_pct}%**; NDVI changes from **${first.ndvi}** to **${last.ndvi}**. ` +
      `Temperature anomaly changes from **${first.temp_anomaly_c} °C** to **${last.temp_anomaly_c} °C**.\n\n` +
      `This series is generated prototype data, not measured historical observations.`;
  } else if (q.includes("risk")) {
    answer =
      `**Prototype risk for ${name || "this region"}: ${risk.score}/100 (${risk.level})**\n\n` +
      risk.components
        .map(
          (component) =>
            `- ${component.name}: severity **${component.severity}/100**, weighted contribution **${component.contribution}**.`
        )
        .join("\n") +
      `\n\nThis composite is a prototype index and has not been scientifically validated. Its input values are generated estimates.`;
  }

  return {
    answer,
    context: { region: name || "Unnamed Region", indicators, risk, forecast: forecast.forecast },
    data_mode: "prototype",
  };
}

export const api = {
  health: () =>
    response({
      status: "ok",
      service: "Planet Pulse local API",
      data_mode: "prototype",
      sources: ["NASA POWER", "OpenStreetMap", "Natural Earth"],
    }),

  regionInfo: (params) => response(regionInfo(params)),

  regionHistory: ({ lat, lng, name }) => {
    requireCoordinates(lat, lng);
    return response({
      region: { name: name || "Unnamed Region", lat: Number(lat), lng: Number(lng) },
      history: generateHistory(Number(lat), Number(lng)),
      data_mode: "prototype",
      disclaimer: "Generated prototype historical series, not observed data.",
    });
  },

  regionIndicators: ({ lat, lng, name }) => {
    requireCoordinates(lat, lng);
    return response({
      region: { name: name || "Unnamed Region", lat: Number(lat), lng: Number(lng) },
      indicators: generateIndicators(Number(lat), Number(lng)),
      sources: {
        forest_cover_pct: "Generated prototype estimate",
        forest_loss_pct: "Generated prototype estimate",
        ndvi: "Generated prototype estimate",
        ndvi_change_pct: "Generated prototype estimate",
        temp_anomaly_c: "Generated prototype estimate; use NASA POWER for observed climate data",
        pm25: "Generated prototype estimate",
        carbon_biomass_mgha: "Generated prototype estimate",
      },
      data_mode: "prototype",
    });
  },

  predict: ({ lat, lng, name, horizon }) => {
    requireCoordinates(lat, lng);
    const years = Math.min(Math.max(parseInt(horizon, 10) || 4, 1), 10);
    const result = generateForecast(Number(lat), Number(lng), years);
    return response({
      region: { name: name || "Unnamed Region", lat: Number(lat), lng: Number(lng) },
      forecast: result.forecast,
      model: result.model,
      data_mode: "prototype",
    });
  },

  risk: ({ indicators, lat, lng }) => {
    if (!indicators) {
      requireCoordinates(lat, lng);
      indicators = generateIndicators(Number(lat), Number(lng));
    }
    return response({
      risk: calculateRisk(indicators),
      input_indicators: indicators,
      data_mode: "prototype",
    });
  },

  compare: ({ regionA, regionB }) => {
    if (!regionA || !regionB) {
      throw new Error("Two regions with latitude and longitude are required.");
    }
    requireCoordinates(regionA.lat, regionA.lng);
    requireCoordinates(regionB.lat, regionB.lng);
    const a = buildRegion(regionA.lat, regionA.lng, regionA.name);
    const b = buildRegion(regionB.lat, regionB.lng, regionB.name);
    return response({
      regionA: a,
      regionB: b,
      forecastA: generateForecast(a.lat, a.lng, 4),
      forecastB: generateForecast(b.lat, b.lng, 4),
      deltas: {
        forest_loss_pct: roundedDifference(
          a.indicators.forest_loss_pct,
          b.indicators.forest_loss_pct
        ),
        ndvi_change_pct: roundedDifference(
          a.indicators.ndvi_change_pct,
          b.indicators.ndvi_change_pct
        ),
        temp_anomaly_c: roundedDifference(
          a.indicators.temp_anomaly_c,
          b.indicators.temp_anomaly_c
        ),
        pm25: a.indicators.pm25 - b.indicators.pm25,
        risk_score: a.risk.score - b.risk.score,
      },
      data_mode: "prototype",
    });
  },

  aiAnalysis: (params) => response(localAnalysis(params)),

  nasaPower,
};