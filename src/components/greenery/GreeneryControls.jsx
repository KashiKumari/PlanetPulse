import { Globe } from "lucide-react";
import { indiaStates } from "@/data/indiaStates";
import { hotspots } from "@/data/hotspots";
import { allRegions } from "@/data/allRegions";
import { YEAR_RANGE } from "@/utils/greeneryCalculations";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const layerOptions = [
  { id: "nasa", label: "NASA Imagery" },
  { id: "truecolor", label: "True Color (Satellite)" },
  { id: "ndvi", label: "NDVI" },
  { id: "vegetation", label: "Vegetation" },
  { id: "forest", label: "Forest Cover" },
  { id: "change", label: "Forest Change" },
];

const modeOptions = [
  { id: "single", label: "Single Year" },
  { id: "beforeafter", label: "Before / After" },
  { id: "yearbyyear", label: "Year-by-Year" },
];

export default function GreeneryControls({
  region,
  startYear,
  endYear,
  layer,
  comparisonMode,
  globalView,
  onRegionChange,
  onStartYearChange,
  onEndYearChange,
  onLayerChange,
  onModeChange,
  onGlobalViewToggle,
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 mb-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Location
          </label>
          <Select
            value={region?.id || ""}
            onValueChange={(id) => {
              const r = allRegions.find((r) => r.id === id);
              if (r) onRegionChange(r);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select region..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>🇮🇳 India States & UTs</SelectLabel>
                {indiaStates.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>🌍 Global Hotspots</SelectLabel>
                {hotspots.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Start Year
          </label>
          <Select value={String(startYear)} onValueChange={(v) => onStartYearChange(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_RANGE.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            End Year
          </label>
          <Select value={String(endYear)} onValueChange={(v) => onEndYearChange(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_RANGE.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Layer
          </label>
          <Select value={layer} onValueChange={onLayerChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {layerOptions.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border/60">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Comparison
          </label>
          <div className="flex gap-1.5">
            {modeOptions.map((m) => (
              <button
                key={m.id}
                onClick={() => onModeChange(m.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                  comparisonMode === m.id
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onGlobalViewToggle}
          className={`ml-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border transition-colors ${
            globalView
              ? "bg-destructive/15 text-destructive border-destructive/30"
              : "bg-primary/15 text-primary border-primary/30 hover:bg-primary/20"
          }`}
        >
          <Globe className="h-4 w-4" />
          {globalView ? "Exit Global View" : "Global Forest Change"}
        </button>
      </div>
    </div>
  );
}