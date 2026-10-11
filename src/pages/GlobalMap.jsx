import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Satellite, Map as MapIcon, ChevronRight } from "lucide-react";
import { allRegions } from "@/data/allRegions";
import { indiaStates } from "@/data/indiaStates";
import HotspotPopup from "@/components/map/HotspotPopup";
import MapSearch from "@/components/map/MapSearch";
import CountryBoundaries from "@/components/map/CountryBoundaries";
import CountryInfoPanel from "@/components/map/CountryInfoPanel";
import NasaSatelliteLayer from "@/components/map/NasaSatelliteLayer";

function MapController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom || 5, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

// Creates a custom pane for geographic labels that sits above markers
// but doesn't intercept clicks (pointerEvents: none).
function LabelPaneSetup() {
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

// Base map tiles (no labels — labels come from a separate overlay tile layer).
const baseTileLayers = {
  dark: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

// Esri geographic label overlay — country/state/city/ocean names that
// appear dynamically based on zoom level. Not hardcoded.
const labelTileUrl =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

const groupCenters = {
  all: { lat: 22, lng: 82, zoom: 4 },
  india: { lat: 22, lng: 82, zoom: 4 },
  global: { lat: 15, lng: 10, zoom: 2 },
};

export default function GlobalMap() {
  const [baseLayer, setBaseLayer] = useState("dark");
  const [flyTarget, setFlyTarget] = useState(null);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [groupFilter, setGroupFilter] = useState("india");
  const [nasaStatus, setNasaStatus] = useState({ loading: false, date: null, error: null });

  const filteredHotspots =
    groupFilter === "all" ? allRegions : allRegions.filter((h) => h.group === groupFilter);

  const indiaSorted = [...indiaStates].sort((a, b) => a.name.localeCompare(b.name));
  const globalSorted = allRegions
    .filter((h) => h.group === "global")
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleGroupChange = (g) => {
    setGroupFilter(g);
    setFlyTarget(groupCenters[g]);
  };

  const handleSelectCountry = (c) => {
    setSelectedCountry(c);
    setSelectedHotspot(null);
  };

  const handleSelectHotspot = (h) => {
    setSelectedHotspot(h);
    setSelectedCountry(null);
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <MapContainer
        center={[22, 82]}
        zoom={4}
        minZoom={2}
        worldCopyJump
        className="h-full w-full"
        style={{ background: "#0a0e1a" }}
      >
        {/* Base map (no labels) */}
        {baseLayer === "nasa" ? (
          <>
            <TileLayer url={baseTileLayers.dark} attribution="&copy; Esri" />
            <NasaSatelliteLayer cloudFree onStatusChange={setNasaStatus} />
          </>
        ) : (
          <TileLayer
            key={baseLayer}
            url={baseTileLayers[baseLayer]}
            attribution={
              baseLayer === "dark"
                ? "&copy; Esri"
                : "&copy; Esri, Maxar, Earthstar Geographics"
            }
          />
        )}

        {/* Geographic label overlay — zoom-aware, non-hardcoded */}
        <LabelPaneSetup />
        {baseLayer !== "satellite" && (
          <TileLayer url={labelTileUrl} pane="labels" attribution="" />
        )}

        <MapController target={flyTarget} />

        {/* Country boundaries from Natural Earth — click to explore */}
        <CountryBoundaries
          selectedCountry={selectedCountry}
          onSelectCountry={handleSelectCountry}
        />

        {/* Place markers identify selectable NASA POWER sampling locations. */}
        {filteredHotspots.map((h) => {
          return (
            <CircleMarker
              key={h.id}
              center={[h.lat, h.lng]}
              radius={5}
              pathOptions={{
                color: "#67e8f9",
                fillColor: "#22d3ee",
                fillOpacity: 0.7,
                weight: 1.5,
              }}
              eventHandlers={{ click: () => handleSelectHotspot(h) }}
            >
              <Popup className="pp-popup">
                <HotspotPopup hotspot={h} />
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Floating control panel */}
      <div
        className={`absolute top-4 left-4 z-[500] w-80 max-w-[calc(100vw-2rem)] transition-transform ${
          panelOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]"
        }`}
      >
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-border/60">
            <div>
              <h1 className="font-display font-bold text-base">Global Intelligence Map</h1>
              <p className="text-xs text-muted-foreground">
                Select a country or marker for NASA climate observations
              </p>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/50 lg:hidden"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
            <MapSearch onSelect={(t) => setFlyTarget(t)} />
            <p className="rounded-lg border border-secondary/20 bg-secondary/5 p-3 text-xs leading-relaxed text-muted-foreground">
              Click a country for the latest available NASA POWER climate data at a representative
              grid point. The NASA Greenery layer shows satellite-derived MODIS vegetation imagery.
            </p>

            {/* Group filter */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Region Focus
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "india", label: "India" },
                  { id: "global", label: "World" },
                  { id: "all", label: "All" },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleGroupChange(g.id)}
                    className={`rounded-lg px-2 py-1.5 text-xs font-medium border transition-colors ${
                      groupFilter === g.id
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "border-border text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Base layer toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setBaseLayer("dark")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border ${
                  baseLayer === "dark"
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" /> Dark
              </button>
              <button
                onClick={() => setBaseLayer("satellite")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border ${
                  baseLayer === "satellite"
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Satellite className="h-3.5 w-3.5" /> Esri
              </button>
              <button
                onClick={() => setBaseLayer("nasa")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border ${
                  baseLayer === "nasa"
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Satellite className="h-3.5 w-3.5" /> NASA Greenery
              </button>
            </div>

            {/* Watchlist — India States */}
            {(groupFilter === "india" || groupFilter === "all") && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  🇮🇳 India · {indiaSorted.length} States / UTs
                </p>
                <div className="space-y-1.5">
                  {indiaSorted.map((h) => {
                    const isSel = selectedHotspot?.id === h.id;
                    return (
                      <button
                        key={h.id}
                        onClick={() => {
                          handleSelectHotspot(h);
                          setFlyTarget({ lat: h.lat, lng: h.lng, zoom: 6 });
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                          isSel
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-secondary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{h.name}</p>
                          <p className="text-[10px] text-muted-foreground">{h.biome}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Watchlist — Global */}
            {(groupFilter === "global" || groupFilter === "all") && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  🌍 Global · {globalSorted.length} Hotspots
                </p>
                <div className="space-y-1.5">
                  {globalSorted.map((h) => {
                    const isSel = selectedHotspot?.id === h.id;
                    return (
                      <button
                        key={h.id}
                        onClick={() => {
                          handleSelectHotspot(h);
                          setFlyTarget({ lat: h.lat, lng: h.lng, zoom: 5 });
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                          isSel
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-secondary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{h.name}</p>
                          <p className="text-[10px] text-muted-foreground">{h.country}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="absolute top-4 left-4 z-[500] rounded-lg border border-border bg-card/80 backdrop-blur-xl px-3 py-2 text-sm font-medium shadow-lg lg:hidden"
        >
          Panel
        </button>
      )}

      {baseLayer === "nasa" && (
        <div className="absolute bottom-4 left-4 z-[500] rounded-lg border border-border/60 bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-lg">
          {nasaStatus.loading && "Loading latest NASA vegetation composite…"}
          {nasaStatus.date &&
            `NASA MODIS NDVI · ${nasaStatus.date} · 16-day cloud-screened composite`}
          {nasaStatus.error && `NASA greenery composite unavailable: ${nasaStatus.error}`}
        </div>
      )}

      {selectedHotspot && (
        <div className="absolute bottom-4 right-4 z-[500] w-72 max-w-[calc(100vw-2rem)]">
          <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-sm">{selectedHotspot.name}</h3>
                <p className="text-xs text-muted-foreground">{selectedHotspot.biome}</p>
              </div>
              <button
                onClick={() => setSelectedHotspot(null)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>
            <HotspotPopup hotspot={selectedHotspot} />
          </div>
        </div>
      )}

      <CountryInfoPanel country={selectedCountry} onClose={() => setSelectedCountry(null)} />
    </div>
  );
}