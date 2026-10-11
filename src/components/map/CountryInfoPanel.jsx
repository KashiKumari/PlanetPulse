import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CloudRain,
  Droplets,
  Gauge,
  Leaf,
  Loader2,
  Satellite,
  Sprout,
  Sun,
  Thermometer,
  Trees,
  Wind,
  X,
} from "lucide-react";
import { api } from "@/services/planetPulseApi";
import EcoAgentLink from "@/components/agent/EcoAgentLink";
import { getCurrentAirQuality } from "@/services/airQualityApi";
import NasaPowerChart from "@/components/dashboard/NasaPowerChart";
import { riskLevel } from "@/utils/riskColors";

function formatValue(value, digits, unit = "") {
  if (!Number.isFinite(value)) return "Data unavailable";
  return `${value.toFixed(digits)}${unit}`;
}

function ClimateMetric({ icon: Icon, label, value, period, source, status, reason }) {
  return (
    <article className="min-w-0 rounded-xl border border-secondary/15 bg-secondary/[0.07] p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
        <h4 className="truncate text-[11px] font-medium text-muted-foreground">{label}</h4>
      </div>
      <p className={`mt-2 break-words font-display text-lg font-bold leading-tight ${
        value === "Data unavailable" ? "text-sm text-muted-foreground" : "text-foreground"
      }`}>
        {value}
      </p>
      <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
        {period} · {source}
      </p>
      <p className={`mt-1 text-[9px] font-semibold ${
        status === "Available" ? "text-emerald-400" : "text-amber-300"
      }`}>
        {status}
      </p>
      {reason && <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{reason}</p>}
    </article>
  );
}

function IntelligenceMetric({ icon: Icon, label, value, unit, detail, unavailable = false }) {
  return (
    <article className="min-w-0 rounded-xl border border-primary/15 bg-primary/[0.06] p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <h4 className="truncate text-[11px] font-medium text-muted-foreground">{label}</h4>
      </div>
      <p className={`mt-2 break-words font-display text-lg font-bold leading-tight ${
        unavailable ? "text-sm text-muted-foreground" : "text-foreground"
      }`}>
        {unavailable ? "Data unavailable" : `${value}${unit ? ` ${unit}` : ""}`}
      </p>
      <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{detail}</p>
    </article>
  );
}

