import { allRegions } from "../../src/data/allRegions.js";
import { getCurrentAirQuality } from "../../src/services/airQualityApi.js";
import { getNasaNdviDate } from "../../src/services/nasaGibs.js";
import { api } from "../../src/services/planetPulseApi.js";
import { computeGreeneryStats } from "../../src/utils/greeneryCalculations.js";

const SOURCE_INFO = {
  climate:
    "NASA POWER daily/monthly point estimates: measured variables are gridded estimates, not country-wide averages. Source: https://power.larc.nasa.gov",
  air:
    "Open-Meteo Air Quality API (CAMS atmospheric composition model); modeled air-quality values, not monitoring-station measurements. Source: https://open-meteo.com/en/docs/air-quality-api",
  greenery:
    "Planet Pulse generated prototype history for forest cover and NDVI; not satellite-derived measurements. NASA GIBS supplies MODIS NDVI raster imagery and composite dates, not numeric regional NDVI values.",
  forecast:
    "Planet Pulse linear-regression prototype forecast based on generated 2005–2026 history; not a validated prediction.",
  risk:
    "Planet Pulse prototype composite score derived from generated forest-loss, NDVI-change, temperature-anomaly, and PM2.5 estimates; not an officially validated index.",
};

const INDICATOR_SOURCES = {
  temperature_c: SOURCE_INFO.climate,
  precipitation_mm: SOURCE_INFO.climate,
  humidity_pct: SOURCE_INFO.climate,
  wind_ms: SOURCE_INFO.climate,
  solar_rad: SOURCE_INFO.climate,
  soil_moisture: SOURCE_INFO.climate,
  pm25: SOURCE_INFO.air,
  ndvi: SOURCE_INFO.greenery,
  forest_cover_pct: SOURCE_INFO.greenery,
  forest_loss_pct: SOURCE_INFO.greenery,
  risk: SOURCE_INFO.risk,
  forecast: SOURCE_INFO.forecast,
};

export function validateCoordinates(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("A valid region with latitude and longitude is required.");
  }
  return { lat: latitude, lng: longitude };
}

function cleanName(value) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120)
    : "";
}

export function resolveRegion(requestedName, selectedRegion, selectedRegions = []) {
  const name = cleanName(requestedName);
  const selectedName = cleanName(selectedRegion?.name);
  const contextualRegions = [selectedRegion, ...selectedRegions].filter(Boolean);
  const target = !name || /^(current|selected|this region)$/i.test(name)
    ? selectedName
    : name;

  const contextualMatch = contextualRegions.find(
    (region) => cleanName(region.name).toLowerCase() === target.toLowerCase(),
  );
  if (target && contextualMatch) {
    return {
      ...validateCoordinates(contextualMatch.lat, contextualMatch.lng),
      name: cleanName(contextualMatch.name) || "Selected region",
    };
  }

  const match = allRegions.find((region) => region.name.toLowerCase() === target.toLowerCase());
  if (match) {
    return {
      ...validateCoordinates(match.lat, match.lng),
      name: match.name,
    };
  }

  if (!target && selectedRegion) {
    return {
      ...validateCoordinates(selectedRegion.lat, selectedRegion.lng),
      name: selectedName || "Selected region",
    };
  }
  throw new Error(`Region "${target || "selected region"}" is not available in Planet Pulse.`);
}

function validateYearRange(startYear, endYear) {
  const currentYear = new Date().getUTCFullYear();
  if (
    !Number.isInteger(startYear) ||
    !Number.isInteger(endYear) ||
    startYear < 2005 ||
    endYear > currentYear ||
    startYear > endYear
  ) {
    throw new Error(`Choose a year range from 2005 through ${currentYear}, in chronological order.`);
  }
  return { startYear, endYear };
}

function selectedHistory(history, startYear, endYear) {
  return history.filter((item) => item.year >= startYear && item.year <= endYear);
}

function regionHistory(region) {
  return api.regionHistory(region).then((result) => result.data);
}

function regionInfo(region) {
  return api.regionInfo(region).then((result) => result.data);
}

function dataUnavailable(reason) {
  return { status: "unavailable", reason };
}

