import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  UploadCloud, Mic, Loader2, Play, Trash2, Eye,
  CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useAudioUploads,
  useUploadAudio,
  useDeleteAudioUpload,
  type AudioUploadStatus,
} from "@/hooks/use-audio";
import { formatDistanceToNow } from "date-fns";

const ALLOWED_EXTENSIONS = [".flac", ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".ogg", ".wav", ".webm"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function getStatusBadge(status: AudioUploadStatus) {
  const variants: Record<AudioUploadStatus, { icon: React.ReactNode; text: string; variant: "default" | "secondary" | "destructive" }> = {
    uploading: { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: "Uploading", variant: "secondary" },
    transcribing: { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: "Transcribing", variant: "secondary" },
    generating_mindmap: { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: "Generating Mindmap", variant: "secondary" },
    ready: { icon: <CheckCircle2 className="w-3 h-3" />, text: "Ready", variant: "default" },
    failed: { icon: <AlertCircle className="w-3 h-3" />, text: "Failed", variant: "destructive" },
  };

  const config = variants[status];
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      <span>{config.text}</span>
    </Badge>
  );
}

export default function AudioUploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: uploads, isLoading } = useAudioUploads();
  const uploadMutation = useUploadAudio();
  const deleteMutation = useDeleteAudioUpload();

  if (!user) {
    return <Redirect to="/dashboard" />;
  }

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: 25MB`;
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        toast({ title: "Invalid File", description: error, variant: "destructive" });
        return;
      }

      uploadMutation.mutate(file, {
        onSuccess: (data) => {
          toast({
            title: "Upload Successful",
            description: "Audio is being transcribed. Mindmap will be generated automatically.",
          });
        },
        onError: (err: Error) => {
          toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
        },
      });
    },
    [uploadMutation, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: "Deleted", description: "Audio upload deleted successfully." });
      },
    });
  };

  const handleViewMindmap = (id: number) => {
    // Navigate to mindmap viewer (will be implemented)
    window.location.href = `/audio/${id}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Audio to Mindmap</h1>
        <p className="text-muted-foreground mt-2">
          Upload audio recordings to automatically transcribe and generate interactive mindmaps using AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload area */}
        <div className="lg:col-span-7 space-y-6">
          <Card
            className={`border-2 border-dashed transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border/50 bg-muted/10"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Mic className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Upload Audio</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Drag and drop an audio file here, or click to browse. Supports MP3, WAV, M4A, FLAC, and more.
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_EXTENSIONS.join(",")}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Select Audio File
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Maximum file size: 25MB
              </p>
            </CardContent>
          </Card>

          {/* How it works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
              <CardDescription>Three simple steps from audio to mindmap</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center font-bold shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Upload Audio</p>
                  <p className="text-sm text-muted-foreground">
                    Upload any audio file (MP3, WAV, M4A, FLAC, etc.)
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">AI Transcription</p>
                  <p className="text-sm text-muted-foreground">
                    Groq's Whisper model transcribes your audio in seconds
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Mindmap Generation</p>
                  <p className="text-sm text-muted-foreground">
                    AI analyzes the transcript and creates an interactive mindmap
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload history */}
        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Recent Uploads</CardTitle>
              <CardDescription>Your audio uploads and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : uploads && uploads.length > 0 ? (
                <div className="space-y-3">
                  {uploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{upload.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {upload.createdAt
                              ? `${formatDistanceToNow(new Date(upload.createdAt))} ago`
                              : "Just now"}
                          </p>
                        </div>
                        {getStatusBadge(upload.status)}
                      </div>
                      {upload.status === "ready" && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleViewMindmap(upload.id)}
                            className="flex-1"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Mindmap
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(upload.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {upload.status === "failed" && (
                        <p className="text-xs text-destructive mt-2">
                          Processing failed. Please try uploading again.
                        </p>
                      )}
                      {(upload.status === "transcribing" || upload.status === "generating_mindmap") && (
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Processing... This may take a few moments.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mic className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No audio uploads yet</p>
                  <p className="text-xs mt-1">Upload your first audio file to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
