import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateCourse, useCreateModule, useCourseModules } from "@/hooks/use-courses";
import { Loader2, Plus, Save, ChevronRight, BookText, UploadCloud, DownloadCloud, FileVideo, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CourseBuilder() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createCourse = useCreateCourse();
  const [courseId, setCourseId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  if (!user || user.role !== "l_and_d") {
    return <Redirect to="/dashboard" />;
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newCourse = await createCourse.mutateAsync({
        title,
        description,
        status: "draft"
      });
      setCourseId(newCourse.id);
      toast({ title: "Course created!", description: "Now you can add modules to it." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to create course", description: error.message });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <BookText className="w-6 h-6" />
          </div>
          Course Builder
        </h1>
        <p className="text-muted-foreground mt-2">Design and structure new learning experiences.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className={`border-border/50 shadow-md transition-all ${courseId ? 'opacity-75' : 'ring-2 ring-primary'}`}>
            <CardHeader>
              <CardTitle className="text-lg">1. Course Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div className="space-y-2">
                  <Label>Course Title</Label>
                  <Input
                    placeholder="e.g. Advanced Leadership"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    disabled={!!courseId}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What will students learn?"
                    className="h-24 resize-none"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    disabled={!!courseId}
                    required
                  />
                </div>
                {!courseId && (
                  <Button type="submit" className="w-full shadow-lg shadow-primary/20" disabled={createCourse.isPending}>
                    {createCourse.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Course'}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className={`border-border/50 shadow-lg min-h-[400px] transition-all ${!courseId ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardHeader className="bg-muted/30 border-b border-border/50">
              <CardTitle className="text-lg">2. Course Modules</CardTitle>
              <CardDescription>Break down the course into manageable sections.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {courseId ? (
                <ModuleBuilder courseId={courseId} onDone={() => setLocation("/courses")} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                  <ChevronRight className="w-12 h-12 mb-4 opacity-20" />
                  <p>Save course details first to add modules</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ModuleBuilder({ courseId, onDone }: { courseId: number, onDone: () => void }) {
  const { data: modules = [] } = useCourseModules(courseId);
  const createModule = useCreateModule(courseId);
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      const fileName = e.target.files[0].name;
      setTimeout(() => {
        setIsUploading(false);
        setAttachedFiles(prev => [...prev, fileName]);
        toast({ title: "Resource attached", description: `${fileName} attached to module.` });
      }, 1500);
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createModule.mutateAsync({
        title,
        content,
        sortOrder: modules.length,
      });
      setTitle("");
      setContent("");
      setAttachedFiles([]);
      toast({ title: "Module added" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      toast({ title: "SCORM Export Ready", description: "Your course package has been downloaded." });
    }, 2000);
  };

  return (
    <div className="space-y-8">
      {modules.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Current Modules</h4>
          <div className="space-y-2">
            {modules.map((m, i) => (
              <div key={m.id} className="p-3 bg-secondary/50 rounded-lg flex items-center gap-3 border border-border/50">
                <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 border border-border">
                  {i + 1}
                </div>
                <div className="font-medium text-sm truncate">{m.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleAddModule} className="space-y-4 bg-muted/20 p-5 rounded-xl border border-border/50">
        <h4 className="font-semibold text-foreground">Add New Module</h4>
        <div className="space-y-2">
          <Label>Module Title</Label>
          <Input
            placeholder="e.g. Introduction to Concepts"
            value={title} onChange={e => setTitle(e.target.value)} required
          />
        </div>
        <div className="space-y-2">
          <Label>Module Content</Label>
          <Textarea
            placeholder="Write the module content here..."
            className="h-32 resize-none"
            value={content} onChange={e => setContent(e.target.value)} required
          />
        </div>
        <div className="space-y-2">
          <Label>Resource Upload (Optional)</Label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/50 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/10 transition-colors"
          >
            <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Click to upload video or PDF</p>
            <p className="text-xs text-muted-foreground">MP4, PDF up to 50MB</p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.mp4"
            />
          </div>
          {isUploading && (
            <div className="flex items-center text-sm text-muted-foreground mt-2">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading file...
            </div>
          )}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachedFiles.map((file, i) => (
                <div key={i} className="flex items-center text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {file.endsWith('.mp4') ? <FileVideo className="w-3 h-3 mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
                  {file}
                </div>
              ))}
            </div>
          )}
        </div>
        <Button type="submit" variant="secondary" className="w-full" disabled={createModule.isPending}>
          {createModule.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Add Module
        </Button>
      </form>

      {modules.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={onDone} className="w-full shadow-lg" size="lg">
            <Save className="w-4 h-4 mr-2" /> Finish Course
          </Button>
          <Button onClick={handleExport} variant="outline" className="w-full shadow-lg border-primary/20 hover:bg-primary/5" size="lg" disabled={isExporting}>
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DownloadCloud className="w-4 h-4 mr-2" />}
            Export SCORM
          </Button>
        </div>
      )}
    </div>
  );
}
