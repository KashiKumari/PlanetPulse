import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createEcoAgentApp, parseRequest } from "../src/app.js";

const servers = [];

async function start(app) {
  const server = app.listen(0);
  servers.push(server);
  await new Promise((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

after(async () => {
  await Promise.all(
    servers.map(
      (server) =>
        new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

test("validates message length, history, selected regions, and period", () => {
  const parsed = parseRequest({
    message: "Summarize the latest data",
    conversation: [{ role: "user", content: "What about rainfall?" }],
    selectedRegion: { name: "Punjab", lat: 31, lng: 75 },
    selectedRegions: [
      { name: "Punjab", lat: 31, lng: 75 },
      { name: "Rajasthan", lat: 27, lng: 73 },
    ],
    timePeriod: { start_year: 2006, end_year: 2026 },
  });
  assert.equal(parsed.selectedRegion.name, "Punjab");
  assert.equal(parsed.selectedRegions.length, 2);
  assert.deepEqual(parsed.timePeriod, { start_year: 2006, end_year: 2026 });
  assert.throws(() => parseRequest({ message: "x".repeat(2001) }), /cannot exceed 2000/);
  assert.throws(
    () => parseRequest({ message: "hi", selectedRegion: { name: "Nowhere", lat: 95, lng: 0 } }),
    /valid latitude and longitude/,
  );
  assert.throws(
    () => parseRequest({ message: "hi", selectedRegion: { name: "Empty", lat: "", lng: "" } }),
    /valid latitude and longitude/,
  );
  assert.throws(
    () => parseRequest({ message: "hi", conversation: Array(13).fill({ role: "user", content: "x" }) }),
    /no more than 12 messages/,
  );
});

test("/api/chat explains missing server credentials without exposing internals", async () => {
  const app = createEcoAgentApp({ client: null });
  const baseUrl = await start(app);
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Explain NDVI" }),
  });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Set GROQ_API_KEY/);
});

test("chat endpoint returns mock-backed answers and safe validation errors", async () => {
  const app = createEcoAgentApp({
    client: {},
    runAgent: async ({ message, selectedRegion }) => ({
      answer: `${message} — ${selectedRegion.name}`,
      model: "mock-model",
      sources: ["NASA POWER"],
    }),
  });
  const baseUrl = await start(app);

  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "ok");

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Latest climate?",
      selectedRegion: { name: "Punjab", lat: 31, lng: 75 },
    }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    answer: "Latest climate? — Punjab",
    model: "mock-model",
    sources: ["NASA POWER"],
  });

  const invalid = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "" }),
  });
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json()).error, /cannot be empty/);
});

test("chat endpoint returns a safe error when Groq quota is exhausted", async () => {
  const app = createEcoAgentApp({
    client: {},
    runAgent: async () => {
      const error = new Error("Provider details must not be returned to the browser.");
      error.status = 429;
      error.code = "insufficient_quota";
      throw error;
    },
  });
  const baseUrl = await start(app);
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Explain NDVI" }),
  });
  const result = await response.json();

  assert.equal(response.status, 429);
  assert.match(result.error, /quota or billing limit/);
  assert.doesNotMatch(result.error, /Provider details/);
});

test("rejects browser origins not explicitly allowed", async () => {
  const app = createEcoAgentApp({ client: {}, allowedOrigins: ["http://localhost:5173"] });
  const baseUrl = await start(app);
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "hello" }),
  });
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});
