export default async function (req) {
  try {
    return Response.json({
      status: "ok",
      service: "Planet Pulse API",
      version: "1.0.0-prototype",
      timestamp: new Date().toISOString(),
      data_mode: "prototype",
      endpoints: [
        "regionInfo", "regionHistory", "regionIndicators",
        "predict", "risk", "compare", "aiAnalysis",
      ],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}