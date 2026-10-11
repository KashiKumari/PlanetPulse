import { layers } from "@/utils/riskColors";

export default function LayerControl({ activeLayer, onChange }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Data Layer</p>
      <div className="grid grid-cols-1 gap-1.5">
        {layers.map((layer) => {
          const Icon = layer.icon;
          const active = activeLayer === layer.id;
          return (
            <button
              key={layer.id}
              onClick={() => onChange(layer.id)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left ${
                active
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {layer.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}