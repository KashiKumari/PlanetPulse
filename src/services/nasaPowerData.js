export const NASA_POWER_FIELDS = [
  { code: "T2M", field: "temperature_c", digits: 1, min: -100, max: 70, unit: "°C" },
  { code: "T2M_MAX", field: "temp_max_c", digits: 1, min: -100, max: 80, unit: "°C" },
  { code: "T2M_MIN", field: "temp_min_c", digits: 1, min: -100, max: 70, unit: "°C" },
  {
    code: "PRECTOTCORR",
    field: "precipitation_mm",
    digits: 2,
    min: 0,
    max: 2000,
    unit: "mm/day",
  },
  { code: "RH2M", field: "humidity_pct", digits: 1, min: 0, max: 100, unit: "%" },
  { code: "WS10M", field: "wind_ms", digits: 2, min: 0, max: 150, unit: "m/s" },
  {
    code: "ALLSKY_SFC_SW_DWN",
    field: "solar_rad",
    digits: 2,
    min: 0,
    max: 100,
    unit: "MJ/m²/day",
  },
  { code: "GWETTOP", field: "soil_moisture", digits: 3, min: 0, max: 1, unit: "fraction" },
];

export const NASA_POWER_PARAMETERS = NASA_POWER_FIELDS.map(({ code }) => code).join(",");

function apiMessage(raw) {
  const messages = Array.isArray(raw?.messages)
    ? raw.messages.filter((message) => typeof message === "string" && message.trim())
    : [];
  const errors = Array.isArray(raw?.errors)
    ? raw.errors.map((error) => error?.message || error).filter(Boolean)
    : [];
  return [...messages, ...errors, raw?.message, raw?.error]
    .filter((message) => typeof message === "string" && message.trim())
    .join(" ");
}

function parseDateKey(key, temporal) {
  const pattern = temporal === "daily" ? /^(\d{4})(\d{2})(\d{2})$/ : /^(\d{4})(\d{2})$/;
  const parts = key.match(pattern);
  if (!parts) return null;

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = temporal === "daily" ? Number(parts[3]) : 1;
  if (month < 1 || month > 12) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    date:
      temporal === "daily"
        ? `${parts[1]}-${parts[2]}-${parts[3]}`
        : `${parts[1]}-${parts[2]}`,
    year,
    month,
    ...(temporal === "daily" ? { day } : {}),
  };
}

function parseValue(value, { min, max, digits }) {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number === -999 || number < min || number > max) return null;
  const scale = 10 ** digits;
  return Math.round(number * scale) / scale;
}

export function parseNasaPowerSeries(raw, temporal) {
  if (temporal !== "daily" && temporal !== "monthly") {
    throw new Error(`Unsupported NASA POWER temporal resolution: ${temporal}.`);
  }

  const parameters = raw?.properties?.parameter;
  if (!parameters || typeof parameters !== "object") {
    const detail = apiMessage(raw);
    throw new Error(
      detail || `NASA POWER ${temporal} response did not include properties.parameter.`,
    );
  }

  const rowsByDate = new Map();
  const units = {};
  let foundParameter = false;

  for (const definition of NASA_POWER_FIELDS) {
    const values = parameters[definition.code];
    if (!values || typeof values !== "object") continue;
    foundParameter = true;

    const unit = raw.parameters?.[definition.code]?.units;
    units[definition.field] =
      typeof unit === "string"
        ? unit.replace("m^2", "m²").replace(/^C$/, "°C").replace(/^1$/, "fraction")
        : definition.unit;

    for (const [key, rawValue] of Object.entries(values)) {
      const date = parseDateKey(key, temporal);
      if (!date) continue;

      let row = rowsByDate.get(date.date);
      if (!row) {
        row = { ...date };
        rowsByDate.set(date.date, row);
      }
      row[definition.field] = parseValue(rawValue, definition);
    }
  }

  if (!foundParameter) {
    const detail = apiMessage(raw);
    throw new Error(
      detail || `NASA POWER ${temporal} response contains none of the requested parameters.`,
    );
  }

  const series = [...rowsByDate.values()]
    .filter((row) =>
      NASA_POWER_FIELDS.some((definition) => Number.isFinite(row[definition.field])),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    series,
    units,
    timeStandard: raw.header?.time_standard || null,
    source: raw.header?.sources || [],
  };
}

function normalizeDate(value, label) {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a date in YYYY-MM-DD or YYYYMMDD format.`);
  }
  const match = value.match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  if (!match) throw new Error(`${label} must be a date in YYYY-MM-DD or YYYYMMDD format.`);

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() + 1 !== Number(match[2]) ||
    date.getUTCDate() !== Number(match[3])
  ) {
    throw new Error(`${label} is not a valid calendar date.`);
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function compactDate(date) {
  return date.replaceAll("-", "");
}

export function getNasaPowerDailyRange({
  startDate,
  endDate,
  now = new Date(),
  lookbackDays = 45,
} = {}) {
  if (!Number.isInteger(lookbackDays) || lookbackDays < 1) {
    throw new Error("NASA POWER lookbackDays must be a positive integer.");
  }

  const yesterday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
  );
  const defaultEnd = yesterday.toISOString().slice(0, 10);
  const end = normalizeDate(endDate || defaultEnd, "NASA POWER endDate");
  const defaultStartDate = new Date(yesterday);
  defaultStartDate.setUTCDate(defaultStartDate.getUTCDate() - lookbackDays + 1);
  const start = normalizeDate(
    startDate || defaultStartDate.toISOString().slice(0, 10),
    "NASA POWER startDate",
  );

  if (start < "1981-01-01") {
    throw new Error("NASA POWER daily meteorological data starts on 1981-01-01.");
  }
  if (start > end) throw new Error("NASA POWER startDate must be on or before endDate.");
  if (end > defaultEnd) {
    throw new Error(`NASA POWER endDate must be on or before ${defaultEnd}; today's data is incomplete.`);
  }

  return { startDate: compactDate(start), endDate: compactDate(end) };
}

export function getLatestValidByField(dailySeries, monthlySeries) {
  const observationDates = {};
  const observationResolution = {};
  const metricStatus = {};
  const current = {};

  for (const { field } of NASA_POWER_FIELDS) {
    const daily = [...dailySeries].reverse().find((row) => Number.isFinite(row[field]));
    const monthly = [...monthlySeries].reverse().find((row) => Number.isFinite(row[field]));
    const observation = daily || monthly;

    current[field] = observation?.[field] ?? null;
    observationDates[field] = observation?.date ?? null;
    observationResolution[field] = daily ? "daily" : monthly ? "monthly" : null;
    metricStatus[field] = observation
      ? { status: "available", reason: null }
      : {
          status: "unavailable",
          reason: "NASA POWER returned no valid observation for this parameter in the requested periods.",
        };
  }

  const latestDate = Object.values(observationDates).filter(Boolean).sort().at(-1) || null;
  const dateParts = latestDate?.split("-").map(Number);
  return {
    current: {
      ...current,
      date: latestDate,
      ...(dateParts
        ? { year: dateParts[0], month: dateParts[1], ...(dateParts[2] ? { day: dateParts[2] } : {}) }
        : {}),
    },
    observationDates,
    observationResolution,
    metricStatus,
    latestDate,
  };
}

export function getNasaPowerApiError(responseBody, status) {
  const message = apiMessage(responseBody);
  return message
    ? `NASA POWER API returned HTTP ${status}: ${message}`
    : `NASA POWER API returned HTTP ${status}.`;
}
