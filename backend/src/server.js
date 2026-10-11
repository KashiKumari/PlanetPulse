import dotenv from "dotenv";
import Groq from "groq-sdk";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createEcoAgentApp } from "./app.js";

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

const port = Number.parseInt(process.env.PORT || "3001", 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const apiKey = process.env.GROQ_API_KEY?.trim();
const client = apiKey
  ? new Groq({
      apiKey,
      timeout: 45000,
      maxRetries: 0,
    })
  : null;
const model = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";
const allowedOrigins = new Set((process.env.FRONTEND_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean));
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://localhost:5174");
}

if (!client) {
  console.warn("GROQ_API_KEY is not configured; Eco Agent requests will return a setup error.");
}

createEcoAgentApp({ client, model, allowedOrigins: [...allowedOrigins] }).listen(port, "0.0.0.0", () => {
  console.log(`Planet Pulse Eco Agent API listening on 0.0.0.0:${port}.`);
});
