import { useState, useCallback } from "react";
import { useUploadExamAttempt } from "@/hooks/use-exams";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2, ImagePlus } from "lucide-react";

interface Props {
  paperId: number;
  totalMarks: number;
  onClose: () => void;
}

export default function ExamUploadDialog({ paperId, totalMarks, onClose }: Props) {
  const { toast } = useToast();
  const uploadMutation = useUploadExamAttempt(paperId);
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const imageFiles = Array.from(newFiles).filter(f => f.type.startsWith("image/"));
    if (imageFiles.length + files.length > 3) {
      toast({ title: "Maximum 3 images allowed", variant: "destructive" });
      return;
    }
    setFiles(prev => [...prev, ...imageFiles]);
  }, [files.length, toast]);

  const handleSubmit = () => {
    if (files.length === 0) {
      toast({ title: "Please upload at least one image", variant: "destructive" });
      return;
    }
    uploadMutation.mutate(files, {
      onSuccess: (data) => {
        const summaryText = data.summary || data.evaluationText;
        toast({
          title: "Exam Submitted!",
          description: data.score !== null
            ? `Score: ${data.score}/${data.totalMarks}${summaryText ? ` · ${summaryText}` : ""}`
            : (summaryText || "Evaluation in progress..."),
        });
        onClose();
      },
      onError: () => {
        toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Upload Answer Sheet</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Upload 1-3 photos of your handwritten answers. Max 5MB per image.
        </p>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${dragActive ? "border-primary bg-primary/5" : "border-muted"}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => document.getElementById("exam-file-input")?.click()}
        >
          <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Drag & drop images or click to browse
          </p>
          <input
            id="exam-file-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                <span className="truncate">{f.name}</span>
                <span className="text-muted-foreground ml-2">
                  {(f.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={uploadMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploadMutation.isPending || files.length === 0}>
            {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for Evaluation
          </Button>
        </div>
      </div>
    </div>
  );
}