function RiskSection({ risk }) {
  const components = risk?.components || [];
  const inputValuesAvailable =
    components.length > 0 &&
    components.every((component) => Number.isFinite(component.raw_value));
  const scoreAvailable = inputValuesAvailable && Number.isFinite(risk?.score);
  const level = scoreAvailable ? riskLevel(risk.score) : null;

  return (
    <section className="mt-5 border-t border-border/70 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-foreground">
          Environmental Risk
        </h3>
      </div>

      {scoreAvailable ? (
        <>
          <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-foreground">Planet Pulse Prototype Risk Score</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Prototype composite indicator · not validated</p>
              </div>
              <p className="shrink-0 font-display text-2xl font-bold" style={{ color: level.color }}>
                {risk.score}<span className="text-xs font-medium text-muted-foreground"> / 100</span>
              </p>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
              role="meter"
              aria-label="Planet Pulse Prototype Risk Score"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={risk.score}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, risk.score))}%`, backgroundColor: level.color }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold" style={{ color: level.color }}>
              Risk: {level.label}
            </p>
          </div>
          <div className="mt-3 space-y-2">
            {components.map((component) => (
              <div key={component.name} className="flex items-center justify-between gap-3 text-[10px]">
                <span className="min-w-0 truncate text-muted-foreground">{component.name}</span>
                <span className="shrink-0 text-foreground">
                  {component.raw_value}{component.unit} · {component.contribution} pts
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[9px] leading-relaxed text-muted-foreground">
            {risk.disclaimer} Every score input above is a generated Planet Pulse prototype estimate,
            not a live satellite or monitoring measurement.
          </p>
        </>
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Insufficient data to calculate risk. Required prototype inputs are unavailable.
        </p>
      )}
    </section>
  );
}

export default function CountryInfoPanel({ country, onClose }) {
  const [nasaState, setNasaState] = useState({ data: null, error: null, loading: false });
  const [intelligenceState, setIntelligenceState] = useState({ data: null, error: null, loading: false });
  const [airState, setAirState] = useState({ data: null, error: null, loading: false });

  useEffect(() => {
    if (!country) return undefined;

    const controller = new AbortController();
    setNasaState({ data: null, error: null, loading: true });
    setIntelligenceState({ data: null, error: null, loading: true });
    setAirState({ data: null, error: null, loading: true });

    Promise.allSettled([
      api.nasaPower({ lat: country.lat, lng: country.lng, signal: controller.signal }),
      api.regionInfo({
        lat: country.lat,
        lng: country.lng,
        name: country.name,
        id: country.id,
      }),
      getCurrentAirQuality({ lat: country.lat, lng: country.lng, signal: controller.signal }),
    ]).then(([nasaResult, intelligenceResult, airResult]) => {
      if (controller.signal.aborted) return;

      setNasaState(
        nasaResult.status === "fulfilled"
          ? { data: nasaResult.value.data, error: null, loading: false }
          : { data: null, error: nasaResult.reason.message || "NASA POWER request failed.", loading: false },
      );
      setIntelligenceState(
        intelligenceResult.status === "fulfilled"
          ? { data: intelligenceResult.value.data, error: null, loading: false }
          : { data: null, error: intelligenceResult.reason.message || "Prototype indicators could not be loaded.", loading: false },
      );
      setAirState(
        airResult.status === "fulfilled"
          ? { data: airResult.value, error: null, loading: false }
          : { data: null, error: airResult.reason.message || "Air-quality data could not be loaded.", loading: false },
      );
    });

    return () => controller.abort();
  }, [country]);

  if (!country) return null;

  const nasaData = nasaState.data;
  const observation = nasaData?.current;
  const nasaPeriod = nasaData?.latest_date || "Observation date unavailable";
  const observationPeriod = (field) =>
    nasaData?.observation_dates?.[field]
      ? `${nasaData.observation_dates[field]} · ${nasaData.observation_resolution[field]}${
          nasaData.observation_resolution[field] === "daily" && nasaData.time_standard
            ? ` (${nasaData.time_standard})`
            : ""
        }`
      : "No valid observation";
  const metricStatus = (field) =>
    nasaData?.metric_status?.[field]?.status === "available" ? "Available" : "Data unavailable";
  const indicators = intelligenceState.data?.indicators;
  const risk = intelligenceState.data?.risk;
  const airData = airState.data;
  const airPeriod = airData?.time
    ? `${airData.time}${airData.timezone ? ` (${airData.timezone})` : ""}`
    : "Current period unavailable";
  const climateMetrics = [
    {
      label: "Temperature",
      value: formatValue(observation?.temperature_c, 1, ` ${nasaData?.units?.temperature_c || "°C"}`),
      icon: Thermometer,
      source: "NASA POWER · T2M",
      period: observationPeriod("temperature_c"),
      status: metricStatus("temperature_c"),
      reason: nasaData?.metric_status?.temperature_c?.reason,
      show: true,
    },
    {
      label: "Temp. Anomaly",
      value: Number.isFinite(nasaData?.temp_anomaly_c)
        ? formatValue(nasaData.temp_anomaly_c, 1, ` ${nasaData.units.temperature_c || "°C"}`)
        : "Data unavailable",
      icon: Activity,
      source: "NASA POWER · same-month baseline",
      period: nasaData?.temp_anomaly_period
        ? `${nasaData.temp_anomaly_period} · monthly baseline`
        : "No valid monthly baseline",
      status: Number.isFinite(nasaData?.temp_anomaly_c) ? "Available" : "Data unavailable",
      show: true,
    },
    {
      label: "Precipitation",
      value: formatValue(
        observation?.precipitation_mm,
        2,
        ` ${nasaData?.units?.precipitation_mm || "mm/day"}`,
      ),
      icon: CloudRain,
      source: "NASA POWER · PRECTOTCORR",
      period: observationPeriod("precipitation_mm"),
      status: metricStatus("precipitation_mm"),
      reason: nasaData?.metric_status?.precipitation_mm?.reason,
      show: true,
    },
    {
      label: "Relative Humidity",
      value: formatValue(observation?.humidity_pct, 1, ` ${nasaData?.units?.humidity_pct || "%"}`),
      icon: Droplets,
      source: "NASA POWER · RH2M",
      period: observationPeriod("humidity_pct"),
      status: metricStatus("humidity_pct"),
      reason: nasaData?.metric_status?.humidity_pct?.reason,
      show: true,
    },
    {
      label: "Wind Speed",
      value: formatValue(observation?.wind_ms, 2, ` ${nasaData?.units?.wind_ms || "m/s"}`),
      icon: Wind,
      source: "NASA POWER · WS10M",
      period: observationPeriod("wind_ms"),
      status: metricStatus("wind_ms"),
      reason: nasaData?.metric_status?.wind_ms?.reason,
      show: true,
    },
    {
      label: "Solar Radiation",
      value: formatValue(
        observation?.solar_rad,
        2,
        ` ${nasaData?.units?.solar_rad || "MJ/m²/day"}`,
      ),
      icon: Sun,
      source: "NASA POWER · ALLSKY_SFC_SW_DWN",
      period: observationPeriod("solar_rad"),
      status: metricStatus("solar_rad"),
      reason: nasaData?.metric_status?.solar_rad?.reason,
      show: true,
    },
    {
      label: "Top-layer Soil Moisture",
      value: formatValue(
        observation?.soil_moisture,
        3,
        ` ${nasaData?.units?.soil_moisture || "fraction"}`,
      ),
      icon: Sprout,
      source: "NASA POWER · GWETTOP",
      period: observationPeriod("soil_moisture"),
      status: metricStatus("soil_moisture"),
      reason: nasaData?.metric_status?.soil_moisture?.reason,
      show: Number.isFinite(observation?.soil_moisture),
    },
  ].filter((metric) => metric.show);

  const intelligenceMetrics = [
    {
      label: "Vegetation / Forest Cover",
      value: indicators?.forest_cover_pct,
      unit: "%",
      icon: Trees,
      detail: "No observation period · Planet Pulse prototype estimate",
    },
    {
      label: "NDVI",
      value: indicators?.ndvi,
      unit: "",
      icon: Leaf,
      detail: "No observation period · Planet Pulse prototype NDVI estimate",
      digits: 3,
    },
    {
      label: "Est. Forest Change",
      value: indicators?.forest_loss_pct,
      unit: "% estimated loss",
      icon: Activity,
      detail: "No observation period · Planet Pulse prototype estimate",
    },
    {
      label: "PM2.5 / Air Quality",
      value: airData
        ? [
            Number.isFinite(airData.pm2_5) ? `${airData.pm2_5.toFixed(1)} µg/m³` : null,
            Number.isFinite(airData.us_aqi) ? `US AQI ${Math.round(airData.us_aqi)}` : null,
          ].filter(Boolean).join(" · ") || null
        : null,
      unit: "",
      icon: Wind,
      detail: airData
        ? `Open-Meteo · ${airData.model} · ${airPeriod}`
        : airState.loading
          ? "Loading Open-Meteo CAMS estimate…"
          : "Open-Meteo CAMS · Data unavailable",
      unavailable: !airData || (!Number.isFinite(airData.pm2_5) && !Number.isFinite(airData.us_aqi)),
    },
    {
      label: "Biomass / Carbon",
      value: indicators?.carbon_biomass_mgha,
      unit: "Mg/ha",
      icon: Sprout,
      detail: "No observation period · Planet Pulse prototype carbon-biomass estimate",
    },
    {
      label: "Planet Pulse Risk Score",
      value: Number.isFinite(risk?.score) ? risk.score : null,
      unit: "/ 100",
      icon: Gauge,
      detail: "Prototype composite · see risk factors below",
    },
  ];

  const observationDate = nasaData
    ? `NASA POWER · latest valid observation ${nasaPeriod}`
    : "NASA POWER observation period unavailable";

  return (
    <aside
      className="absolute bottom-4 right-4 z-[500] w-[min(27rem,calc(100vw-2rem))]"
      aria-label={`${country.name} environmental snapshot`}
    >
      <div className="max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-base font-bold uppercase tracking-wide text-foreground">
              {country.name}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Environmental Snapshot</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Latest available observations · data source shown on each indicator
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${country.name} snapshot`}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px]">
          <span className="inline-flex items-center gap-1 rounded-full border border-secondary/20 bg-secondary/10 px-2 py-1 font-semibold text-secondary">
            <Satellite className="h-3 w-3" />
            NASA POWER
          </span>
          <span className="text-muted-foreground">{observationDate}</span>
        </div>

        {nasaState.loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 py-8 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading NASA POWER observations…
          </div>
        ) : (
          <>
            {nasaState.error && (
              <p role="alert" className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                NASA POWER: {nasaState.error}
              </p>
            )}
            {nasaData?.data_status === "partial" && (
              <p role="status" className="mb-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-2.5 text-xs text-amber-200">
                Partial data: each indicator uses its own latest valid observation date and may fall back to monthly data.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {climateMetrics.map((metric) => (
                <ClimateMetric
                  key={metric.label}
                  icon={metric.icon}
                  label={metric.label}
                  value={metric.value}
                  period={metric.period}
                  source={metric.source}
                  status={metric.status}
                  reason={metric.reason}
                />
              ))}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
              NASA POWER values are representative grid-point estimates near {country.name}, not
              country-wide averages.
            </p>
          </>
        )}

        <section className="mt-5 border-t border-border/70 pt-4">
          <div className="mb-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-foreground">
              Environmental Intelligence
            </h3>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Prototype estimates are labeled; air quality is a modeled external estimate.
            </p>
          </div>

          {intelligenceState.loading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading environmental intelligence…
            </div>
          ) : intelligenceState.error ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              Environmental intelligence could not be loaded: {intelligenceState.error}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {intelligenceMetrics.map((metric) => {
                const hasValue =
                  metric.value != null &&
                  (typeof metric.value === "string" || Number.isFinite(metric.value));
                const value =
                  typeof metric.value === "number" && Number.isFinite(metric.value)
                    ? metric.value.toFixed(metric.digits ?? 1)
                    : metric.value;
                return (
                  <IntelligenceMetric
                    key={metric.label}
                    icon={metric.icon}
                    label={metric.label}
                    value={value}
                    unit={metric.unit}
                    detail={metric.detail}
                    unavailable={metric.unavailable || !hasValue}
                  />
                );
              })}
            </div>
          )}
          {airState.loading && (
            <p className="mt-2 text-[10px] text-muted-foreground">Fetching modeled hourly CAMS air-quality data…</p>
          )}
          {airState.error && !airState.loading && (
            <p role="status" className="mt-2 text-[10px] text-muted-foreground">
              Air-quality estimate unavailable: {airState.error}
            </p>
          )}
        </section>

        {nasaData?.series?.length > 0 && (
          <section className="mt-5 border-t border-border/70 pt-4">
            <h3 className="mb-2 text-xs font-semibold text-foreground">NASA POWER monthly climate history</h3>
            <NasaPowerChart data={nasaData} height={145} />
          </section>
        )}

        <RiskSection risk={risk} />

        <nav className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Environmental history">
          <Link
            to="/greenery"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-center text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            Explore Historical Greenery <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/history"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-center text-[11px] font-semibold text-foreground transition-colors hover:bg-muted"
          >
            View Historical Trends <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
        <EcoAgentLink
          region={country}
          className="mt-2 w-full justify-center"
        />
      </div>
    </aside>
  );
}
