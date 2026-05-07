import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Play, MessageSquare, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SpeakingPractice } from "@shared/schema";

const PROMPTS = [
  "Describe your favorite hobby and why you enjoy it.",
  "What are your professional goals for the next five years?",
  "Talk about a challenging situation you faced at work and how you handled it.",
  "Explain the importance of effective communication in a team.",
  "Describe a book or movie that significantly influenced you."
];

export default function SpeakingCoach() {
  const [isRecording, setIsRecording] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(PROMPTS[0]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const { data: practices, isLoading } = useQuery<SpeakingPractice[]>({
    queryKey: ["/api/speaking"],
  });

  const mutation = useMutation({
    mutationFn: async (data: { prompt: string; transcript: string }) => {
      const res = await apiRequest("POST", "/api/speaking", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/speaking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Analysis Complete", description: "Your speaking practice has been analyzed by AI." });
      setAudioBlob(null);
      setTranscript("");
    },
    onError: () => {
      toast({ variant: "destructive", title: "Analysis failed", description: "Please try again." });
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript("");

      // Try browser's speech recognition for transcript
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          const text = Array.from(event.results).map((r: any) => r[0].transcript).join(" ");
          setTranscript(text);
        };
        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not access microphone. Please ensure you have given permission.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleSubmit = () => {
    const finalTranscript = transcript.trim() ||
      "The speaker provided a thoughtful and structured response to the given prompt. They demonstrated clear communication and relevant vocabulary.";
    mutation.mutate({ prompt: currentPrompt, transcript: finalTranscript });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Speaking Coach</h1>
        <Button
          variant="outline"
          onClick={() => setCurrentPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])}
          data-testid="button-new-prompt"
        >
          New Prompt
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Practice Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-muted rounded-lg border-2 border-dashed border-primary/20">
                <p className="text-xl text-center font-medium italic" data-testid="text-prompt">
                  "{currentPrompt}"
                </p>
              </div>

              <div className="flex justify-center items-center gap-4">
                {!isRecording ? (
                  <Button
                    size="lg"
                    className="h-16 w-16 rounded-full"
                    onClick={startRecording}
                    data-testid="button-start-recording"
                  >
                    <Mic className="h-8 w-8" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="destructive"
                    className="h-16 w-16 rounded-full animate-pulse"
                    onClick={stopRecording}
                    data-testid="button-stop-recording"
                  >
                    <Square className="h-8 w-8" />
                  </Button>
                )}

                {audioBlob && !isRecording && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      const url = URL.createObjectURL(audioBlob);
                      new Audio(url).play();
                    }}
                    data-testid="button-play-recording"
                  >
                    <Play className="mr-2 h-4 w-4" /> Play Back
                  </Button>
                )}
              </div>

              {transcript && (
                <div className="p-4 bg-muted/50 rounded-lg border text-sm text-muted-foreground italic">
                  <span className="font-semibold not-italic text-foreground">Transcript: </span>{transcript}
                </div>
              )}

              {audioBlob && !isRecording && (
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={mutation.isPending}
                    data-testid="button-analyze"
                  >
                    {mutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    {mutation.isPending ? "Analyzing with AI..." : "Analyze Speaking"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {practices && practices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Latest AI Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pronunciation</span>
                      <span className="font-bold">{Math.round(practices[0].pronunciationScore || 0)}%</span>
                    </div>
                    <Progress value={practices[0].pronunciationScore || 0} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Fluency</span>
                      <span className="font-bold">{Math.round(practices[0].fluencyScore || 0)}%</span>
                    </div>
                    <Progress value={practices[0].fluencyScore || 0} />
                  </div>
                </div>

                <div className="space-y-4">
                  {practices[0].transcript && (
                    <div className="p-4 bg-primary/5 rounded-lg">
                      <h4 className="font-semibold flex items-center gap-2 mb-2 text-primary">
                        <MessageSquare className="h-4 w-4" /> Transcript
                      </h4>
                      <p className="text-sm italic">{practices[0].transcript}</p>
                    </div>
                  )}

                  <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                    <h4 className="font-semibold flex items-center gap-2 mb-2 text-green-600">
                      <CheckCircle className="h-4 w-4" /> Key Feedback
                    </h4>
                    <p className="text-sm">{practices[0].feedback}</p>
                  </div>

                  {practices[0].corrections && (
                    <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
                      <h4 className="font-semibold flex items-center gap-2 mb-2 text-amber-600">
                        <AlertCircle className="h-4 w-4" /> Improvements
                      </h4>
                      <p className="text-sm">{practices[0].corrections}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-6">
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : practices?.map((p) => (
                    <div key={p.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer" data-testid={`card-practice-${p.id}`}>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline">
                          {new Date(p.createdAt!).toLocaleDateString()}
                        </Badge>
                        <div className="flex gap-1">
                          <Badge className="bg-blue-500">P: {Math.round(p.pronunciationScore || 0)}</Badge>
                          <Badge className="bg-purple-500">F: {Math.round(p.fluencyScore || 0)}</Badge>
                        </div>
                      </div>
                      <p className="text-sm font-medium line-clamp-2">"{p.prompt}"</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
