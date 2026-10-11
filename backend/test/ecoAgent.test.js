import assert from "node:assert/strict";
import { test } from "node:test";
import { answerEcoAgent, publicGroqError } from "../src/ecoAgent.js";
import { executeEcoTool, resolveRegion } from "../src/dataTools.js";

test("Eco Agent sends conversation history, runs a fixed tool call, and reports provenance", async () => {
  let requestCount = 0;
  let toolRequest;
  const client = {
    chat: {
      completions: {
        create: async ({ model, messages, max_completion_tokens: maxCompletionTokens, tools }) => {
          requestCount += 1;
          assert.equal(model, "test-model");
          assert.equal(maxCompletionTokens, 1200);
          assert.match(messages[0].content, /You are Eco Agent/);
          assert.equal(messages[1].content, "Analyze Maharashtra");
          assert.ok(messages.some((item) => item.content === "Why is the risk elevated?"));
          assert.equal(tools[0].type, "function");
          if (requestCount === 1) {
            assert.equal(messages.at(-1).content, "Why is the risk elevated?");
            return {
              choices: [{
                message: {
                  role: "assistant",
                  content: null,
                  tool_calls: [{
                    id: "risk-call",
                    type: "function",
                    function: {
                      name: "get_environmental_risk",
                      arguments: JSON.stringify({ region: "Maharashtra" }),
                    },
                  }],
                },
              }],
            };
          }
          assert.equal(messages.at(-1).role, "tool");
          assert.equal(messages.at(-1).tool_call_id, "risk-call");
          return {
            choices: [{
              message: {
                role: "assistant",
                content: "This is a prototype risk calculation, not a validated index.",
              },
            }],
          };
        },
      },
    },
  };

  const result = await answerEcoAgent({
    client,
    model: "test-model",
    message: "Why is the risk elevated?",
    conversation: [{ role: "user", content: "Analyze Maharashtra" }],
    selectedRegion: { name: "Maharashtra", lat: 19, lng: 76 },
    runTool: async (name, args) => {
      toolRequest = { name, args };
      return {
        status: "available",
        source: "Generated prototype risk-engine calculation",
      };
    },
  });

  assert.equal(requestCount, 2);
  assert.equal(toolRequest.name, "get_environmental_risk");
  assert.equal(toolRequest.args.region, "Maharashtra");
  assert.equal(result.model, "test-model");
  assert.match(result.answer, /prototype risk calculation/i);
  assert.ok(result.sources.some((source) => /prototype/i.test(source)));
});

test("tool region lookup validates coordinates and does not invent unavailable regions", async () => {
  assert.equal(resolveRegion("Punjab", null).name, "Punjab");
  assert.throws(() => resolveRegion("Atlantis", null), /not available in Planet Pulse/);
  assert.throws(
    () => resolveRegion("current", { name: "Selected", lat: 91, lng: 0 }),
    /valid region with latitude and longitude/,
  );
  const result = await executeEcoTool(
    "get_environmental_history",
    { region: "Maharashtra", start_year: 2006, end_year: 2026 },
    null,
  );
  assert.equal(result.status, "available");
  assert.equal(result.history[0].year, 2006);
  assert.equal(result.history.at(-1).year, 2026);
  assert.match(result.source, /generated/i);
});

test("missing Groq configuration returns a clear setup explanation", async () => {
  await assert.rejects(
    answerEcoAgent({
      client: null,
      model: "openai/gpt-oss-20b",
      message: "Hello",
      conversation: [],
    }),
    (error) => error.status === 503 && /GROQ_API_KEY/.test(error.message),
  );
});

test("Groq provider failures are translated into distinct safe user messages", () => {
  assert.deepEqual(publicGroqError({ status: 401 }), {
    status: 503,
    message: "Groq rejected the backend credentials. Check that GROQ_API_KEY is valid and enabled.",
  });
  assert.match(
    publicGroqError({ status: 400, code: "model_not_found" }).message,
    /GROQ_MODEL is unavailable/,
  );
  assert.match(
    publicGroqError({ status: 404 }).message,
    /GROQ_MODEL is unavailable/,
  );
  assert.match(
    publicGroqError({ status: 429, code: "insufficient_quota" }).message,
    /quota or billing limit/,
  );
  assert.match(
    publicGroqError({ status: 429, message: "Requests per day limit reached" }).message,
    /quota or billing limit/,
  );
  assert.match(
    publicGroqError({ status: 429, code: "rate_limit_exceeded" }).message,
    /rate limited/,
  );
  assert.match(
    publicGroqError({ name: "APIConnectionError" }).message,
    /could not connect/,
  );
  assert.match(
    publicGroqError({ name: "APIConnectionTimeoutError" }).message,
    /timed out/,
  );
  assert.match(
    publicGroqError({ status: 503 }).message,
    /temporarily unavailable/,
  );
  assert.doesNotMatch(
    publicGroqError({ status: 500, message: "Provider private details" }).message,
    /Provider private details/,
  );
});
