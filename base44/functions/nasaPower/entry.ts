// NASA POWER (Prediction Of Worldwide Energy Resources) integration.
// Free public satellite-derived climate API — no API key required.
// Provides real temperature, precipitation, humidity, wind, solar radiation, soil moisture.

const NASA_POWER_BASE = "https://power.larc.nasa.gov/api/temporal/monthly/point";

function round(v, d) {
  if (v == null || v === -999 || isNaN(v)) return null;
  const p = Math.pow(10, d);
  return Math.round(v * p) / p;
}

export default async function (req) {
  try {
    const body = await req.json();
    const { lat, lng } = body;
    if (lat == null || lng == null) {
      return Response.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const params =
      "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS10M,ALLSKY_SFC_SW_DWN,GWETTOP";
    const url = `${NASA_POWER_BASE}?parameters=${params}&community=AG&longitude=${lng}&latitude=${lat}&start=2005&end=2026&format=JSON`;

    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      return Response.json(
        { error: `NASA POWER API returned ${response.status}` },
        { status: 502 }
      );
    }

    const raw = await response.json();
    const paramData = raw?.properties?.parameter;
    if (!paramData || !paramData.T2M) {
      return Response.json(
        { error: "Unexpected NASA POWER response format" },
        { status: 502 }
      );
    }

    // Build monthly time series from the raw parameter objects
    const t2m = paramData.T2M;
    const keys = Object.keys(t2m).sort();
    const series = [];

    for (const key of keys) {
      const year = parseInt(key.substring(0, 4));
      const month = parseInt(key.substring(4, 6));
      if (month < 1 || month > 12) continue; // skip annual aggregates

      series.push({
        year,
        month,
        temperature_c: round(t2m[key], 1),
        temp_max_c: round(paramData.T2M_MAX?.[key], 1),
        temp_min_c: round(paramData.T2M_MIN?.[key], 1),
        precipitation_mm: round(paramData.PRECTOTCORR?.[key], 1),
        humidity_pct: round(paramData.RH2M?.[key], 0),
        wind_ms: round(paramData.WS10M?.[key], 1),
        solar_rad: round(paramData.ALLSKY_SFC_SW_DWN?.[key], 1),
        soil_moisture: round(paramData.GWETTOP?.[key], 3),
      });
    }

    if (series.length === 0) {
      return Response.json(
        { error: "No data returned for these coordinates" },
        { status: 404 }
      );
    }

    // Annual averages for the most recent year with data
    const years = [...new Set(series.map((s) => s.year))];
    const latestYear = Math.max(...years);
    const latestData = series.filter((s) => s.year === latestYear);
    const avg = (arr, field) =>
      arr.reduce((sum, v) => sum + (v[field] ?? 0), 0) / arr.length;

    const current = {
      year: latestYear,
      temperature_c: round(avg(latestData, "temperature_c"), 1),
      temp_max_c: round(avg(latestData, "temp_max_c"), 1),
      temp_min_c: round(avg(latestData, "temp_min_c"), 1),
      precipitation_mm: round(avg(latestData, "precipitation_mm"), 1),
      humidity_pct: round(avg(latestData, "humidity_pct"), 0),
      wind_ms: round(avg(latestData, "wind_ms"), 1),
      solar_rad: round(avg(latestData, "solar_rad"), 1),
      soil_moisture: round(avg(latestData, "soil_moisture"), 3),
    };

    // Temperature anomaly: latest year vs 2005 baseline
    const baselineData = series.filter((s) => s.year === 2005);
    const baselineTemp =
      baselineData.length > 0
        ? avg(baselineData, "temperature_c")
        : avg(series, "temperature_c");
    const temp_anomaly_c = round(current.temperature_c - baselineTemp, 2);

    return Response.json({
      region: { lat: Number(lat), lng: Number(lng) },
      source: "NASA POWER",
      source_url: "https://power.larc.nasa.gov",
      current,
      temp_anomaly_c,
      series: series.slice(-12),
      data_mode: "live",
      disclaimer:
        "Real satellite-derived climate data from NASA POWER. Forest loss, NDVI, PM2.5, and biomass require additional data sources.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}