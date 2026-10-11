import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/services/planetPulseApi";
import CurrentAirQualityCard from "@/components/dashboard/CurrentAirQualityCard";
import NasaPowerCard from "@/components/dashboard/NasaPowerCard";

export default function HotspotPopup({ hotspot }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    setLoading(true);

    api
      .nasaPower({ lat: hotspot.lat, lng: hotspot.lng, signal: controller.signal })
      .then((response) => setData(response.data))
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [hotspot]);

  return (
    <div className="min-w-[210px] max-w-[280px]">
      <h3 className="font-semibold text-sm text-foreground">{hotspot.name}</h3>
      {hotspot.biome && <p className="mb-2 text-xs text-muted-foreground">{hotspot.biome}</p>}

      <div className="mb-2">
        <CurrentAirQualityCard
          lat={hotspot.lat}
          lng={hotspot.lng}
          placeName={hotspot.name}
          compact
        />
      </div>

      {loading && (
        <div className="flex items-center py-3 text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-secondary" />
          Loading NASA climate observations…
        </div>
      )}

      {!loading && error && (
        <p role="alert" className="py-2 text-xs text-destructive">
          NASA POWER data unavailable: {error}
        </p>
      )}

      {!loading && data && (
        <NasaPowerCard data={data} compact />
      )}
    </div>
  );
}
