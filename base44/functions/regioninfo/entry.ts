import { generateIndicators, generateHistory } from "../../shared/regionData.js";
import { calculateRisk } from "../../shared/riskEngine.js";

export default async function (req) {
  try {
    const body = await req.json();
    const { lat, lng, name, id } = body;
    if (lat == null || lng == null) {
      return Response.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const indicators = generateIndicators(lat, lng);
    const history = generateHistory(lat, lng);
    const risk = calculateRisk(indicators);

    return Response.json({
      region: {
        name: name || "Unnamed Region",
        id: id || null,
        lat: Number(lat),
        lng: Number(lng),
      },
      indicators,
      risk,
      history_summary: {
        start_year: 2005,
        end_year: 2026,
        data_points: history.length,
      },
      data_mode: "prototype",
      disclaimer: "Prototype data — real satellite/environmental sources arrive in Phase 6.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}