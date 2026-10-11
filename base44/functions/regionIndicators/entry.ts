import { generateIndicators } from "../../shared/regionData.js";

export default async function (req) {
  try {
    const body = await req.json();
    const { lat, lng, name } = body;
    if (lat == null || lng == null) {
      return Response.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const indicators = generateIndicators(lat, lng);
    const sources = {
      forest_cover_pct: "Prototype — Phase 6: Hansen Global Forest Change (UMD/GEE)",
      forest_loss_pct: "Prototype — Phase 6: Hansen Global Forest Change (UMD/GEE)",
      ndvi: "Prototype — Phase 6: MODIS MOD13A2 (NASA/GEE)",
      ndvi_change_pct: "Prototype — Phase 6: MODIS MOD13A2 (NASA/GEE)",
      temp_anomaly_c: "Prototype — Phase 6: NASA POWER / MODIS LST",
      pm25: "Prototype — Phase 6: OpenAQ ground stations (not satellite-derived)",
      carbon_biomass_mgha: "Prototype — Phase 6: ESA CCI Biomass / GEDI (sparse, labeled prototype)",
    };

    return Response.json({
      region: { name: name || "Unnamed Region", lat: Number(lat), lng: Number(lng) },
      indicators,
      sources,
      data_mode: "prototype",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}