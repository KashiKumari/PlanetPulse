import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import MapSearch from "@/components/map/MapSearch";
import CountryBoundaries from "@/components/map/CountryBoundaries";
import NasaSatelliteLayer from "@/components/map/NasaSatelliteLayer";
import { allRegions } from "@/data/allRegions";
import {
  getGreeneryColor,
  getChangeColor,
  getNdviColor,
  getGreeneryForYear,
  getNdviForYear,
} from "@/utils/greeneryCalculations";

const baseTiles = {
  dark: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};
const labelUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

const countryAliases = {
  "DR Congo": "Dem. Rep. Congo",
  USA: "United States of America",
};

function getRegionCountries(region) {
  const countries = region?.country || region?.name;
  if (!countries) return [];
  return countries
    .split("/")
    .map((country) => country.trim())
    .filter(Boolean)
    .map((country) => countryAliases[country] || country);
}

function LabelPane() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane("labels")) {
      map.createPane("labels");
      map.getPane("labels").style.zIndex = "650";
      map.getPane("labels").style.pointerEvents = "none";
    }
  }, [map]);
  return null;
}

function FlyController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom || 6, { duration: 1.2 });
  }, [target, map]);
  return null;
}

function overlayColor(layer, history, year, region) {
  if (layer === "ndvi") {
    const ndvi = getNdviForYear(history, year);
    return ndvi != null ? getNdviColor(ndvi) : "#666";
  }
  if (layer === "change") return getChangeColor(-region.forest_loss_pct);
  const greenery = getGreeneryForYear(history, year);
  return greenery != null ? getGreeneryColor(greenery) : "#666";
}

function circleRadius(value, type) {
  if (type === "ndvi") return Math.max(4, Math.min(20, 8 + value * 12));
  if (type === "change") return 6 + (Math.max(0, Math.min(value, 30)) / 30) * 12;
  return 8 + (Math.max(0, Math.min(value, 100)) / 100) * 14;
}

function overlayRadius(layer, history, year, region) {
  if (layer === "ndvi") {
    const ndvi = getNdviForYear(history, year);
    return ndvi != null ? circleRadius(ndvi, "ndvi") : 10;
  }
  if (layer === "change") return circleRadius(region.forest_loss_pct || 0, "change");
  const greenery = getGreeneryForYear(history, year);
  return greenery != null ? circleRadius(greenery, "greenery") : 10;
}

function CircleScaleLegend({ layer, globalView }) {
  const type = globalView || layer === "change" ? "change" : layer === "ndvi" ? "ndvi" : "greenery";
  const legend = {
    change: {
      title: "Forest loss · hotspot markers",
      sizes: [5, 15, 30],
      colors: [
        { value: 0, label: "0%" },
        { value: 1, label: "≤1%" },
        { value: 2, label: "≤2%" },
        { value: 5, label: ">2%" },
      ],
      colorFor: (value) => getChangeColor(-value),
      sizeFor: (value) => circleRadius(value, "change"),
    },
    ndvi: {
      title: "NDVI · selected region",
      sizes: [0, 0.5, 1],
      colors: [
        { value: 0, label: "<0.1" },
        { value: 0.2, label: "0.1–0.29" },
        { value: 0.4, label: "0.3–0.49" },
        { value: 0.6, label: "0.5–0.69" },
        { value: 0.8, label: "≥0.7" },
      ],
      colorFor: getNdviColor,
      sizeFor: (value) => circleRadius(value, "ndvi"),
    },
    greenery: {
      title: "Greenery · selected region",
      sizes: [0, 50, 100],
      colors: [
        { value: 10, label: "<20%" },
        { value: 27, label: "20–34%" },
        { value: 45, label: "35–54%" },
        { value: 65, label: "55–74%" },
        { value: 85, label: "≥75%" },
      ],
      colorFor: getGreeneryColor,
      sizeFor: (value) => circleRadius(value, "greenery"),
    },
  }[type];

  return (
    <div className="absolute bottom-4 right-4 z-[500] max-w-[calc(100%-2rem)] rounded-xl border border-border/60 bg-card/90 p-3 text-[10px] text-muted-foreground shadow-lg backdrop-blur-sm">
      <p className="mb-2 font-semibold text-foreground">{legend.title}</p>
      <div className="mb-2 flex items-end gap-3">
        {legend.sizes.map((value) => {
          const radius = legend.sizeFor(value);
          const diameter = radius * 2 + 2;
          return (
            <div key={value} className="flex items-end gap-1">
              <svg
                width={diameter}
                height={diameter}
                viewBox={`0 0 ${diameter} ${diameter}`}
                aria-hidden="true"
              >
                <circle
                  cx={diameter / 2}
                  cy={diameter / 2}
                  r={radius}
                  fill="hsl(152 56% 48%)"
                  fillOpacity="0.5"
                  stroke="hsl(152 64% 58%)"
                  strokeWidth="2"
                />
              </svg>
              <span>
                {value}
                {type === "ndvi" ? "" : "%"}
              </span>
            </div>
          );
        })}
        <span className="ml-auto pl-2">circle size</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {legend.colors.map(({ value, label }) => (
          <span key={label} className="inline-flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full border border-white/30"
              style={{ backgroundColor: legend.colorFor(value) }}
            />
            {label}
          </span>
        ))}
        <span className="ml-auto pl-2">color = value</span>
      </div>
      <p className="mt-2 border-t border-border/60 pt-2">
        Country outlines show geography; circles show regional values.
      </p>
    </div>
  );
}

