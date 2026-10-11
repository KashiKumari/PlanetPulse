import { Thermometer, CloudRain, Droplets, Wind, Sun, Sprout, Satellite } from "lucide-react";

function formatValue(value, unit, digits = 1) {
  return Number.isFinite(value)
    ? `${Number(value).toFixed(digits)}${unit}`
    : "Data unavailable";
}

export default function NasaPowerCard({
  data,
  year,
  loading = false,
  error = null,
  compact = false,
}) {
  const yearSeries =
    year == null ? [] : data?.monthly_series?.filter((observation) => observation.year === year) || [];
  const annualMean = (key) => {
    const values = yearSeries
      .map((observation) => observation[key])
      .filter(Number.isFinite);
    return values.length
      ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3))
      : null;
  };
  const current =
    year == null
      ? data?.current
      : yearSeries.length
        ? {
            year,
            temperature_c: annualMean("temperature_c"),
            temp_max_c: annualMean("temp_max_c"),
            temp_min_c: annualMean("temp_min_c"),
            precipitation_mm: annualMean("precipitation_mm"),
            humidity_pct: annualMean("humidity_pct"),
            wind_ms: annualMean("wind_ms"),
            solar_rad: annualMean("solar_rad"),
            soil_moisture: annualMean("soil_moisture"),
          }
        : null;
  const isSelectedYear = year != null;
  const metricPeriod = (field) =>
    isSelectedYear
        ? `${year} monthly average`
        : data?.observation_dates?.[field]
          ? `${data.observation_dates[field]} · ${data.observation_resolution[field]}`
          : "No valid observation";
  const unit = (field, fallback) => data?.units?.[field] || fallback;
  const metrics = current
    ? [
          {
            label: "Temperature",
            field: "temperature_c",
            source: "T2M",
            value: formatValue(current.temperature_c, ` ${unit("temperature_c", "°C")}`),
            icon: Thermometer,
          sub:
            Number.isFinite(current.temp_min_c) && Number.isFinite(current.temp_max_c)
              ? `${current.temp_min_c}–${current.temp_max_c} °C ${
                  isSelectedYear ? "mean monthly min/max" : "min/max"
                }`
              : null,
        },
        ...(!isSelectedYear
          ? [
              {
                label: "Temperature Anomaly",
                field: "temp_anomaly_c",
                source: "T2M same-month baseline",
                value: formatValue(data.temp_anomaly_c, ` ${unit("temperature_c", "°C")}`),
                icon: Thermometer,
                anomaly: Number.isFinite(data.temp_anomaly_c) && data.temp_anomaly_c >= 0.5,
              },
            ]
          : []),
        {
          label: "Precipitation",
          field: "precipitation_mm",
          source: "PRECTOTCORR",
          value: formatValue(current.precipitation_mm, ` ${unit("precipitation_mm", "mm/day")}`),
          icon: CloudRain,
        },
        {
          label: "Relative Humidity",
          field: "humidity_pct",
          source: "RH2M",
          value: formatValue(current.humidity_pct, ` ${unit("humidity_pct", "%")}`, 1),
          icon: Droplets,
        },
        {
          label: "Wind Speed",
          field: "wind_ms",
          source: "WS10M",
          value: formatValue(current.wind_ms, ` ${unit("wind_ms", "m/s")}`),
          icon: Wind,
        },
        {
          label: "Solar Radiation",
          field: "solar_rad",
          source: "ALLSKY_SFC_SW_DWN",
          value: formatValue(current.solar_rad, ` ${unit("solar_rad", "MJ/m²/day")}`),
          icon: Sun,
        },
        {
          label: "Top-layer Soil Moisture",
          field: "soil_moisture",
          source: "GWETTOP",
          value: formatValue(current.soil_moisture, ` ${unit("soil_moisture", "fraction")}`, 3),
          icon: Sprout,
        },
      ]
    : [];

  return (
    <section
      className={`rounded-2xl border border-secondary/30 bg-card/60 backdrop-blur-sm ${
        compact ? "p-4" : "p-6"
      }`}
      aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-4">
        <Satellite className="h-5 w-5 text-secondary" />
        <div>
          <h2 className="font-display text-lg font-semibold">Climate Data</h2>
          <p className="text-xs text-muted-foreground">
            NASA POWER ·{" "}
            {isSelectedYear
              ? `${yearSeries.length} monthly records · ${year} averages`
              : `Latest valid measurements · ${data?.latest_date || "date unavailable"}`}
          </p>
        </div>
      </div>
      {loading && <p className="py-3 text-sm text-muted-foreground">Loading NASA POWER climate data…</p>}
      {!loading && error && (
        <p role="alert" className="py-2 text-sm text-destructive">
          NASA POWER climate data unavailable: {error}
        </p>
      )}
      {!loading && !error && !current && (
        <p className="py-2 text-sm text-muted-foreground">
          {isSelectedYear
            ? `No NASA POWER monthly climate observations are available for ${year}.`
            : "No NASA POWER monthly climate observations are available for this region."}
        </p>
      )}
      {!loading && !error && current && (
        <>
          {!isSelectedYear && data?.data_status === "partial" && (
            <p role="status" className="mb-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-2.5 text-xs text-amber-200">
              Partial data: values use each parameter&apos;s latest valid date; monthly observations are used when recent daily data is unavailable.
            </p>
          )}
          {!isSelectedYear && data?.data_errors?.daily && (
            <p role="status" className="mb-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-2.5 text-xs text-amber-200">
              Daily API error: {data.data_errors.daily}
            </p>
          )}
          {!isSelectedYear && data?.data_errors?.monthly && (
            <p role="status" className="mb-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-2.5 text-xs text-amber-200">
              Monthly history API error: {data.data_errors.monthly}
            </p>
          )}
          <div className={`grid grid-cols-2 ${compact ? "" : "sm:grid-cols-3 lg:grid-cols-4"} gap-3`}>
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className="rounded-lg bg-secondary/5 border border-secondary/10 px-3 py-2.5"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="h-3.5 w-3.5 text-secondary/70" />
                    <span className="text-[10px] font-medium text-muted-foreground">{m.label}</span>
                  </div>
                  <p
                    className={`text-lg font-bold ${
                      m.anomaly ? "text-orange-400" : "text-foreground"
                    }`}
                  >
                    {m.value}
                  </p>
                  {m.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{m.sub}</p>}
                  <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
                    {m.field === "temp_anomaly_c"
                      ? `${data.temp_anomaly_period || "Monthly baseline"} · NASA POWER`
                      : `${metricPeriod(m.field)} · NASA POWER ${m.source}`}
                  </p>
                  {!isSelectedYear && !Number.isFinite(current[m.field]) && m.field !== "temp_anomaly_c" && (
                    <p className="mt-1 text-[9px] leading-relaxed text-amber-200">
                      {data?.metric_status?.[m.field]?.reason || "No valid observation for this parameter."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            {isSelectedYear
              ? "Annual values are averages of available monthly NASA POWER gridded estimates (precipitation is average daily rate); they are not real-time weather-station readings or region-wide averages."
              : "NASA POWER gridded estimates; precipitation is a daily rate, and solar radiation is daily energy, not instantaneous power. Values are not region-wide averages."}
          </p>
        </>
      )}
    </section>
  );
}