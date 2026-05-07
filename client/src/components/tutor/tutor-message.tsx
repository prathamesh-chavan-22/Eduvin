import { useRef, useState } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import type { TutorMessage } from "@/hooks/use-tutor";
import MarkdownContent from "@/components/markdown-content";

interface TutorMessageBubbleProps {
    message: TutorMessage;
}

export default function TutorMessageBubble({ message }: TutorMessageBubbleProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioLoading, setAudioLoading] = useState(false);

    const isUser = message.role === "user";

    const toggleAudio = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        } else {
            setAudioLoading(true);
            audioRef.current.play()
                .then(() => {
                    setIsPlaying(true);
                    setAudioLoading(false);
                })
                .catch(() => setAudioLoading(false));
        }
    };

    return (
        <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-2`}>
            {/* Avatar */}
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${isUser
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                    : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                }`}>
                {isUser ? "You" : "AI"}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${isUser
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border/50 rounded-bl-md"
                }`}>
                {isUser ? (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                ) : (
                    <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm">
                        <MarkdownContent content={message.content} />
                    </div>
                )}

                {/* Audio play button for AI messages */}
                {!isUser && message.audioUrl && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                        <button
                            onClick={toggleAudio}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all ${isPlaying
                                    ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                        >
                            {audioLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isPlaying ? (
                                <VolumeX className="w-3 h-3" />
                            ) : (
                                <Volume2 className="w-3 h-3" />
                            )}
                            {isPlaying ? "Stop" : "Listen"}
                        </button>
                        <audio
                            ref={audioRef}
                            src={message.audioUrl.startsWith("/api") ? message.audioUrl : `/api${message.audioUrl}`}
                            preload="none"
                            onEnded={() => setIsPlaying(false)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// Typing indicator for when the AI is generating a response
export function TypingIndicator() {
    return (
        <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                AI
            </div>
            <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                </div>
            </div>
        </div>
    );
}
