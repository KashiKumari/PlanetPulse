import { getGreeneryColor, getNdviColor } from "@/utils/greeneryCalculations";

export default function YearStatsBanner({ history, year }) {
  const item = history?.find((h) => h.year === year);
  if (!item) return null;

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 mb-5 text-center">
      <h3 className="font-display text-2xl font-bold text-primary mb-3">{year}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat
          label="Greenery"
          value={`${item.forest_cover_pct.toFixed(1)}%`}
          color={getGreeneryColor(item.forest_cover_pct)}
        />
        <Stat label="NDVI" value={item.ndvi.toFixed(2)} color={getNdviColor(item.ndvi)} />
        <Stat label="Temp Anomaly" value={`+${item.temp_anomaly_c}°C`} color="#f97316" />
        <Stat label="PM2.5" value={`${item.pm25} µg/m³`} color="#ef4444" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}