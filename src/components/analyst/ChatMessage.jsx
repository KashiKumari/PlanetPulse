import ReactMarkdown from "react-markdown";
import { Bot, User } from "lucide-react";

export default function ChatMessage({ role, content }) {
  const isUser = role === "user";

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
          isUser
            ? "bg-primary/15 text-foreground"
            : "bg-card/80 border border-border/60 text-foreground"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="text-sm prose prose-invert prose-sm max-w-none [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5 [&_strong]:text-foreground">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}