import { useState, useRef, useEffect } from "react";
import { X, Send, Brain, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTutorHistory, useTutorChat, useLearnerProfile } from "@/hooks/use-tutor";
import TutorMessageBubble, { TypingIndicator } from "./tutor-message";

interface AiTutorPanelProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
    moduleId: number;
    moduleTitle: string;
}

const LEVEL_CONFIG: Record<string, { color: string; icon: typeof Brain; label: string; gradient: string }> = {
    beginner: { color: "text-emerald-400", icon: Sparkles, label: "Beginner", gradient: "from-emerald-500/20 to-green-500/20" },
    intermediate: { color: "text-amber-400", icon: TrendingUp, label: "Intermediate", gradient: "from-amber-500/20 to-orange-500/20" },
    advanced: { color: "text-violet-400", icon: Zap, label: "Advanced", gradient: "from-violet-500/20 to-purple-500/20" },
};

export default function AiTutorPanel({ isOpen, onClose, courseId, moduleId, moduleTitle }: AiTutorPanelProps) {
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { data: history = [], isLoading: historyLoading } = useTutorHistory(courseId);
    const chatMutation = useTutorChat();
    const { data: profile } = useLearnerProfile();

    const levelCfg = LEVEL_CONFIG[profile?.knowledgeLevel || "beginner"] || LEVEL_CONFIG.beginner;
    const LevelIcon = levelCfg.icon;

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history, chatMutation.isPending]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed || chatMutation.isPending) return;

        chatMutation.mutate({
            message: trimmed,
            moduleId,
            courseId,
        });
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div
                className={`fixed top-0 right-0 h-full z-50 flex flex-col transition-all duration-300 ease-out ${isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                    }`}
                style={{ width: "min(420px, 100vw)" }}
            >
                <div className="flex flex-col h-full bg-background/95 backdrop-blur-xl border-l border-border/50 shadow-2xl">
                    {/* Header */}
                    <div className="shrink-0 px-5 py-4 border-b border-border/50 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                                    <Brain className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-display font-bold text-base">AI Tutor</h3>
                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        Studying: {moduleTitle}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-muted">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Adaptive Learning Indicator */}
                        {profile && (
                            <div className={`mt-3 flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r ${levelCfg.gradient} border border-border/30`}>
                                <div className={`shrink-0 ${levelCfg.color}`}>
                                    <LevelIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-semibold ${levelCfg.color}`}>
                                            {levelCfg.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            · Avg score: {profile.avgQuizScore}%
                                        </span>
                                    </div>
                                    <div className="mt-1 h-1 rounded-full bg-muted/50 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                                            style={{ width: `${Math.min(profile.avgQuizScore, 100)}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="shrink-0 text-xs text-muted-foreground font-medium">
                                    {profile.totalModulesCompleted} modules
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                        {historyLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                                        <Brain className="w-5 h-5 text-violet-400 animate-pulse" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Loading conversation...</p>
                                </div>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center max-w-[280px]">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4 border border-violet-500/20">
                                        <Sparkles className="w-7 h-7 text-violet-400" />
                                    </div>
                                    <h4 className="font-display font-semibold text-base mb-2">Hi! I'm your AI Tutor</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                        Ask me anything about <strong>{moduleTitle}</strong>. I'll adapt my explanations to your learning pace.
                                    </p>
                                    <div className="space-y-2">
                                        {[
                                            "Explain this module in simple terms",
                                            "Give me a real-world example",
                                            "What are the key takeaways?",
                                        ].map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                onClick={() => {
                                                    setInput(suggestion);
                                                    inputRef.current?.focus();
                                                }}
                                                className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/50 border border-border/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-all hover:border-violet-500/30"
                                            >
                                                💡 {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {history.map((msg) => (
                                    <TutorMessageBubble key={msg.id} message={msg} />
                                ))}
                                {chatMutation.isPending && <TypingIndicator />}
                            </>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Bar */}
                    <div className="shrink-0 border-t border-border/50 p-4 bg-background/80">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about this module..."
                                disabled={chatMutation.isPending}
                                className="flex-1 h-10 px-4 rounded-xl bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all disabled:opacity-50"
                            />
                            <Button
                                size="icon"
                                onClick={handleSend}
                                disabled={!input.trim() || chatMutation.isPending}
                                className="shrink-0 h-10 w-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25 disabled:shadow-none transition-all"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                        {chatMutation.isError && (
                            <p className="text-xs text-red-400 mt-2 pl-1">
                                Failed to send message. Please try again.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
