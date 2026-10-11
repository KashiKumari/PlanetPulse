import { useEffect, useState } from "react";
import { api } from "@/services/planetPulseApi";
import NasaPowerCard from "@/components/dashboard/NasaPowerCard";

export default function RegionClimatePanel({ lat, lng, compact = false }) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    api
      .nasaPower({ lat, lng, signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setState({ data: result.data, loading: false, error: null });
        }
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setState({
            data: null,
            loading: false,
            error: requestError.message || "NASA POWER request failed.",
          });
        }
      });
    return () => controller.abort();
  }, [lat, lng]);

  return (
    <NasaPowerCard
      data={state.data}
      loading={state.loading}
      error={state.error}
      compact={compact}
    />
  );
}
