import { useState, useRef, useEffect, useCallback } from "react";
import { Brain, Send, Volume2, VolumeX, Loader2, X, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTutorChat, useLearnerProfile, type TutorMessage } from "@/hooks/use-tutor";
import MarkdownContent from "@/components/markdown-content";

interface InlineTutorProps {
    courseId: number;
    moduleId: number;
    moduleTitle: string;
    content: string;
}

const LEVEL_CONFIG: Record<string, { color: string; icon: typeof Brain; label: string; bg: string }> = {
    beginner: { color: "text-emerald-500", icon: Sparkles, label: "Beginner", bg: "bg-emerald-500/10" },
    intermediate: { color: "text-amber-500", icon: TrendingUp, label: "Intermediate", bg: "bg-amber-500/10" },
    advanced: { color: "text-violet-500", icon: Zap, label: "Advanced", bg: "bg-violet-500/10" },
};

// Split markdown into hoverable blocks (by headings, paragraphs, code blocks, etc.)
function splitContentBlocks(content: string): string[] {
    const lines = content.split("\n");
    const blocks: string[] = [];
    let current: string[] = [];

    for (const line of lines) {
        // Start a new block on headings or blank lines after content
        if (/^#{1,3}\s/.test(line) && current.length > 0) {
            blocks.push(current.join("\n").trim());
            current = [line];
        } else if (line.trim() === "" && current.length > 0) {
            current.push(line);
            // Check if current block has meaningful content
            const joined = current.join("\n").trim();
            if (joined) {
                blocks.push(joined);
            }
            current = [];
        } else {
            current.push(line);
        }
    }
    if (current.length > 0) {
        const joined = current.join("\n").trim();
        if (joined) blocks.push(joined);
    }

    return blocks.filter(b => b.trim().length > 0);
}

// Extract plain text from a markdown block for context
function extractPlainText(md: string): string {
    return md
        .replace(/```[\s\S]*?```/g, "[code]")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/#{1,6}\s*/g, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/!\[.*?\]\(.*?\)/g, "[image]")
        .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
        .trim();
}

