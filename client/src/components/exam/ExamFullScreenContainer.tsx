import React, { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface ExamFullScreenContainerProps {
  children: React.ReactNode;
  onExitAttempt?: () => void;
}

export function ExamFullScreenContainer({
  children,
  onExitAttempt,
}: ExamFullScreenContainerProps) {
  const { toast } = useToast();

  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Fullscreen unavailable",
          description: "Your browser may not support fullscreen mode. Exam will continue.",
        });
      }
    };

    enterFullscreen();
  }, [toast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onExitAttempt?.();
        toast({
          variant: "default",
          title: "Cannot exit fullscreen during exam",
          description: "Use the Exit button in the exam interface to finish.",
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onExitAttempt, toast]);

  return <>{children}</>;
}
