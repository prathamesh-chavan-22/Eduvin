import { useParams, Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpeakingLesson, useCreateSpeakingPractice } from "@/hooks/use-speaking";
import {
  Mic, Square, Play, Volume2, ArrowLeft, CheckCircle2,
  AlertCircle, BookOpen, Trophy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SpeakingPracticePage() {
  const params = useParams();
  const lessonId = params.id ? parseInt(params.id) : null;
  const { data: lesson, isLoading } = useSpeakingLesson(lessonId);
  const createPractice = useCreateSpeakingPractice();
  const { toast } = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize speech recognition
    if ("webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart + " ";
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript("");
      setAnalysisResult(null);

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);

      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      toast({
        title: "Recording stopped",
        description: "You can now submit for analysis",
      });
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const playPromptAudio = () => {
    if (lesson?.audioUrl) {
      const audio = new Audio(lesson.audioUrl);
      audio.play();
    }
  };

  const handleSubmit = async () => {
    if (!lesson || !transcript.trim()) {
      toast({
        title: "Error",
        description: "Please record your response first",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const result = await createPractice.mutateAsync({
        prompt: lesson.prompt || lesson.promptTemplateEn,
        transcript: transcript.trim(),
        lessonId: lesson.id,
      });

      setAnalysisResult(result);

      toast({
        title: "Analysis complete!",
        description: "Your speaking practice has been analyzed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze your response",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium">Lesson not found</p>
            <Link href="/speaking/topics">
              <Button className="mt-4">Back to Topics</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = lesson.progress;
  const hasRecording = !!audioUrl;
  const canSubmit = hasRecording && transcript.trim().length > 0 && !isAnalyzing;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Link href={`/speaking/topics/${lesson.topicId}`}>
        <Button variant="ghost">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Topic
        </Button>
      </Link>

      {/* Lesson Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5" />
                <Badge>Level {lesson.difficultyLevel}</Badge>
                {progress?.completed && (
                  <Badge variant="outline" className="border-green-500 text-green-500">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Completed
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{lesson.title}</CardTitle>
              <CardDescription className="mt-2">{lesson.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        {progress && (
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Attempts:</span>{" "}
                <span className="font-medium">{progress.attempts}</span>
              </div>
              {progress.bestScore && progress.bestScore > 0 && (
                <div>
                  <span className="text-muted-foreground">Best Score:</span>{" "}
                  <Badge className="ml-1">
                    {Math.round(progress.bestScore)}%
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Speaking Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>Your Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <p className="flex-1 text-lg">{lesson.prompt || lesson.promptTemplateEn}</p>
            {lesson.audioUrl && (
              <Button onClick={playPromptAudio} variant="outline" size="icon">
                <Volume2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {lesson.targetVocabulary && lesson.targetVocabulary.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Target Vocabulary:</p>
              <div className="flex flex-wrap gap-2">
                {lesson.targetVocabulary.map((word: string, idx: number) => (
                  <Badge key={idx} variant="secondary">
                    {word}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {lesson.exampleResponse && (
            <Alert>
              <AlertDescription>
                <p className="text-sm font-medium mb-1">Example Response:</p>
                <p className="text-sm text-muted-foreground italic">{lesson.exampleResponse}</p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Record Your Response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 justify-center">
            {!isRecording ? (
              <Button onClick={startRecording} size="lg" className="gap-2">
                <Mic className="h-5 w-5" />
                Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} size="lg" variant="destructive" className="gap-2">
                <Square className="h-5 w-5" />
                Stop Recording
              </Button>
            )}

            {hasRecording && !isRecording && (
              <Button onClick={playAudio} size="lg" variant="outline" className="gap-2">
                <Play className="h-5 w-5" />
                Play Recording
              </Button>
            )}
          </div>

          {isRecording && (
            <Alert>
              <Mic className="h-4 w-4 animate-pulse" />
              <AlertDescription>Recording in progress... Speak clearly</AlertDescription>
            </Alert>
          )}

          {transcript && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Your Response:</p>
              <p className="text-sm">{transcript}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? "Analyzing..." : "Submit for Analysis"}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Pronunciation</p>
                <div className="space-y-1">
                  <Progress value={analysisResult.pronunciationScore || 0} />
                  <p className="text-sm font-medium">
                    {Math.round(analysisResult.pronunciationScore || 0)}%
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Fluency</p>
                <div className="space-y-1">
                  <Progress value={analysisResult.fluencyScore || 0} />
                  <p className="text-sm font-medium">
                    {Math.round(analysisResult.fluencyScore || 0)}%
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Vocabulary</p>
                <div className="space-y-1">
                  <Progress value={analysisResult.vocabularyScore || 0} />
                  <p className="text-sm font-medium">
                    {Math.round(analysisResult.vocabularyScore || 0)}%
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Grammar</p>
                <div className="space-y-1">
                  <Progress value={analysisResult.grammarScore || 0} />
                  <p className="text-sm font-medium">
                    {Math.round(analysisResult.grammarScore || 0)}%
                  </p>
                </div>
              </div>
            </div>

            {analysisResult.feedback && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-2">Feedback:</p>
                <p className="text-sm">{analysisResult.feedback}</p>
              </div>
            )}

            {analysisResult.corrections && (
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="font-medium mb-2 text-orange-900 dark:text-orange-100">
                  Suggestions for Improvement:
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  {analysisResult.corrections}
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setTranscript("");
                  setAudioBlob(null);
                  setAudioUrl(null);
                  setAnalysisResult(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Practice Again
              </Button>
              <Link href="/speaking/topics" className="flex-1">
                <Button className="w-full">Continue Learning</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
