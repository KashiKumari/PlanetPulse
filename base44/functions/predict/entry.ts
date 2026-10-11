import { generateForecast } from "../../shared/regionData.js";

export default async function (req) {
  try {
    const body = await req.json();
    const { lat, lng, name, horizon } = body;
    if (lat == null || lng == null) {
      return Response.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const h = Math.min(Math.max(parseInt(horizon) || 4, 1), 10);
    const result = generateForecast(lat, lng, h);

    return Response.json({
      region: { name: name || "Unnamed Region", lat: Number(lat), lng: Number(lng) },
      forecast: result.forecast,
      model: result.model,
      data_mode: "prototype",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}