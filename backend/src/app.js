import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { answerEcoAgent, publicGroqError } from "./ecoAgent.js";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CONTENT_LENGTH = 3000;
const MAX_TOTAL_HISTORY_LENGTH = 10000;

function cleanText(value, maxLength) {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

function parseRegion(value) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("selectedRegion must be an object.");
  }
  const name = typeof value.name === "string" ? cleanText(value.name, 120) : "";
  if (!name && value.lat == null && value.lng == null) {
    return null;
  }
  const lat = value.lat;
  const lng = value.lng;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new Error("selectedRegion must include valid latitude and longitude.");
  }
  return { name: name || "Selected region", lat, lng };
}

function parseHistory(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > MAX_HISTORY_MESSAGES) {
    throw new Error(`conversation must contain no more than ${MAX_HISTORY_MESSAGES} messages.`);
  }
  let totalLength = 0;
  return value.map((entry) => {
    if (
      !entry ||
      !["user", "assistant"].includes(entry.role) ||
      typeof entry.content !== "string" ||
      !entry.content.trim()
    ) {
      throw new Error("conversation messages must contain a user/assistant role and text content.");
    }
    if (entry.content.length > MAX_HISTORY_CONTENT_LENGTH) {
      throw new Error(`conversation message cannot exceed ${MAX_HISTORY_CONTENT_LENGTH} characters.`);
    }
    const content = cleanText(entry.content, MAX_HISTORY_CONTENT_LENGTH);
    totalLength += content.length;
    if (!content || totalLength > MAX_TOTAL_HISTORY_LENGTH) {
      throw new Error("conversation history is empty or exceeds the allowed size.");
    }
    return { role: entry.role, content };
  });
}

function parseRegions(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 2) {
    throw new Error("selectedRegions must contain no more than two regions.");
  }
  return value.map((region) => parseRegion(region)).filter(Boolean);
}

function parseTimePeriod(value) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("timePeriod must be an object.");
  }
  const { start_year: startYear, end_year: endYear } = value;
  const maxYear = new Date().getUTCFullYear();
  if (
    !Number.isInteger(startYear) ||
    !Number.isInteger(endYear) ||
    startYear < 2005 ||
    endYear > maxYear ||
    startYear > endYear
  ) {
    throw new Error(`timePeriod years must be chronological and between 2005 and ${maxYear}.`);
  }
  return { start_year: startYear, end_year: endYear };
}

function parseRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("A JSON request body is required.");
  }
  if (typeof body.message !== "string") throw new Error("message must be text.");
  const message = cleanText(body.message, MAX_MESSAGE_LENGTH);
  if (!message) throw new Error("message cannot be empty.");
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`);
  }
  return {
    message,
    conversation: parseHistory(body.conversation),
    selectedRegion: parseRegion(body.selectedRegion),
    selectedRegions: parseRegions(body.selectedRegions),
    timePeriod: parseTimePeriod(body.timePeriod),
  };
}

export function createEcoAgentApp({
  client = null,
  model = "openai/gpt-oss-20b",
  allowedOrigins = ["http://localhost:5173"],
  runAgent = answerEcoAgent,
} = {}) {
  const app = express();
  const allowed = new Set(allowedOrigins);

  app.disable("x-powered-by");
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowed.has(origin)) return callback(null, true);
        return callback(new Error("Origin is not allowed."));
      },
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "16kb", strict: true }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: {
        error: "Eco Agent request limit reached. Please wait before trying again.",
      },
    }),
  );

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "Planet Pulse Eco Agent API" });
  });

  const chatHandler = async (request, response) => {
    let input;
    try {
      input = parseRequest(request.body);
    } catch (error) {
      return response.status(400).json({ error: error.message });
    }

    const controller = new AbortController();
    response.on("close", () => {
      if (!response.writableEnded) controller.abort();
    });

    try {
      const result = await runAgent({
        client,
        model,
        ...input,
        signal: controller.signal,
      });

      if (!response.writableEnded) response.json(result);
    } catch (error) {
      if (controller.signal.aborted) return;
      const safeError = publicGroqError(error);
      console.error("Eco Agent request failed:", error?.status || error?.name || "UnknownError");
      if (!response.writableEnded) {
        response.status(safeError.status).json({ error: safeError.message });
      }
    }
  };

  app.post(["/api/chat", "/api/eco-agent/chat"], chatHandler);

  app.use((error, _request, response, _next) => {
    if (response.headersSent) return;
    const status = error?.type === "entity.too.large" ? 413 : 400;
    response.status(status).json({
      error: status === 413 ? "Request body is too large." : "Request body must be valid JSON.",
    });
  });

  return app;
}

export { parseRequest };
