const ECO_AGENT_API_URL = (import.meta.env.VITE_ECO_AGENT_API_URL || "").replace(/\/+$/, "");
const CHAT_ENDPOINT = ECO_AGENT_API_URL ? `${ECO_AGENT_API_URL}/api/chat` : "/api/chat";

export async function sendEcoAgentMessage(payload, signal) {
  let response;
  try {
    response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error(
      "Eco Agent API is unreachable. Check the backend URL and connection, then retry.",
      { cause: error },
    );
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`Eco Agent API returned an invalid response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(result?.error || `Eco Agent API returned HTTP ${response.status}.`);
  }
  if (typeof result?.answer !== "string" || !result.answer.trim()) {
    throw new Error("Eco Agent API returned no answer.");
  }
  return result;
}
