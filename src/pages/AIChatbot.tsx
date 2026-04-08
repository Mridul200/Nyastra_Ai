import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Bot, User, Loader2, Plus, History, MessageSquare,
  Copy, Check, Globe, ChevronDown, Wifi, WifiOff, Paperclip
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/config";


type Message = { role: "user" | "assistant"; content: string; attachment?: { name: string; url: string; type: string } };
type ChatSession = { id: string; title: string; updatedAt: number; messages: Message[] };
type ProviderHealth = { groq: boolean; gemini: boolean; openai: boolean; claude: boolean };

const PROVIDERS = [
  { id: "groq",   label: "Groq (Llama 3.3)",  badge: "FREE" },
  { id: "gemini", label: "Google Gemini",       badge: "FREE" },
  { id: "openai", label: "OpenAI GPT-4o",       badge: "PAID" },
  { id: "claude", label: "Anthropic Claude",    badge: "PAID" },
];

const SUGGESTIONS = [
  "Which IPC sections apply in a dowry harassment case?",
  "What arguments support a bail application under CrPC 439?",
  "Explain the Basic Structure Doctrine with case laws.",
  "What is the legal procedure to file a consumer complaint?",
  "Can an FIR be quashed under Article 226? What are the grounds?",
  "Difference between cognizable and non-cognizable offences.",
];

