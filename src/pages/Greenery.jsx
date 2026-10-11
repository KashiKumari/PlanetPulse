import { useState, useEffect } from "react";
import { Trees, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/services/planetPulseApi";
import { YEAR_RANGE } from "@/utils/greeneryCalculations";
import GreeneryControls from "@/components/greenery/GreeneryControls";
import GreeneryMap from "@/components/greenery/GreeneryMap";
import YearTimeline from "@/components/greenery/YearTimeline";
import BeforeAfterMaps from "@/components/greenery/BeforeAfterMaps";
import GreeneryTable from "@/components/greenery/GreeneryTable";
import GreeneryTrendChart from "@/components/greenery/GreeneryTrendChart";
import CountrySummaryCard from "@/components/greenery/CountrySummaryCard";
import ChangeDetectionSection from "@/components/greenery/ChangeDetectionSection";
import NdviSection from "@/components/greenery/NdviSection";
import YearStatsBanner from "@/components/greenery/YearStatsBanner";
import RegionClimatePanel from "@/components/dashboard/RegionClimatePanel";
import EcoAgentLink from "@/components/agent/EcoAgentLink";

export default function Greenery() {
  const [region, setRegion] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startYear, setStartYear] = useState(2006);
  const [endYear, setEndYear] = useState(2026);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [layer, setLayer] = useState("nasa");
  const [mode, setMode] = useState("single");
  const [globalView, setGlobalView] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);

  useEffect(() => {
    if (!region) return;
    setLoading(true);
    setError(null);
    api
      .regionHistory({ lat: region.lat, lng: region.lng, name: region.name })
      .then((res) => {
        setHistory(res.data.history);
        setSelectedYear(endYear);
      })
      .catch((e) => setError(e.message || "Failed to load greenery history"))
      .finally(() => setLoading(false));
  }, [region]);

  const handleRegionChange = (r) => {
    setRegion(r);
    setGlobalView(false);
    setFlyTarget({ lat: r.lat, lng: r.lng, zoom: 6 });
  };

  const handleStartYear = (y) => {
    setStartYear(y);
    if (y > endYear) setEndYear(y);
  };
  const handleEndYear = (y) => {
    setEndYear(y);
    if (y < startYear) setStartYear(y);
    setSelectedYear(y);
  };

  const showBeforeAfter = mode === "beforeafter" && region && history;
  const hasData = region && history && !globalView;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Header />

      <GreeneryControls
        region={region}
        startYear={startYear}
        endYear={endYear}
        layer={layer}
        comparisonMode={mode}
        globalView={globalView}
        onRegionChange={handleRegionChange}
        onStartYearChange={handleStartYear}
        onEndYearChange={handleEndYear}
        onLayerChange={setLayer}
        onModeChange={setMode}
        onGlobalViewToggle={() => setGlobalView(!globalView)}
      />

      {region && (
        <div className="mb-5 flex justify-end">
          <EcoAgentLink region={region} startYear={startYear} endYear={endYear} />
        </div>
      )}

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}

      {region && !globalView && (
        <div className="mb-5">
          <RegionClimatePanel lat={region.lat} lng={region.lng} />
        </div>
      )}

      {!loading && !error && (
        <>
          {showBeforeAfter ? (
            <div className="mb-5">
              <BeforeAfterMaps
                region={region}
                startYear={startYear}
                endYear={endYear}
                layer={layer}
                history={history}
              />
            </div>
          ) : (
            <>
              <div className="mb-3">
                <GreeneryMap
                  region={region}
                  year={selectedYear}
                  layer={layer}
                  history={history}
                  globalView={globalView}
                  onRegionChange={handleRegionChange}
                  flyTarget={flyTarget}
                />
              </div>

              {mode === "yearbyyear" ? (
                <div className="flex items-center gap-3 mb-5">
                  <PrevNextButton
                    onClick={() => setSelectedYear(Math.max(YEAR_RANGE[0], selectedYear - 1))}
                    disabled={selectedYear === YEAR_RANGE[0]}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </PrevNextButton>
                  <div className="flex-1">
                    <YearTimeline
                      selectedYear={selectedYear}
                      onChange={setSelectedYear}
                    />
                  </div>
                  <PrevNextButton
                    onClick={() =>
                      setSelectedYear(Math.min(YEAR_RANGE[YEAR_RANGE.length - 1], selectedYear + 1))
                    }
                    disabled={selectedYear === YEAR_RANGE[YEAR_RANGE.length - 1]}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </PrevNextButton>
                </div>
              ) : (
                <div className="mb-5">
                  <YearTimeline
                    selectedYear={selectedYear}
                    onChange={setSelectedYear}
                  />
                </div>
              )}
            </>
          )}

          {hasData && !showBeforeAfter && <YearStatsBanner history={history} year={selectedYear} />}

          {hasData && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                <CountrySummaryCard
                  region={region}
                  history={history}
                  startYear={startYear}
                  endYear={endYear}
                  onViewFullHistory={() => setMode("yearbyyear")}
                />
                <GreeneryTrendChart history={history} startYear={startYear} endYear={endYear} />
              </div>
              <div className="mb-5">
                <GreeneryTable history={history} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ChangeDetectionSection
                  history={history}
                  startYear={startYear}
                  endYear={endYear}
                />
                <NdviSection history={history} startYear={startYear} endYear={endYear} />
              </div>
            </>
          )}

          {!region && !globalView && <NoRegionPrompt />}
        </>
      )}

      <p className="text-center text-xs text-muted-foreground/60 mt-8">
        🛰️ Vegetation/forest-cover data is Demo data · Real Sentinel-2/Landsat NDVI processing is
        planned · NDVI is a satellite-derived indicator of vegetation health
      </p>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Trees className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold tracking-tight">Historical Greenery</h1>
      </div>
      <p className="text-muted-foreground text-lg">
        See how Earth's greenery has changed, year by year.
      </p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}

function ErrorMessage({ error }) {
  return <div className="text-center py-20 text-destructive text-sm">{error}</div>;
}

function NoRegionPrompt() {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <Trees className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p className="text-lg font-medium mb-1">Select a region to begin</p>
      <p className="text-sm">
        Click a country on the map, search a location, or pick from the dropdown above.
      </p>
    </div>
  );
}

function PrevNextButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-border p-2 hover:bg-muted/50 disabled:opacity-30 shrink-0"
    >
      {children}
    </button>
  );
}