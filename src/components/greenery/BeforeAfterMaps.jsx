import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import CountryBoundaries from "@/components/map/CountryBoundaries";
import NasaSatelliteLayer from "@/components/map/NasaSatelliteLayer";
import {
  getGreeneryColor,
  getGreeneryForYear,
  computeGreeneryStats,
} from "@/utils/greeneryCalculations";

const baseTiles = {
  dark: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};
const labelUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

function MapInit({ registerMap }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane("labels")) {
      map.createPane("labels");
      map.getPane("labels").style.zIndex = 650;
      map.getPane("labels").style.pointerEvents = "none";
    }
    registerMap(map);
  }, [map, registerMap]);
  return null;
}

function FlyController({ region }) {
  const map = useMap();
  useEffect(() => {
    if (region) map.flyTo([region.lat, region.lng], 6, { duration: 1.0 });
  }, [region, map]);
  return null;
}

function MapContent({ region, year, layer, history, onNasaStatusChange }) {
  const isSatellite = layer === "truecolor";
  const isNasa = layer === "nasa";
  const greenery = getGreeneryForYear(history, year);
  const color = greenery != null ? getGreeneryColor(greenery) : "#666";
  return (
    <>
      {isNasa ? (
        <>
          <TileLayer url={baseTiles.dark} attribution="&copy; Esri" />
          <NasaSatelliteLayer
            key={`ndvi-${year}`}
            year={year}
            cloudFree
            onStatusChange={onNasaStatusChange}
          />
        </>
      ) : (
        <TileLayer
          url={isSatellite ? baseTiles.satellite : baseTiles.dark}
          attribution="&copy; Esri"
        />
      )}
      {!isSatellite && !isNasa && (
        <TileLayer url={labelUrl} pane="labels" attribution="" />
      )}
      <CountryBoundaries selectedCountry={region?.name} onSelectCountry={() => {}} />
      {region && greenery != null && (
        <CircleMarker
          center={[region.lat, region.lng]}
          radius={10 + (greenery / 100) * 14}
          pathOptions={{ color, fillColor: color, fillOpacity: 0.5, weight: 2 }}
        >
          <LeafletTooltip>
            {year} · {greenery.toFixed(1)}% greenery
          </LeafletTooltip>
        </CircleMarker>
      )}
    </>
  );
}

export default function BeforeAfterMaps({ region, startYear, endYear, layer, history }) {
  const [mapA, setMapA] = useState(null);
  const [mapB, setMapB] = useState(null);
  const [beforeStatus, setBeforeStatus] = useState({ loading: false, date: null, error: null });
  const [afterStatus, setAfterStatus] = useState({ loading: false, date: null, error: null });
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!mapA || !mapB) return;
    const syncAB = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      mapB.setView(mapA.getCenter(), mapA.getZoom(), { animate: false });
      syncingRef.current = false;
    };
    const syncBA = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      mapA.setView(mapB.getCenter(), mapB.getZoom(), { animate: false });
      syncingRef.current = false;
    };
    mapA.on("move", syncAB);
    mapB.on("move", syncBA);
    return () => {
      mapA.off("move", syncAB);
      mapB.off("move", syncBA);
    };
  }, [mapA, mapB]);

  const stats = history ? computeGreeneryStats(history, startYear, endYear) : null;
  const center = region ? [region.lat, region.lng] : [20, 0];

  return (
    <div>
      {layer === "nasa" && (
        <p className="mb-3 rounded-xl border border-secondary/20 bg-card/60 px-4 py-3 text-xs text-muted-foreground">
          NASA MODIS 16-day cloud-screened NDVI composites are matched to each selected year. Each
          panel reports the date of its composite; this vegetation-index layer uses a false-color
          scale rather than natural-color satellite imagery.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="rounded-t-xl bg-card/80 backdrop-blur-xl px-4 py-2 border border-border/60 border-b-0">
            <h3 className="font-display font-bold text-sm">Before · {startYear}</h3>
          </div>
          <div className="h-[350px] w-full rounded-b-xl overflow-hidden border border-border/60 border-t-0">
            <MapContainer
              center={center}
              zoom={6}
              className="h-full w-full"
              style={{ background: "#0a0e1a" }}
            >
              <MapInit registerMap={setMapA} />
              <FlyController region={region} />
              <MapContent
                key={`before-${startYear}-${layer}`}
                region={region}
                year={startYear}
                layer={layer}
                history={history}
                onNasaStatusChange={setBeforeStatus}
              />
            </MapContainer>
          </div>
          {layer === "nasa" && (
            <ImageryStatus year={startYear} status={beforeStatus} />
          )}
        </div>
        <div>
          <div className="rounded-t-xl bg-card/80 backdrop-blur-xl px-4 py-2 border border-border/60 border-b-0">
            <h3 className="font-display font-bold text-sm">After · {endYear}</h3>
          </div>
          <div className="h-[350px] w-full rounded-b-xl overflow-hidden border border-border/60 border-t-0">
            <MapContainer
              center={center}
              zoom={6}
              className="h-full w-full"
              style={{ background: "#0a0e1a" }}
            >
              <MapInit registerMap={setMapB} />
              <FlyController region={region} />
              <MapContent
                key={`after-${endYear}-${layer}`}
                region={region}
                year={endYear}
                layer={layer}
                history={history}
                onNasaStatusChange={setAfterStatus}
              />
            </MapContainer>
          </div>
          {layer === "nasa" && (
            <ImageryStatus year={endYear} status={afterStatus} />
          )}
        </div>
      </div>

      {stats && (
        <div className="mt-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Forest/greenery change ({startYear} → {endYear})
          </p>
          <p
            className={`font-display text-3xl font-bold ${
              stats.totalChange < 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {stats.totalChange >= 0 ? "+" : ""}
            {stats.totalChangePct.toFixed(1)}%
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            Change statistics use Planet Pulse demo history; the map imagery is the selected NASA MODIS composite.
          </p>
        </div>
      )}
    </div>
  );
}

function ImageryStatus({ year, status }) {
  return (
    <p
      className={`mt-2 text-xs ${
        status.error ? "text-destructive" : "text-muted-foreground"
      }`}
      role={status.error ? "status" : undefined}
    >
      {status.loading && `Loading NASA MODIS NDVI composite for ${year}…`}
      {!status.loading && status.date &&
        `NASA MODIS 16-day NDVI composite date: ${status.date} · selected year ${year}`}
      {!status.loading && status.error && `NASA imagery unavailable for ${year}: ${status.error}`}
    </p>
  );
}