export async function executeEcoTool(
  name,
  args = {},
  selectedRegion,
  signal,
  selectedRegions = [],
  timePeriod = null,
) {
  const resolve = (requestedName) =>
    resolveRegion(requestedName, selectedRegion, selectedRegions);
  const resolveYearRange = () => {
    const startYear = args.start_year ?? timePeriod?.start_year ?? 2006;
    const endYear = args.end_year ?? timePeriod?.end_year ?? 2026;
    return validateYearRange(startYear, endYear);
  };
  try {
    switch (name) {
      case "get_current_environment": {
        const region = resolve(args.region);
        const results = await Promise.allSettled([
          api.nasaPower({ ...region, signal }),
          getCurrentAirQuality({ lat: region.lat, lng: region.lng, signal }),
          regionInfo(region),
        ]);
        const [climate, air, prototype] = results;
        if (climate.status === "rejected" && air.status === "rejected" && prototype.status === "rejected") {
          return dataUnavailable("Climate, air-quality, and prototype regional data requests all failed.");
        }
        return {
          status:
            climate.status === "fulfilled" &&
            air.status === "fulfilled" &&
            prototype.status === "fulfilled"
              ? "available"
              : "partial",
          region,
          climate:
            climate.status === "fulfilled"
              ? {
                  region: climate.value.data.region,
                  source: climate.value.data.source,
                  source_url: climate.value.data.source_url,
                  latest_date: climate.value.data.latest_date,
                  current: climate.value.data.current,
                  observation_dates: climate.value.data.observation_dates,
                  observation_resolution: climate.value.data.observation_resolution,
                  metric_status: climate.value.data.metric_status,
                  data_status: climate.value.data.data_status,
                  units: climate.value.data.units,
                  time_standard: climate.value.data.time_standard,
                  requested_daily_period: climate.value.data.requested_daily_period,
                  disclaimer: climate.value.data.disclaimer,
                }
              : dataUnavailable(climate.reason.message || "NASA POWER request failed."),
          air_quality:
            air.status === "fulfilled"
              ? air.value
              : dataUnavailable(air.reason.message || "Air-quality request failed."),
          prototype_indicators:
            prototype.status === "fulfilled"
              ? {
                  indicators: prototype.value.indicators,
                  risk: prototype.value.risk,
                  source: "Generated Planet Pulse prototype estimates",
                  disclaimer: prototype.value.disclaimer,
                }
              : dataUnavailable(prototype.reason.message || "Prototype regional data failed."),
        };
      }

      case "get_environmental_history": {
        const region = resolve(args.region);
        const { startYear, endYear } = resolveYearRange();
        const result = await regionHistory(region);
        return {
          status: "available",
          region,
          period: { start_year: startYear, end_year: endYear },
          source: result.disclaimer,
          data_mode: result.data_mode,
          history: selectedHistory(result.history, startYear, endYear),
        };
      }

      case "get_greenery_comparison": {
        const region = resolve(args.region);
        const { startYear, endYear } = resolveYearRange();
        const result = await regionHistory(region);
        const selected = selectedHistory(result.history, startYear, endYear);
        const statistics = computeGreeneryStats(selected, startYear, endYear);
        if (!statistics || statistics.firstYear !== startYear || statistics.lastYear !== endYear) {
          return dataUnavailable(`The prototype history does not contain both ${startYear} and ${endYear}.`);
        }
        const composites = await Promise.all([startYear, endYear].map(async (year) => {
          try {
            return { year, composite_date: await getNasaNdviDate(year, signal) };
          } catch (error) {
            return { year, status: "unavailable", reason: error.message };
          }
        }));
        return {
          status: "available",
          region,
          period: { start_year: startYear, end_year: endYear },
          comparison_statistics: statistics,
          statistic_source: result.disclaimer,
          map_composite_dates: composites,
          imagery_note:
            "NASA GIBS supplies the dated NDVI raster imagery; numeric greenery/NDVI comparison statistics above are generated prototype history, not measurements extracted from those tiles.",
        };
      }

      case "get_ndvi_history": {
        const region = resolve(args.region);
        const { startYear, endYear } = resolveYearRange();
        const result = await regionHistory(region);
        return {
          status: "available",
          region,
          period: { start_year: startYear, end_year: endYear },
          source: "Generated Planet Pulse prototype NDVI history; not satellite-derived measurements.",
          ndvi_history: selectedHistory(result.history, startYear, endYear).map(({ year, ndvi }) => ({
            year,
            ndvi,
          })),
          satellite_imagery_limitation:
            "The app uses NASA MODIS NDVI raster tiles and publishes composite dates, but does not currently extract numeric regional NDVI values from the raster.",
        };
      }

      case "get_forecast": {
        const region = resolve(args.region);
        const horizon = args.forecast_horizon ?? 4;
        if (!Number.isInteger(horizon) || horizon < 1 || horizon > 10) {
          throw new Error("Forecast horizon must be an integer from 1 through 10.");
        }
        const result = await api.predict({ ...region, horizon });
        return {
          status: "available",
          ...result.data,
          source: "Generated prototype history and linear regression",
        };
      }

      case "compare_regions": {
        if (!cleanName(args.region_a) || !cleanName(args.region_b)) {
          throw new Error("Both region_a and region_b are required for a regional comparison.");
        }
        const regionA = resolve(args.region_a);
        const regionB = resolve(args.region_b);
        const currentResults = await Promise.allSettled([
          api.compare({ regionA, regionB }),
          api.nasaPower(regionA),
          api.nasaPower(regionB),
          api.regionHistory(regionA),
          api.regionHistory(regionB),
        ]);
        const [comparison, climateA, climateB, historyA, historyB] = currentResults;
        if (comparison.status === "rejected") {
          return dataUnavailable(comparison.reason.message || "Regional comparison failed.");
        }
        const startYear = args.start_year;
        const endYear = args.end_year;
        const period =
          startYear == null && endYear == null
            ? null
            : validateYearRange(startYear, endYear);
        const series = (result) =>
          result.status === "fulfilled"
            ? period
              ? selectedHistory(result.value.data.history, period.startYear, period.endYear)
              : undefined
            : dataUnavailable(result.reason.message || "Prototype history is unavailable.");
        const compactClimate = (result) =>
          result.status === "fulfilled"
            ? {
                status: "available",
                source: result.value.data.source,
                source_url: result.value.data.source_url,
                latest_date: result.value.data.latest_date,
                current: result.value.data.current,
                observation_dates: result.value.data.observation_dates,
                units: result.value.data.units,
              }
            : dataUnavailable(result.reason.message || "NASA POWER request failed.");
        return {
          status: "available",
          ...comparison.value.data,
          regionA: {
            ...comparison.value.data.regionA,
            climate: compactClimate(climateA),
            ...(period ? { history: series(historyA) } : { history: undefined }),
          },
          regionB: {
            ...comparison.value.data.regionB,
            climate: compactClimate(climateB),
            ...(period ? { history: series(historyB) } : { history: undefined }),
          },
          ...(period ? { period } : {}),
          source: "Generated Planet Pulse prototype estimates; not observed regional measurements.",
        };
      }

      case "get_environmental_risk": {
        const region = resolve(args.region);
        const result = await regionInfo(region);
        return {
          status: "available",
          region,
          risk: result.risk,
          inputs: result.indicators,
          source: "Generated prototype inputs and Planet Pulse risk-engine calculation",
          disclaimer: result.risk.disclaimer,
        };
      }

      case "get_data_sources": {
        const region = args.region ? resolve(args.region) : null;
        const indicator = cleanName(args.indicator).toLowerCase();
        const source = indicator
          ? INDICATOR_SOURCES[indicator] ||
            INDICATOR_SOURCES[indicator.replaceAll(" ", "_")]
          : null;
        return {
          status: indicator && !source ? "unavailable" : "available",
          region,
          indicator: indicator || null,
          sources: source ? { [indicator]: source } : SOURCE_INFO,
          ...(indicator && !source ? { reason: `No configured Planet Pulse source for "${indicator}".` } : {}),
        };
      }

      default:
        return dataUnavailable("This data tool is not enabled.");
    }
  } catch (error) {
    return dataUnavailable(error.message || "The requested Planet Pulse data is unavailable.");
  }
}

