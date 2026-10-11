import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export function ecoAgentHref({ region, regions, startYear, endYear }) {
  const params = new URLSearchParams();
  if (region) {
    params.set("name", region.name || "");
    params.set("lat", String(region.lat));
    params.set("lng", String(region.lng));
  }
  if (Array.isArray(regions)) {
    regions.slice(0, 2).forEach((item, index) => {
      const prefix = index === 0 ? "region_a" : "region_b";
      params.set(`${prefix}_name`, item.name || "");
      params.set(`${prefix}_lat`, String(item.lat));
      params.set(`${prefix}_lng`, String(item.lng));
    });
  }
  if (Number.isInteger(startYear)) params.set("start_year", String(startYear));
  if (Number.isInteger(endYear)) params.set("end_year", String(endYear));
  const query = params.toString();
  return `/eco-analyst${query ? `?${query}` : ""}`;
}

export default function EcoAgentLink({
  region,
  regions,
  startYear,
  endYear,
  children = "Ask Eco Agent",
  className = "",
}) {
  return (
    <Link
      to={ecoAgentHref({ region, regions, startYear, endYear })}
      className={`inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity ${className}`}
    >
      <Sparkles className="h-4 w-4" />
      {children}
    </Link>
  );
}
