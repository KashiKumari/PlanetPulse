import { ECO_TOOLS, executeEcoTool } from "./dataTools.js";
import { ECO_AGENT_SYSTEM_PROMPT } from "./systemPrompt.js";

const MAX_TOOL_CALLS = 4;
const MAX_TOOL_ROUNDS = 2;
const MAX_REPLY_TOKENS = 1200;

function contextSummary(region, regions, timePeriod) {
  const parts = [];
  const activeRegions = regions.length ? regions : region ? [region] : [];
  if (activeRegions.length) {
    parts.push(
      `Selected region context: ${activeRegions
        .map((item) => `${item.name || "Unnamed region"} (${item.lat}, ${item.lng})`)
        .join("; ")}.`,
    );
  }
  if (timePeriod) {
    parts.push(
      `Selected comparison period: ${timePeriod.start_year}–${timePeriod.end_year}.`,
    );
  }
  return parts.length ? parts.join(" ") : "No region or period is currently selected.";
}

function safeToolError(error) {
  return { status: "unavailable", reason: error.message || "Planet Pulse data could not be retrieved." };
}

function collectSources(value, sources = new Set(), depth = 0) {
  if (!value || typeof value !== "object" || depth > 4) return sources;
  const sourceKeys = new Set(["source", "source_url", "disclaimer", "statistic_source"]);
  for (const [key, item] of Object.entries(value)) {
    if (sourceKeys.has(key) && typeof item === "string" && item.trim()) {
      sources.add(item.trim());
    } else if (typeof item === "object" && item !== null) {
      collectSources(item, sources, depth + 1);
    }
  }
  return sources;
}

export async function answerEcoAgent({
  client,
  model,
  message,
  conversation,
  selectedRegion,
  selectedRegions = [],
  timePeriod,
  signal,
  runTool = executeEcoTool,
}) {
  if (!client) {
    const error = new Error(
      "Eco Agent is not configured. Set GROQ_API_KEY in the backend environment and restart the API.",
    );
    error.status = 503;
    throw error;
  }

  const messages = [
    {
      role: "system",
      content: [
        ECO_AGENT_SYSTEM_PROMPT,
        contextSummary(selectedRegion, selectedRegions, timePeriod),
      ].join("\n\n"),
    },
    ...conversation.map(({ role, content }) => ({
      role,
      content,
    })),
    { role: "user", content: message },
  ];
  let toolCallCount = 0;
  const dataSources = new Set();

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const response = await client.chat.completions.create(
      {
        model,
        messages,
        tools: ECO_TOOLS,
        tool_choice: "auto",
        temperature: 0.2,
        max_completion_tokens: MAX_REPLY_TOKENS,
      },
      { signal },
    );
    const assistantMessage = response?.choices?.[0]?.message;
    if (!assistantMessage) {
      throw new Error("Groq returned an empty response.");
    }
    const toolCalls = assistantMessage.tool_calls || [];
    if (!toolCalls.length) {
      const answer = assistantMessage.content;
      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("Groq returned no assistant text.");
      }
      return {
        answer: answer.trim(),
        model,
        sources: [...dataSources].slice(0, 8),
      };
    }

    if (round === MAX_TOOL_ROUNDS || toolCallCount + toolCalls.length > MAX_TOOL_CALLS) {
      throw new Error("Eco Agent reached its data-tool limit before completing the answer.");
    }

    toolCallCount += toolCalls.length;
    messages.push(assistantMessage);
    for (const toolCall of toolCalls) {
      let result;
      try {
        if (
          toolCall.type !== "function" ||
          typeof toolCall.id !== "string" ||
          typeof toolCall.function?.name !== "string"
        ) {
          throw new Error("Groq returned an unsupported tool request.");
        }
        const args = JSON.parse(toolCall.function.arguments || "{}");
        result = await runTool(
          toolCall.function.name,
          args,
          selectedRegion || selectedRegions[0] || null,
          signal,
          selectedRegions,
          timePeriod,
        );
      } catch (error) {
        result = safeToolError(error);
      }
      collectSources(result, dataSources);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        ...(typeof toolCall.function?.name === "string"
          ? { name: toolCall.function.name }
          : {}),
        content: JSON.stringify(result),
      });
    }
  }

  throw new Error("Eco Agent could not complete the response.");
}

export function publicGroqError(error) {
  if (error?.name === "AbortError") {
    return { status: 499, message: "The request was cancelled." };
  }
  const code = String(error?.code || error?.error?.code || "").toLowerCase();
  const providerMessage = [
    error?.message,
    error?.error?.message,
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
  const status = error?.status || error?.statusCode;
  if (
    status === 503 &&
    typeof error?.message === "string" &&
    error.message.startsWith("Eco Agent is not configured.")
  ) {
    return { status: 503, message: error.message };
  }
  const modelUnavailable =
    status === 404 ||
    code.includes("model_not_found") ||
    code.includes("model_decommissioned") ||
    /model.{0,50}(does not exist|not found|unsupported|not available|no access)/i.test(
      providerMessage,
    );
  if (modelUnavailable) {
    return {
      status: 400,
      message:
        "The configured GROQ_MODEL is unavailable to this Groq account. Check the model ID and your account's available models.",
    };
  }
  const quotaOrBilling =
    status === 402 ||
    /insufficient_quota|billing|quota|spend_limit/.test(code) ||
    /quota|billing|usage limit|credits exhausted|payment required|spend limit|requests? per day|tokens? per day|\b(?:rpd|tpd)\b|daily (?:request|token|usage|quota)? ?limit/i.test(
      providerMessage,
    );
  if (quotaOrBilling) {
    return {
      status: 429,
      message:
        "The Groq account has reached its available quota or billing limit. Check Groq usage and billing settings.",
    };
  }
  if ([401, 403].includes(status)) {
    return {
      status: 503,
      message:
        "Groq rejected the backend credentials. Check that GROQ_API_KEY is valid and enabled.",
    };
  }
  if (status === 429) {
    return {
      status: 429,
      message: "Eco Agent is temporarily rate limited by Groq. Please wait before trying again.",
    };
  }
  const networkCode = String(error?.cause?.code || error?.code || "").toUpperCase();
  if (
    error?.name === "APIConnectionTimeoutError" ||
    error?.name === "TimeoutError" ||
    ["ETIMEDOUT", "ESOCKETTIMEDOUT"].includes(networkCode)
  ) {
    return {
      status: 504,
      message: "Eco Agent timed out while contacting Groq. Please try again later.",
    };
  }
  if (
    error?.name === "APIConnectionError" ||
    ["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN"].includes(networkCode)
  ) {
    return {
      status: 502,
      message: "Eco Agent could not connect to Groq. Check the network connection and try again.",
    };
  }
  if (Number.isInteger(status) && status >= 500) {
    return {
      status: 502,
      message: "Groq is temporarily unavailable. Please try again later.",
    };
  }
  if (status === 400) {
    return {
      status: 502,
      message: "Groq rejected the request. Check the model and backend request configuration.",
    };
  }
  return { status: 502, message: "Eco Agent could not complete this request. Please try again." };
}