// Individual message with audio
function TutorResponseMessage({ message }: { message: TutorMessage }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const toggleAudio = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => { });
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-3">
                <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mt-0.5">
                    <Brain className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h2]:text-sm [&_h3]:text-sm">
                        <MarkdownContent content={message.content} />
                    </div>
                    {message.audioUrl && (
                        <button
                            onClick={toggleAudio}
                            className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all ${isPlaying
                                    ? "bg-violet-500/20 text-violet-500"
                                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                                }`}
                        >
                            {isPlaying ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                            {isPlaying ? "Stop" : "Listen"}
                        </button>
                    )}
                    {message.audioUrl && (
                        <audio
                            ref={audioRef}
                            src={message.audioUrl.startsWith("/api") ? message.audioUrl : `/api${message.audioUrl}`}
                            preload="none"
                            onEnded={() => setIsPlaying(false)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default function InlineTutorContent({ courseId, moduleId, moduleTitle, content }: InlineTutorProps) {
    const [activeBlock, setActiveBlock] = useState<number | null>(null);
    const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [inlineMessages, setInlineMessages] = useState<TutorMessage[]>([]);
    const chatMutation = useTutorChat();
    const { data: profile } = useLearnerProfile();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const levelCfg = LEVEL_CONFIG[profile?.knowledgeLevel || "beginner"] || LEVEL_CONFIG.beginner;
    const LevelIcon = levelCfg.icon;

    const blocks = splitContentBlocks(content);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [inlineMessages]);

    useEffect(() => {
        if (activeBlock !== null) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [activeBlock]);

    // Reset when module changes
    useEffect(() => {
        setActiveBlock(null);
        setInlineMessages([]);
        setInputValue("");
    }, [moduleId]);

    const handleAskAbout = useCallback((blockIndex: number) => {
        setActiveBlock(blockIndex);
        const blockText = extractPlainText(blocks[blockIndex]);
        setInputValue(`Explain this to me: "${blockText.substring(0, 100)}${blockText.length > 100 ? "..." : ""}"`);
    }, [blocks]);

    const handleSend = useCallback(() => {
        const trimmed = inputValue.trim();
        if (!trimmed || chatMutation.isPending) return;

        // Add user message to local state immediately
        const userMsg: TutorMessage = {
            id: Date.now(),
            userId: 0,
            courseId,
            moduleId,
            role: "user",
            content: trimmed,
            audioUrl: null,
            createdAt: new Date().toISOString(),
        };
        setInlineMessages(prev => [...prev, userMsg]);
        setInputValue("");

        chatMutation.mutate(
            { message: trimmed, moduleId, courseId },
            {
                onSuccess: (data) => {
                    setInlineMessages(prev => [...prev, data]);
                },
            }
        );
    }, [inputValue, chatMutation, courseId, moduleId]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleDismiss = () => {
        setActiveBlock(null);
        setInlineMessages([]);
        setInputValue("");
    };

    return (
        <div>
            {/* Adaptive Learning Badge */}
            {profile && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${levelCfg.bg} mb-6`}>
                    <LevelIcon className={`w-3.5 h-3.5 ${levelCfg.color}`} />
                    <span className={`text-xs font-semibold ${levelCfg.color}`}>{levelCfg.label}</span>
                    <span className="text-xs text-muted-foreground">· {profile.avgQuizScore}% avg</span>
                </div>
            )}

            {/* Content Blocks with Hover Interaction */}
            <div className="space-y-0">
                {blocks.map((block, index) => {
                    const isHovered = hoveredBlock === index;
                    const isActive = activeBlock === index;

                    return (
                        <div key={index} className="relative group">
                            {/* The content block */}
                            <div
                                className={`relative rounded-lg transition-all duration-200 ${isActive
                                        ? "bg-violet-500/5 ring-1 ring-violet-500/20 px-4 py-2 -mx-4"
                                        : isHovered
                                            ? "bg-muted/30 px-4 py-2 -mx-4"
                                            : ""
                                    }`}
                                onMouseEnter={() => setHoveredBlock(index)}
                                onMouseLeave={() => setHoveredBlock(null)}
                            >
                                <MarkdownContent content={block} />

                                {/* Hover tooltip — Ask Tutor button */}
                                {isHovered && !isActive && (
                                    <button
                                        onClick={() => handleAskAbout(index)}
                                        className="absolute -right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-150 animate-in fade-in zoom-in-95 z-10"
                                    >
                                        <Brain className="w-3 h-3" />
                                        Ask Tutor
                                    </button>
                                )}
                            </div>

                            {/* Inline Tutor Chat — shows right below the active block */}
                            {isActive && (
                                <div className="mt-3 mb-6 ml-0 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="rounded-xl border border-violet-500/20 bg-card shadow-lg overflow-hidden">
                                        {/* Mini header */}
                                        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-violet-500/10 to-purple-500/5 border-b border-violet-500/10">
                                            <div className="flex items-center gap-2">
                                                <Brain className="w-4 h-4 text-violet-500" />
                                                <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                                                    AI Tutor
                                                </span>
                                            </div>
                                            <button
                                                onClick={handleDismiss}
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Messages */}
                                        {inlineMessages.length > 0 && (
                                            <div className="px-4 py-3 max-h-[400px] overflow-y-auto space-y-3">
                                                {inlineMessages.map((msg) =>
                                                    msg.role === "user" ? (
                                                        <div key={msg.id} className="flex justify-end">
                                                            <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3.5 py-2 max-w-[85%]">
                                                                <p className="text-sm">{msg.content}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <TutorResponseMessage key={msg.id} message={msg} />
                                                    )
                                                )}
                                                {chatMutation.isPending && (
                                                    <div className="flex items-center gap-2 text-violet-500">
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        <span className="text-xs">Thinking...</span>
                                                    </div>
                                                )}
                                                <div ref={messagesEndRef} />
                                            </div>
                                        )}

                                        {/* Input */}
                                        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border/30 bg-muted/20">
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Ask about this section..."
                                                disabled={chatMutation.isPending}
                                                className="flex-1 h-8 px-3 rounded-lg bg-background border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all disabled:opacity-50"
                                            />
                                            <Button
                                                size="icon"
                                                onClick={handleSend}
                                                disabled={!inputValue.trim() || chatMutation.isPending}
                                                className="shrink-0 h-8 w-8 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:opacity-50"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
