import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bot, Loader2, MapPin, Plus, Send, Sparkles, Square, X } from "lucide-react";
import AgentMessage from "@/components/agent/AgentMessage";
import { allRegions } from "@/data/allRegions";
import { sendEcoAgentMessage } from "@/services/ecoAgentApi";

const STORAGE_KEY = "planetpulse-eco-agent-messages-v2";
const MAX_STORED_MESSAGES = 60;
const MAX_CONVERSATION_MESSAGES = 12;
const suggestedQuestions = [
  "Analyze my selected region",
  "Explain historical greenery change",
  "Compare two regions",
  "Explain the risk score",
  "Summarize the latest available environmental data",
  "Explain the forecast",
];

function readSavedMessages() {
  try {
    const messages = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(messages)
      ? messages
          .filter(
            (message) =>
              ["user", "assistant"].includes(message?.role) &&
              typeof message.content === "string",
          )
          .slice(-MAX_STORED_MESSAGES)
      : [];
  } catch (error) {
    console.error("Could not restore Eco Agent chat history:", error);
    return [];
  }
}

function routeRegion(params, prefix = "") {
  const name = params.get(`${prefix}name`);
  const rawLat = params.get(`${prefix}lat`);
  const rawLng = params.get(`${prefix}lng`);
  if (rawLat == null || rawLng == null) return null;

  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { name: name || "Selected region", lat, lng };
}

function routeContext(params) {
  const region = routeRegion(params);
  const regionA = routeRegion(params, "region_a_");
  const regionB = routeRegion(params, "region_b_");
  const selectedRegions = [regionA, regionB].filter(Boolean);
  const rawStartYear = Number(params.get("start_year"));
  const rawEndYear = Number(params.get("end_year"));
  const maxYear = new Date().getUTCFullYear();
  const timePeriod =
    Number.isInteger(rawStartYear) &&
    Number.isInteger(rawEndYear) &&
    rawStartYear >= 2005 &&
    rawEndYear <= maxYear &&
    rawStartYear <= rawEndYear
      ? { start_year: rawStartYear, end_year: rawEndYear }
      : null;

  return {
    region: region || selectedRegions[0] || null,
    regions: selectedRegions.length ? selectedRegions : region ? [region] : [],
    timePeriod,
  };
}