export default function AIChatbot() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("groq");
  const [activeProvider, setActiveProvider] = useState("GROQ");
  const [health, setHealth] = useState<ProviderHealth | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [attachment, setAttachment] = useState<{name: string, type: string, data: string} | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Load chat history ─────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("legal_chat_history");
    if (saved) {
      try { setSessions(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("legal_chat_history", JSON.stringify(sessions));
  }, [sessions]);

  // ── Health check on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);

        if (res.ok) {
          const data = await res.json();
          setHealth(data.providers);
          // Auto-select best available provider
          const priority = ["groq", "gemini", "openai", "claude"];
          const best = priority.find(p => data.providers[p]);
          if (best) {
            setSelectedProvider(best);
            setActiveProvider(best.toUpperCase());
          }
        }
      } catch {
        setHealth(null); // backend offline
      }
    };
    checkHealth();
  }, []);

  // ── Session management ────────────────────────────────────────────────────
  const saveSession = useCallback((sessionId: string, title: string, finalMessages: Message[]) => {
    setSessions(prev => {
      const exists = prev.find(s => s.id === sessionId);
      const now = Date.now();
      if (exists) {
        return prev
          .map(s => s.id === sessionId ? { ...s, messages: finalMessages, updatedAt: now } : s)
          .sort((a, b) => b.updatedAt - a.updatedAt);
      }
      return [{ id: sessionId, title, updatedAt: now, messages: finalMessages }, ...prev]
        .sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, []);

  // ── Copy message ──────────────────────────────────────────────────────────
  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || isLoading) return;

    const userMsg: Message = { 
      role: "user", 
      content: msg,
      attachment: attachment ? { name: attachment.name, url: attachment.data, type: attachment.type } : undefined
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    // We already have attachment cleaning later in handleSend
    setIsLoading(true);
    setActiveProvider("Analyzing...");

    let activeSessionId = currentSessionId;
    let title = "";

    if (!activeSessionId) {
      activeSessionId = crypto.randomUUID();
      setCurrentSessionId(activeSessionId);
      title = msg.slice(0, 40) + (msg.length > 40 ? "..." : "");
      saveSession(activeSessionId, title, updatedMessages);
    } else {
      const activeSession = sessions.find(s => s.id === activeSessionId);
      title = activeSession?.title || "Chat Session";
      saveSession(activeSessionId, title, updatedMessages);
    }

    let assistantContent = "";

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          provider: selectedProvider,
          use_rag: true,
          use_search: useWebSearch,
          attachment_base64: attachment?.data || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Request failed (${response.status})`);
      }

      setAttachment(null); // Clear attachment on successful send

      const data = await response.json();
      assistantContent = data.response;
      setActiveProvider(data.provider.toUpperCase());
      setMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
      const finalMsgs: Message[] = [...updatedMessages, { role: "assistant", content: assistantContent }];
      saveSession(activeSessionId!, title, finalMsgs);

    } catch (err: any) {
      toast.error(err.message || "Failed to reach Nyastra AI backend.");
      setActiveProvider(selectedProvider.toUpperCase());
      setMessages(updatedMessages);
      saveSession(activeSessionId!, title, updatedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setIsSheetOpen(false);
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const selectedProviderLabel = PROVIDERS.find(p => p.id === selectedProvider)?.label ?? "Select Provider";

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl flex flex-col" style={{ height: "calc(100vh - 5rem)" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        {/* History sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" title="Chat History">
              <History className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] sm:w-[380px] flex flex-col">
            <SheetHeader>
              <SheetTitle>Chat History</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto mt-6 space-y-2 pr-2">
              {sessions.filter(s => s.messages.length > 0).map(s => (
                <Button
                  key={s.id}
                  variant={s.id === currentSessionId ? "secondary" : "ghost"}
                  className="w-full justify-start text-left truncate font-normal"
                  onClick={() => loadSession(s)}
                >
                  <MessageSquare className="w-4 h-4 mr-3 shrink-0 opacity-70" />
                  <span className="truncate">{s.title}</span>
                </Button>
              ))}
              {sessions.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed rounded-lg mt-4">
                  <MessageSquare className="w-8 h-8 mb-4 opacity-50" />
                  <p className="text-sm">No saved conversations yet.</p>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Title + controls */}
        <div className="text-center flex-1 mx-4">
          <h1 className="font-display text-2xl font-bold inline-flex items-center gap-2">
            AI <span className="text-gradient">Chatbot</span>
            <Badge variant="outline" className="ml-1 text-[10px] py-0 h-5 border-primary/20 bg-primary/5 text-primary uppercase tracking-wider font-bold">
              {activeProvider}
            </Badge>
            {/* Backend status dot */}
            {health !== null ? (
              <span title="Backend online" className="inline-flex items-center gap-1 text-xs text-emerald-400">
                <Wifi className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span title="Backend offline" className="inline-flex items-center gap-1 text-xs text-red-400">
                <WifiOff className="w-3.5 h-3.5" />
              </span>
            )}
          </h1>

          <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
            {/* Provider selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border">
                  {selectedProviderLabel} <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-52">
                {PROVIDERS.map(p => {
                  const isAvailable = health ? (health as any)[p.id] : null;
                  return (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => setSelectedProvider(p.id)}
                      className={`flex items-center justify-between ${selectedProvider === p.id ? "bg-primary/10" : ""}`}
                    >
                      <span>{p.label}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] py-0 h-4">{p.badge}</Badge>
                        {isAvailable !== null && (
                          <span className={`w-2 h-2 rounded-full ${isAvailable ? "bg-emerald-400" : "bg-red-400"}`} />
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Web search toggle */}
            <div className="flex items-center space-x-2">
              <Switch id="web-search" checked={useWebSearch} onCheckedChange={setUseWebSearch} />
              <Label htmlFor="web-search" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                <Globe className="w-3 h-3" /> Web Search
              </Label>
            </div>
          </div>
        </div>

        <Button variant="default" size="sm" onClick={startNewChat} disabled={isLoading}>
          <Plus className="w-4 h-4 mr-0 sm:mr-2" />
          <span className="hidden sm:inline">New Chat</span>
        </Button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
            <p className="text-muted-foreground mb-8 text-sm">
              Ask any legal question. I will respond with the structured analysis of a Senior Advocate.
            </p>
            {health === null && (
              <div className="w-full mb-6 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs text-left">
                ⚠️ <strong>Backend offline.</strong> Start it with: <code className="ml-1 bg-muted px-1 rounded">cd server && uvicorn main:app --reload</code>
              </div>
            )}
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-4 py-3 rounded-xl text-sm border border-border bg-card hover:bg-muted text-foreground transition-colors text-left flex items-center"
                >
                  <MessageSquare className="w-4 h-4 mr-3 text-muted-foreground shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm relative group ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-foreground"
            }`}>
              {m.role === "assistant" ? (
                <>
                  <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-headings:text-foreground prose-strong:text-foreground">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                  {/* Copy button */}
                  <button
                    onClick={() => handleCopy(m.content, i)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-muted hover:bg-secondary"
                    title="Copy response"
                  >
                    {copiedIndex === i
                      ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                      : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  {m.attachment && (
                    <div className="mb-1 rounded-lg overflow-hidden border border-white/10 bg-black/5">
                      {m.attachment.type.startsWith("image/") && (
                        <img src={m.attachment.url} alt="User upload" className="max-h-60 w-auto object-contain" />
                      )}
                      {m.attachment.type.startsWith("video/") && (
                        <video src={m.attachment.url} controls className="max-h-60 w-auto" />
                      )}
                      {m.attachment.type.startsWith("audio/") && (
                        <audio src={m.attachment.url} controls className="w-full h-10" />
                      )}
                      {!m.attachment.type.startsWith("image/") && !m.attachment.type.startsWith("video/") && !m.attachment.type.startsWith("audio/") && (
                        <div className="p-3 flex items-center gap-2 text-xs bg-muted">
                          <Paperclip className="w-4 h-4" />
                          <span>{m.attachment.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {m.content}
                </div>
              )}
            </div>
            {m.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl px-5 py-4 shadow-sm flex items-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="ml-3 text-sm text-muted-foreground">Gathering legal references...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* ── Input ── */}
      <div className="flex flex-col gap-2 pb-2 pt-2 bg-background">
        {/* Attachment Preview */}
        {attachment && (
          <div className="mx-2 flex items-center justify-between bg-muted/50 p-2 rounded-lg border border-border w-fit min-w-[200px]">
            <div className="flex items-center gap-2 overflow-hidden">
              <Paperclip className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs truncate max-w-[150px]">{attachment.name}</span>
            </div>
            <button onClick={() => setAttachment(null)} className="text-muted-foreground hover:text-red-400 ml-3">
              <Check className="w-3 h-3 rotate-45 transform" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <label className="flex items-center justify-center h-14 w-14 rounded-xl border border-border bg-card shadow-sm cursor-pointer hover:bg-muted transition-colors">
            <input 
              type="file" 
              className="hidden" 
              accept="image/*,video/*,audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setAttachment({
                      name: file.name,
                      type: file.type,
                      data: reader.result as string
                    });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </label>
          <Input
            placeholder="Ask a legal question or attach evidence (photos, docs)..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="bg-card border-border text-foreground placeholder:text-muted-foreground h-14 rounded-xl shadow-sm text-base pr-4 flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSend()}
            className="h-14 px-6 rounded-xl shadow-sm"
            disabled={isLoading || (!input.trim() && !attachment)}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