export default function GreeneryMap({
  region,
  year,
  layer,
  history,
  globalView,
  onRegionChange,
  flyTarget,
}) {
  const isSatellite = layer === "truecolor";
  const isNasa = layer === "nasa";
  const [nasaStatus, setNasaStatus] = useState({ loading: false, date: null, error: null });
  const selectedCountries = useMemo(() => getRegionCountries(region), [region]);
  const selectedMetric = isNasa
    ? null
    :
    layer === "change"
      ? region?.forest_loss_pct
      : layer === "ndvi"
        ? getNdviForYear(history, year)
        : getGreeneryForYear(history, year);
  const hasRegionMarker = region && !globalView && Number.isFinite(selectedMetric);
  const markerMetricLabel = Number.isFinite(selectedMetric)
    ? layer === "change"
      ? `${selectedMetric.toFixed(1)}% forest loss`
      : layer === "ndvi"
        ? `NDVI ${selectedMetric.toFixed(2)}`
        : `${selectedMetric.toFixed(1)}% greenery`
    : "N/A";

  return (
    <div className="relative h-[500px] w-full rounded-2xl overflow-hidden border border-border/60">
      <MapContainer
        center={region ? [region.lat, region.lng] : [20, 0]}
        zoom={region ? 6 : 2}
        minZoom={2}
        worldCopyJump
        className="h-full w-full"
        style={{ background: "#0a0e1a" }}
      >
        <TileLayer
          url={isSatellite ? baseTiles.satellite : baseTiles.dark}
          attribution="&copy; Esri"
        />
        {isNasa && (
          <NasaSatelliteLayer
            year={year}
            cloudFree
            onStatusChange={setNasaStatus}
          />
        )}
        <LabelPane />
        {!isSatellite && (
          <TileLayer url={labelUrl} pane="labels" attribution="" />
        )}
        <FlyController target={flyTarget} />
        <CountryBoundaries
          selectedCountries={selectedCountries}
          onSelectCountry={(c) => onRegionChange({ ...c, id: null })}
        />

        {hasRegionMarker && (
          <CircleMarker
            center={[region.lat, region.lng]}
            radius={overlayRadius(layer, history, year, region)}
            pathOptions={{
              color: overlayColor(layer, history, year, region),
              fillColor: overlayColor(layer, history, year, region),
              fillOpacity: 0.5,
              weight: 2,
            }}
          >
            <LeafletTooltip>
              {region.name} · {year} · {markerMetricLabel}
            </LeafletTooltip>
          </CircleMarker>
        )}

        {!isNasa && globalView &&
          allRegions.map((r) => (
            <CircleMarker
              key={r.id}
              center={[r.lat, r.lng]}
              radius={circleRadius(r.forest_loss_pct, "change")}
              pathOptions={{
                color: getChangeColor(-r.forest_loss_pct),
                fillColor: getChangeColor(-r.forest_loss_pct),
                fillOpacity: 0.5,
                weight: 1.5,
              }}
              eventHandlers={{ click: () => onRegionChange(r) }}
            >
              <LeafletTooltip>
                {r.name} · Forest loss: {r.forest_loss_pct}%
              </LeafletTooltip>
            </CircleMarker>
          ))}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[500] w-72 max-w-[calc(100vw-2rem)]">
        <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-xl p-3 shadow-xl">
          <MapSearch onSelect={(t) => onRegionChange({ ...t, id: null })} />
        </div>
      </div>
      {isNasa && (
        <div className="absolute bottom-4 left-4 z-[500] rounded-lg border border-border/60 bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-lg">
          {nasaStatus.loading &&
            `Loading NASA composite for ${year}…`}
          {nasaStatus.date &&
            `NASA MODIS 16-day NDVI composite date: ${nasaStatus.date} · selected year ${year}`}
          {nasaStatus.error && `NASA greenery composite unavailable: ${nasaStatus.error}`}
        </div>
      )}
      {!isNasa && (globalView ? allRegions.length > 0 : hasRegionMarker) && (
        <CircleScaleLegend layer={layer} globalView={globalView} />
      )}
    </div>
  );
}