export default function EcoAnalystChat() {
  const [searchParams] = useSearchParams();
  const routeKey = searchParams.toString();
  const initialContext = useMemo(
    () => routeContext(new URLSearchParams(routeKey)),
    [routeKey],
  );
  const [messages, setMessages] = useState(readSavedMessages);
  const [input, setInput] = useState("");
  const [selectedRegion, setSelectedRegion] = useState(initialContext.region);
  const [selectedRegions, setSelectedRegions] = useState(initialContext.regions);
  const [requestedComparison, setRequestedComparison] = useState(false);
  const [timePeriod, setTimePeriod] = useState(initialContext.timePeriod);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const scrollRef = useRef(null);
  const controllerRef = useRef(null);

  useEffect(() => {
    setSelectedRegion(initialContext.region);
    setSelectedRegions(initialContext.regions);
    setTimePeriod(initialContext.timePeriod);
  }, [initialContext]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)),
      );
    } catch (error) {
      console.error("Could not save Eco Agent chat history:", error);
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, requestError]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const sendMessage = async (text, { appendUser = true } = {}) => {
    const question = text.trim();
    if (!question || loading) return;

    const mentionedRegions = allRegions
      .filter((region) => question.toLowerCase().includes(region.name.toLowerCase()))
      .sort((a, b) => b.name.length - a.name.length)
      .slice(0, 2);
    const requestRegions = mentionedRegions.length
      ? mentionedRegions
      : selectedRegions;
    const comparisonIntent = /\b(compare|versus|vs\.?|against)\b/i.test(question);
    const requestRegion = mentionedRegions[0] || selectedRegion;
    if (mentionedRegions.length > 1 || (mentionedRegions.length === 1 && !comparisonIntent)) {
      setSelectedRegions(mentionedRegions);
      setSelectedRegion(mentionedRegions[0]);
    }
    setRequestedComparison(comparisonIntent && requestRegions.length > 1);

    const baseMessages =
      appendUser || messages.at(-1)?.role !== "user" ? messages : messages.slice(0, -1);
    const conversation = baseMessages
      .filter(
        (message) =>
          ["user", "assistant"].includes(message.role) &&
          typeof message.content === "string" &&
          !message.error,
      )
      .slice(-MAX_CONVERSATION_MESSAGES)
      .map(({ role, content }) => ({ role, content }));

    if (appendUser) {
      setInput("");
      setMessages((previous) => [
        ...previous,
        { role: "user", content: question },
      ]);
    }
    setRequestError(null);
    setLoading(true);
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const result = await sendEcoAgentMessage(
        {
          message: question,
          conversation,
          selectedRegion: requestRegion,
          selectedRegions: requestRegions,
          timePeriod,
        },
        controller.signal,
      );
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: result.answer,
          sources: Array.isArray(result.sources) ? result.sources : [],
          model: result.model,
        },
      ]);
    } catch (error) {
      if (error.name !== "AbortError") {
        setRequestError(error.message || "Eco Agent could not answer. Please try again.");
      } else {
        setRequestError("Request cancelled.");
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setLoading(false);
      }
    }
  };

  const changeRegion = (id) => {
    if (id === "__selected__") {
      setSelectedRegions(selectedRegion ? [selectedRegion] : []);
      return;
    }
    const region = allRegions.find((item) => item.id === id) || null;
    setSelectedRegion(region);
    setSelectedRegions(region ? [region] : []);
    setRequestError(null);
  };

  const newConversation = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setLoading(false);
    setMessages([]);
    setRequestError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Could not clear Eco Agent chat history:", error);
    }
  };

  const retryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (lastUserMessage) sendMessage(lastUserMessage.content, { appendUser: false });
  };

  const regionLabel =
    selectedRegions.length > 1
      ? selectedRegions.map((region) => region.name).join(" and ")
      : selectedRegion?.name || "No region selected";
  const compareMode = selectedRegions.length > 1 || requestedComparison;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="font-display text-3xl font-bold tracking-tight">Eco Agent</h1>
          </div>
          <p className="text-muted-foreground">
            Environmental answers grounded in Planet Pulse data and its stated limitations.
          </p>
        </div>
        <button
          type="button"
          onClick={newConversation}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
        >
          <Plus className="h-4 w-4" /> New Chat
        </button>
      </div>

      <div className="mb-3 flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="shrink-0 text-muted-foreground">Region</span>
          {compareMode ? (
            <span className="truncate font-medium">{regionLabel}</span>
          ) : (
            <select
              aria-label="Select Eco Agent region"
              value={
                allRegions.some((region) => region.id === selectedRegion?.id)
                  ? selectedRegion.id
                  : selectedRegion
                    ? "__selected__"
                    : ""
              }
              onChange={(event) => changeRegion(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-border bg-background/70 px-2 py-1.5 text-sm text-foreground"
            >
              <option value="">No region selected</option>
              {selectedRegion &&
                !allRegions.some((region) => region.id === selectedRegion.id) && (
                  <option value="__selected__">{selectedRegion.name}</option>
                )}
              {allRegions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {timePeriod && (
          <p className="text-xs text-muted-foreground sm:ml-auto">
            Period context: {timePeriod.start_year}–{timePeriod.end_year}
          </p>
        )}
        {compareMode && (
          <button
            type="button"
            onClick={() => changeRegion("")}
            className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground sm:ml-auto"
          >
            <X className="h-3.5 w-3.5" /> Clear comparison
          </button>
        )}
      </div>

      <div className="flex h-[55vh] flex-col rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="py-8 text-center">
              <Bot className="mx-auto mb-3 h-10 w-10 text-chart-2/50" />
              <p className="mb-4 text-sm text-muted-foreground">
                Ask about Planet Pulse measurements, history, forecasts, or general environmental science.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => sendMessage(question)}
                    disabled={loading}
                    className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:opacity-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <AgentMessage key={`${index}-${message.role}`} message={message} />
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chart-2/15 text-chart-2">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/80 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Retrieving relevant Planet Pulse data…
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="border-t border-border/60 p-4">
          {requestError && (
            <div
              role="alert"
              className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <span>{requestError}</span>
              {!loading && messages.some((message) => message.role === "user") && (
                <button
                  type="button"
                  onClick={retryLastMessage}
                  className="font-semibold underline underline-offset-2"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about environmental data or science…"
              aria-label="Message Eco Agent"
              maxLength={2000}
              className="flex-1 rounded-lg border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {loading ? (
              <button
                type="button"
                onClick={() => controllerRef.current?.abort()}
                aria-label="Stop response"
                className="rounded-lg border border-border px-4 py-2.5 text-muted-foreground hover:bg-muted/50"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </form>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Conversation history is stored only in this browser. Current context: {regionLabel}.
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground/60">
        NASA POWER climate data is live; greenery history, NDVI values, forecasts, and risk scores are clearly labeled prototype data where applicable.
      </p>
    </div>
  );
}
