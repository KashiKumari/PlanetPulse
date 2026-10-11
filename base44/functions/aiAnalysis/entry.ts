import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { generateIndicators, generateHistory, generateForecast } from "../../shared/regionData.js";
import { calculateRisk } from "../../shared/riskEngine.js";

export default async function (req) {
  try {
    const body = await req.json();
    const { lat, lng, name, question } = body;
    if (lat == null || lng == null) {
      return Response.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const indicators = generateIndicators(lat, lng);
    const history = generateHistory(lat, lng);
    const forecast = generateForecast(lat, lng, 4);
    const risk = calculateRisk(indicators);

    const dataContext = JSON.stringify(
      {
        region: name || "Unnamed Region",
        coordinates: { lat: Number(lat), lng: Number(lng) },
        current_indicators: indicators,
        risk_score: risk.score,
        risk_level: risk.level,
        risk_components: risk.components,
        recent_history: history.slice(-3),
        forecast_2027_2030: forecast.forecast,
        model: forecast.model,
        data_mode: "prototype",
      },
      null,
      2
    );

    const prompt = `You are the Planet Pulse AI Environmental Analyst. Answer the user's question using ONLY the structured environmental data provided below.

STRICT RULES:
1. Do NOT invent, estimate, or fabricate any measurements, values, or statistics not present in the data.
2. If the data does not contain the answer, say so honestly.
3. Clearly distinguish between observed/prototype data, model predictions, and your interpretation.
4. Reference the Planet Pulse Prototype Risk Score by its full name — it is NOT an internationally validated index.
5. Keep the answer concise, clear, and grounded.

ENVIRONMENTAL DATA (prototype, clearly labeled):
${dataContext}

USER QUESTION: ${question || "Summarize the environmental situation of this region and explain why it is at risk."}`;

    const base44 = createClientFromRequest(req);
    const answer = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
    });

    return Response.json({
      answer,
      context: {
        region: name || "Unnamed Region",
        indicators,
        risk,
        forecast: forecast.forecast,
      },
      data_mode: "prototype",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}