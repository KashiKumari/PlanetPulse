import { generateHistory } from "../../shared/regionData.js";

export default async function (req) {
  try {
    const body = await req.json();
    const { lat, lng, name } = body;
    if (lat == null || lng == null) {
      return Response.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const history = generateHistory(lat, lng);

    return Response.json({
      region: { name: name || "Unnamed Region", lat: Number(lat), lng: Number(lng) },
      history,
      data_mode: "prototype",
      disclaimer: "Prototype historical series — real data pipeline arrives in Phase 8.",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}