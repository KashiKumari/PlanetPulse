import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { getNasaNdviAvailableYears } from "@/services/nasaGibs";
import { YEAR_RANGE } from "@/utils/greeneryCalculations";

export default function YearTimeline({ selectedYear, onChange }) {
  const [availableYears, setAvailableYears] = useState(null);
  const [availabilityError, setAvailabilityError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getNasaNdviAvailableYears(YEAR_RANGE, controller.signal)
      .then(setAvailableYears)
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Failed to load NASA NDVI archive dates:", error);
          setAvailabilityError(error.message);
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Year timeline</p>
          <p className="text-xs text-muted-foreground">
            Slide to update the map and view that year’s satellite composite.
          </p>
        </div>
        <span
          className="shrink-0 rounded-lg bg-primary/15 px-3 py-1 text-sm font-bold text-primary"
          aria-live="polite"
        >
          {selectedYear}
        </span>
      </div>
      <input
        type="range"
        min={YEAR_RANGE[0]}
        max={YEAR_RANGE[YEAR_RANGE.length - 1]}
        step="1"
        value={selectedYear}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Select map and imagery year"
        aria-valuetext={String(selectedYear)}
        className="mb-1 h-2 w-full cursor-pointer accent-primary"
      />
      <div className="mb-3 flex justify-between text-[10px] text-muted-foreground">
        <span>{YEAR_RANGE[0]}</span>
        <span>{YEAR_RANGE[YEAR_RANGE.length - 1]}</span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        {availableYears?.includes(selectedYear)
          ? `NASA cloud-screened vegetation imagery is available for ${selectedYear}.`
          : availabilityError
            ? "NASA imagery dates could not be checked. You can still select a year."
            : "Checking NASA imagery availability…"}
      </p>
      {availabilityError && (
        <p role="status" className="mb-3 text-xs text-destructive">
          {availabilityError}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        {YEAR_RANGE.map((year) => {
          const isSelected = year === selectedYear;
          const hasImage = availableYears?.includes(year);
          return (
            <button
              key={year}
              onClick={() => onChange(year)}
              className={`flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 min-w-[78px] transition-all ${
                isSelected
                  ? "bg-primary/15 border border-primary/30 scale-105"
                  : "border border-transparent hover:bg-muted/50"
              }`}
            >
              <span
                className={`text-sm font-bold ${
                  isSelected ? "text-primary" : "text-foreground"
                }`}
              >
                {year}
              </span>
              {availableYears == null && !availabilityError ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : availabilityError ? (
                <span className="text-[10px] text-muted-foreground">Check</span>
              ) : hasImage ? (
                <>
                  <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                  <span className="text-[10px] text-primary">NASA image</span>
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground">No image</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}