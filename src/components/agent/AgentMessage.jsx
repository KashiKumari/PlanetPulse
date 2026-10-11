import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  User,
  ChevronRight,
  CheckCircle2,
  Loader2,
  XCircle,
  Wrench,
} from "lucide-react";

const statusConfig = {
  pending: { icon: Loader2, color: "text-muted-foreground", spin: true, label: "Queued" },
  running: { icon: Loader2, color: "text-chart-2", spin: true, label: "Running" },
  in_progress: { icon: Loader2, color: "text-chart-2", spin: true, label: "In progress" },
  completed: { icon: CheckCircle2, color: "text-emerald-400", spin: false, label: "Completed" },
  success: { icon: CheckCircle2, color: "text-emerald-400", spin: false, label: "Done" },
  failed: { icon: XCircle, color: "text-destructive", spin: false, label: "Failed" },
  error: { icon: XCircle, color: "text-destructive", spin: false, label: "Error" },
};

export default function AgentMessage({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isUser ? "bg-primary/15 text-primary" : "bg-chart-2/15 text-chart-2"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`rounded-2xl px-4 py-3 max-w-[80%] ${
          isUser ? "bg-primary/15 text-foreground" : "bg-card/80 border border-border/60 text-foreground"
        }`}
      >
        {message.content &&
          (isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-invert prose-sm max-w-none [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5 [&_strong]:text-foreground">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ))}
        {Array.isArray(message.sources) && message.sources.length > 0 && (
          <details className="mt-3 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
            <summary className="cursor-pointer font-semibold">Data sources and limitations</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {message.sources.map((source, index) => (
                <li key={`${index}-${source}`} className="break-words">
                  {source}
                </li>
              ))}
            </ul>
          </details>
        )}
        {message.tool_calls?.map((tc, i) => (
          <ToolCallDisplay key={i} toolCall={tc} />
        ))}
      </div>
    </div>
  );
}

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status || "pending";
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  const projection = toolCall.display_projection || {};
  const hideDetails = projection.hide_details && projection.details_redacted;

  let parsedArgs = toolCall.arguments_string;
  try {
    parsedArgs = JSON.parse(toolCall.arguments_string);
  } catch {
    /* keep raw */
  }

  let parsedResults = toolCall.results;
  if (typeof parsedResults === "string") {
    try {
      parsedResults = JSON.parse(parsedResults);
    } catch {
      /* keep raw */
    }
  }
  const resultsStr = typeof parsedResults === "string" ? parsedResults : JSON.stringify(parsedResults ?? "");
  const isFailed =
    ["failed", "error"].includes(status) ||
    (typeof parsedResults === "object" && parsedResults?.success === false) ||
    /error|failed/i.test(resultsStr);

  const stateLabel = hideDetails
    ? ["pending", "running", "in_progress"].includes(status)
      ? projection.active_label
      : isFailed
        ? projection.error_label
        : projection.label
    : isFailed
      ? projection.error_label || config.label
      : config.label;

  return (
    <div className="mt-2 text-xs rounded-lg border border-border/40 bg-muted/30 p-2">
      <button
        onClick={() => !hideDetails && setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        {!hideDetails &&
          (expanded ? (
            <ChevronRight className="h-3 w-3 rotate-90 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          ))}
        {hideDetails && <span className="w-3 shrink-0" />}
        <Icon className={`h-3.5 w-3.5 shrink-0 ${config.spin ? "animate-spin" : ""} ${config.color}`} />
        <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground">{toolCall.name}</span>
        <span className={`ml-auto ${config.color}`}>{stateLabel || config.label}</span>
      </button>
      {expanded && !hideDetails && (
        <div className="mt-2 space-y-2 pl-5">
          {parsedArgs && (
            <div>
              <p className="text-muted-foreground mb-0.5">Parameters:</p>
              <pre className="bg-background/60 rounded p-2 overflow-x-auto text-[10px] max-h-32">
                {JSON.stringify(parsedArgs, null, 2)}
              </pre>
            </div>
          )}
          {parsedResults != null && (
            <div>
              <p className="text-muted-foreground mb-0.5">Result:</p>
              <pre className="bg-background/60 rounded p-2 overflow-x-auto text-[10px] max-h-40">
                {resultsStr.slice(0, 1000)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}