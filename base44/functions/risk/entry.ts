import { generateIndicators } from "../../shared/regionData.js";
import { calculateRisk } from "../../shared/riskEngine.js";

export default async function (req) {
  try {
    const body = await req.json();
    let indicators = body.indicators;

    // If no indicators passed, generate from lat/lng
    if (!indicators && body.lat != null && body.lng != null) {
      indicators = generateIndicators(body.lat, body.lng);
    }
    if (!indicators) {
      return Response.json({ error: "Either indicators or lat/lng are required" }, { status: 400 });
    }

    const risk = calculateRisk(indicators);

    return Response.json({
      risk,
      input_indicators: indicators,
      data_mode: "prototype",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}