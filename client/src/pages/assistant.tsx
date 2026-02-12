import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Plus, Send, Bot, User, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AssistantThread, AssistantMessage } from "@shared/schema";

function formatMessageContent(content: string) {
  const parts: Array<{ type: "text" | "code"; value: string }> = [];
  const codeBlockRegex = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    const code = match[0].replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
    parts.push({ type: "code", value: code });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts.map((part, i) => {
    if (part.type === "code") {
      return (
        <pre key={i} className="bg-muted rounded-md p-3 my-2 overflow-x-auto">
          <code className="text-sm font-mono">{part.value}</code>
        </pre>
      );
    }

    const inlineCodeRegex = /`([^`]+)`/g;
    const textParts: Array<string | JSX.Element> = [];
    let textLastIndex = 0;
    let inlineMatch;

    while ((inlineMatch = inlineCodeRegex.exec(part.value)) !== null) {
      if (inlineMatch.index > textLastIndex) {
        textParts.push(part.value.slice(textLastIndex, inlineMatch.index));
      }
      textParts.push(
        <code key={`inline-${i}-${inlineMatch.index}`} className="bg-muted rounded px-1 py-0.5 text-sm font-mono">
          {inlineMatch[1]}
        </code>
      );
      textLastIndex = inlineMatch.index + inlineMatch[0].length;
    }

    if (textLastIndex < part.value.length) {
      textParts.push(part.value.slice(textLastIndex));
    }

    return (
      <span key={i} className="whitespace-pre-wrap">
        {textParts}
      </span>
    );
  });
}

export default function AssistantPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: threads, isLoading: threadsLoading } = useQuery<AssistantThread[]>({
    queryKey: ["/api/assistant/threads"],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<AssistantMessage[]>({
    queryKey: ["/api/assistant/threads", selectedThreadId, "messages"],
    enabled: !!selectedThreadId,
  });

  const createThreadMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/assistant/threads", { title });
      return res.json();
    },
    onSuccess: (thread: AssistantThread) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/threads"] });
      setSelectedThreadId(thread.id);
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return;

    let threadId = selectedThreadId;

    if (!threadId) {
      const thread = await createThreadMutation.mutateAsync(
        inputValue.trim().slice(0, 50)
      );
      threadId = thread.id;
    }

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsStreaming(true);
    setStreamingContent("");

    queryClient.setQueryData<AssistantMessage[]>(
      ["/api/assistant/threads", threadId, "messages"],
      (old) => [
        ...(old || []),
        {
          id: `temp-${Date.now()}`,
          threadId: threadId!,
          role: "user",
          content: userMessage,
          circuitIds: null,
          createdAt: new Date(),
        },
      ]
    );

    try {
      const response = await fetch(
        `/api/assistant/threads/${threadId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: userMessage }),
          credentials: "include",
        }
      );

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.content) {
                assistantMessage += data.content;
                setStreamingContent(assistantMessage);
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      }

      queryClient.invalidateQueries({
        queryKey: ["/api/assistant/threads", threadId, "messages"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/assistant/threads"],
      });
    } catch {
      // error handled silently
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full" data-testid="page-assistant">
      <div className="w-[260px] border-r flex flex-col shrink-0">
        <div className="p-3">
          <Button
            className="w-full"
            onClick={() => {
              setSelectedThreadId(null);
              setInputValue("");
            }}
            data-testid="button-new-chat"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-2 pb-2 space-y-1">
            {threadsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-14 w-full"
                  data-testid={`skeleton-thread-${i}`}
                />
              ))
            ) : threads && threads.length > 0 ? (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full text-left rounded-md p-2 transition-colors hover-elevate ${
                    selectedThreadId === thread.id
                      ? "bg-accent"
                      : ""
                  }`}
                  data-testid={`button-thread-${thread.id}`}
                >
                  <p
                    className="text-sm font-medium truncate"
                    data-testid={`text-thread-title-${thread.id}`}
                  >
                    {thread.title}
                  </p>
                  <p
                    className="text-xs text-muted-foreground"
                    data-testid={`text-thread-date-${thread.id}`}
                  >
                    {formatDistanceToNow(new Date(thread.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="text-no-threads"
                >
                  No conversations yet
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto p-4 space-y-4">
            {selectedThreadId && messagesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-16 w-full"
                  data-testid={`skeleton-message-${i}`}
                />
              ))
            ) : messages && messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                  data-testid={`message-${msg.id}`}
                >
                  <div
                    className={`max-w-[80%] rounded-md p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Bot className="w-4 h-4" />
                        <span
                          className="text-xs font-semibold"
                          data-testid={`text-bot-label-${msg.id}`}
                        >
                          QuantumBot
                        </span>
                      </div>
                    )}
                    <div
                      className="text-sm"
                      data-testid={`text-message-content-${msg.id}`}
                    >
                      {formatMessageContent(msg.content)}
                    </div>
                  </div>
                </div>
              ))
            ) : !selectedThreadId ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                <h2
                  className="text-xl font-semibold mb-1"
                  data-testid="text-welcome-title"
                >
                  Quantum Computing Assistant
                </h2>
                <p
                  className="text-muted-foreground text-center max-w-md"
                  data-testid="text-welcome-subtitle"
                >
                  Ask questions about quantum circuits, algorithms,
                  error correction, and more.
                </p>
              </div>
            ) : null}

            {isStreaming && streamingContent && (
              <div
                className="flex justify-start"
                data-testid="message-streaming"
              >
                <div className="max-w-[80%] rounded-md p-3 bg-muted">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Bot className="w-4 h-4" />
                    <span className="text-xs font-semibold">QuantumBot</span>
                  </div>
                  <div className="text-sm" data-testid="text-streaming-content">
                    {formatMessageContent(streamingContent)}
                    <span className="inline-block w-2 h-4 bg-foreground/70 animate-pulse ml-0.5 align-middle" />
                  </div>
                </div>
              </div>
            )}

            {isStreaming && !streamingContent && (
              <div className="flex justify-start" data-testid="message-loading">
                <div className="max-w-[80%] rounded-md p-3 bg-muted">
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-4 h-4" />
                    <span className="text-xs font-semibold">QuantumBot</span>
                    <Loader2 className="w-3 h-3 animate-spin ml-1" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about quantum computing..."
              className="resize-none min-h-[44px] max-h-[160px]"
              rows={1}
              disabled={isStreaming}
              data-testid="input-message"
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isStreaming}
              data-testid="button-send"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
