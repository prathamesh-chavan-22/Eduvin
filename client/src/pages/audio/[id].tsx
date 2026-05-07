import { useParams, Link } from "wouter";
import { useAudioUpload } from "@/hooks/use-audio";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Loader2, AlertCircle, FileAudio, Brain, FileText,
  Download, Copy, Check, TreePine,
} from "lucide-react";
import { MindmapTree } from "@/components/mindmap-tree";
import { EditableMindmap } from "@/components/editable-mindmap";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function MindmapViewerPage() {
  const { id } = useParams<{ id: string }>();
  const audioId = id ? parseInt(id, 10) : null;
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [mindmapView, setMindmapView] = useState<"visual" | "editable">("visual");

  const { data: audio, isLoading, error } = useAudioUpload(audioId);

  if (!audioId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Invalid Audio ID</h2>
        <Link href="/audio">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Audio Uploads
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading audio details...</p>
      </div>
    );
  }

  if (error || !audio) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load</h2>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : "Could not load audio details"}
        </p>
        <Link href="/audio">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Audio Uploads
          </Button>
        </Link>
      </div>
    );
  }

  if (audio.status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Processing Failed</h2>
        {audio.errorMessage && (
          <p className="text-muted-foreground mb-4 text-center max-w-md">{audio.errorMessage}</p>
        )}
        <Link href="/audio">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Audio Uploads
          </Button>
        </Link>
      </div>
    );
  }

  if (audio.status !== "ready") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">Processing Audio</h2>
        <Badge variant="secondary" className="mb-4">
          {audio.status === "transcribing" && "Transcribing audio..."}
          {audio.status === "generating_mindmap" && "Generating mindmap..."}
          {audio.status === "uploading" && "Uploading..."}
        </Badge>
        <p className="text-muted-foreground">This page will refresh automatically when ready.</p>
      </div>
    );
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied", description: "Transcript copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTranscript = () => {
    if (!audio.transcript) return;
    const blob = new Blob([audio.transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${audio.filename.replace(/\.[^/.]+$/, "")}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMindmapJSON = () => {
    if (!audio.mindmapData) return;
    const blob = new Blob([JSON.stringify(audio.mindmapData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${audio.filename.replace(/\.[^/.]+$/, "")}_mindmap.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Check if mindmap data has the enriched v2 schema
  const isEnrichedMindmap = audio.mindmapData && "summary" in audio.mindmapData;

  // Normalize mindmap data for the visual component
  const getVisualMindmapData = () => {
    if (!audio.mindmapData) return null;
    if (isEnrichedMindmap) {
      return audio.mindmapData.summary;
    }
    // Legacy format: { root, children }
    if ("root" in audio.mindmapData) {
      return {
        label: audio.mindmapData.root,
        children: audio.mindmapData.children || [],
      };
    }
    return audio.mindmapData;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/audio">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{audio.filename}</h1>
            <p className="text-muted-foreground mt-1">
              Uploaded {new Date(audio.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Badge className="text-sm px-3 py-1">
          <Check className="w-3 h-3 mr-1" />
          Ready
        </Badge>
      </div>

      {/* Mindmap metadata info */}
      {isEnrichedMindmap && audio.mindmapData.metadata && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Version</p>
                <p className="font-medium">{audio.mindmapData.version || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Words</p>
                <p className="font-medium">{audio.mindmapData.metadata.totalWords?.toLocaleString() || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Segments</p>
                <p className="font-medium">{audio.mindmapData.metadata.totalChunks || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Generated</p>
                <p className="font-medium">
                  {audio.mindmapData.metadata.generatedAt
                    ? new Date(audio.mindmapData.metadata.generatedAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>
            {audio.mindmapData.editableNotes && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <strong>Note:</strong> {audio.mindmapData.editableNotes}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="mindmap" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mindmap" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            <span>Mindmap</span>
          </TabsTrigger>
          <TabsTrigger value="transcript" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Transcript</span>
          </TabsTrigger>
        </TabsList>

        {/* Mindmap Tab */}
        <TabsContent value="mindmap" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    {isEnrichedMindmap ? "Editable Mindmap" : "Interactive Mindmap"}
                  </CardTitle>
                  <CardDescription>
                    {isEnrichedMindmap
                      ? "Switch between visual tree and JSON editor. Click nodes to edit."
                      : "Click nodes to expand/collapse. Drag to pan, scroll to zoom."}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {isEnrichedMindmap && (
                    <div className="flex gap-1 bg-muted rounded-md p-0.5 mr-2">
                      <Button
                        variant={mindmapView === "visual" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMindmapView("visual")}
                        className="h-7 text-xs"
                      >
                        <TreePine className="w-3.5 h-3.5 mr-1" /> Visual
                      </Button>
                      <Button
                        variant={mindmapView === "editable" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMindmapView("editable")}
                        className="h-7 text-xs"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> Editable
                      </Button>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={downloadMindmapJSON}>
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isEnrichedMindmap ? (
                mindmapView === "editable" ? (
                  <div className="h-[700px]">
                    <EditableMindmap
                      data={audio.mindmapData as any}
                      onChange={(updated) => {
                        // In a real app, you'd save this back to the server
                        console.log("Updated mindmap:", updated);
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-[700px]">
                    <MindmapTree data={getVisualMindmapData() as any} />
                  </div>
                )
              ) : audio.mindmapData && "root" in audio.mindmapData ? (
                <div className="h-[700px]">
                  <MindmapTree data={audio.mindmapData as any} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Brain className="w-12 h-12 mb-3 opacity-30" />
                  <p>No mindmap data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Audio Transcript
                  </CardTitle>
                  <CardDescription>
                    AI-generated transcript from Groq Whisper model
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => audio.transcript && copyToClipboard(audio.transcript)}
                    disabled={!audio.transcript}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadTranscript}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {audio.transcript ? (
                <ScrollArea className="h-[500px] w-full rounded-lg border bg-muted/30 p-6">
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed">{audio.transcript}</p>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <FileAudio className="w-12 h-12 mb-3 opacity-30" />
                  <p>No transcript available</p>
                </div>
              )}
              {audio.errorMessage && (
                <div className="mt-4 p-4 border border-amber-200 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> {audio.errorMessage}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