export const ECO_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_current_environment",
      description: "Retrieve latest NASA POWER climate, modeled air quality, and labeled prototype regional indicators.",
      parameters: { type: "object", properties: { region: { type: "string" } }, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_environmental_history",
      description: "Retrieve year-by-year Planet Pulse environmental history, explicitly labeled as prototype data.",
      parameters: {
        type: "object",
        properties: {
          region: { type: "string" },
          start_year: { type: "integer" },
          end_year: { type: "integer" },
        },
        required: ["start_year", "end_year"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_greenery_comparison",
      description: "Compare prototype greenery history and retrieve real NASA GIBS composite dates for the selected years.",
      parameters: {
        type: "object",
        properties: {
          region: { type: "string" },
          start_year: { type: "integer" },
          end_year: { type: "integer" },
        },
        required: ["start_year", "end_year"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_ndvi_history",
      description: "Retrieve labeled prototype NDVI history; this app does not derive numeric regional NDVI from NASA raster tiles.",
      parameters: {
        type: "object",
        properties: {
          region: { type: "string" },
          start_year: { type: "integer" },
          end_year: { type: "integer" },
        },
        required: ["start_year", "end_year"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_forecast",
      description: "Retrieve the app's explicitly labeled prototype linear-trend forecast.",
      parameters: {
        type: "object",
        properties: {
          region: { type: "string" },
          forecast_horizon: { type: "integer" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_regions",
      description: "Compare two listed regions using labeled Planet Pulse prototype indicators and risk calculations.",
      parameters: {
        type: "object",
        properties: {
          region_a: { type: "string" },
          region_b: { type: "string" },
          start_year: { type: "integer" },
          end_year: { type: "integer" },
        },
        required: ["region_a", "region_b"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_environmental_risk",
      description: "Retrieve the prototype risk score, contributing inputs, weights, and limitations.",
      parameters: { type: "object", properties: { region: { type: "string" } }, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_data_sources",
      description: "Explain configured data sources, units, provenance, and limitations.",
      parameters: {
        type: "object",
        properties: {
          region: { type: "string" },
          indicator: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
];
