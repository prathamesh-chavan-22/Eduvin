import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, UploadCloud, Camera, RefreshCw, CheckCircle2, Trash2, RotateCcw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

type CaptureMode = "upload" | "webcam";

export default function RegisterFaceAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const webcamRef = useRef<Webcam>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>("upload");
  const [registered, setRegistered] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (authLoading) {
    return null;
  }

  if (!user || user.role !== "l_and_d") {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only admin can register face data.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Fetch registered users status
  const { data: registeredUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/attendance/registered-users"],
  });

  const videoConstraints = { width: 480, height: 360, facingMode: "user" };

  // ── Webcam snapshot ────────────────────────────────────────────────────────
  const captureFromWebcam = useCallback(() => {
    if (!webcamRef.current) return;
    const shot = webcamRef.current.getScreenshot();
    if (shot) {
      setPreviewImage(shot);
      toast({ title: "Photo captured!", description: "Review it below, then click Save." });
    }
  }, [toast]);

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select a valid image file.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const uploadAndRegister = async () => {
    if (!userName.trim()) {
      toast({ title: "Error", description: "Please select or enter a user name.", variant: "destructive" });
      return;
    }
    if (!previewImage) {
      toast({ title: "Error", description: "Please capture or upload a photo first.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const response = await apiRequest("POST", "/api/attendance/register", {
        user_name: userName.trim(),
        image_base64: previewImage,
      });
      const data = await response.json();
      setRegistered(true);
      toast({ title: "Face Registered ✅", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/registered-users"] });
      // reset after 3 seconds
      setTimeout(() => {
        setRegistered(false);
        setPreviewImage(null);
        setUserName("");
      }, 3000);
    } catch (err: any) {
      toast({
        title: "Registration Failed",
        description: err.message || "Make sure the photo shows one clear face.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Delete Registration ────────────────────────────────────────────────────
  const deleteRegistration = async (userId: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the face registration for ${name}?`)) return;

    setIsDeleting(userId);
    try {
      const response = await apiRequest("DELETE", `/api/attendance/register/${userId}`);
      const data = await response.json();
      toast({ title: "Deleted", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/registered-users"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete face data.", variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  // ── Reset Today's Attendance (Demo) ────────────────────────────────────────
  const resetTodayAttendance = async (userId: number, name: string) => {
    if (!confirm(`Reset today's attendance for ${name}?\n\nThis lets them mark attendance again for the demo.\nFace data will NOT be deleted.`)) return;

    setIsResetting(userId);
    try {
      const response = await apiRequest("DELETE", `/api/attendance/reset-today/${userId}`);
      const data = await response.json();
      if (data.success) {
        toast({ title: "✅ Reset Done", description: `${name}'s attendance for today has been cleared. They can now mark again.` });
      } else {
        toast({ title: "Nothing to Reset", description: data.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reset attendance.", variant: "destructive" });
    } finally {
      setIsResetting(null);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card className="shadow-2xl border border-border/60">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl flex items-center justify-center gap-2">
            <UserPlus className="w-8 h-8 text-primary" />
            Register Employee Face
          </CardTitle>
          <CardDescription className="text-base">
            Register a face for an employee so they can mark attendance via camera.
            <br />
            <span className="text-yellow-400 font-medium">
              💡 Tip: Use the <strong>Live Webcam</strong> option for the best recognition accuracy.
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ── Employee name input ───────────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Employee Full Name</label>
            <input
              type="text"
              placeholder="e.g. Jane Doe"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Type the exact full name of the employee as registered in the system (e.g. Jane Doe, John Employee, Alex Kumar).
            </p>
          </div>

          {/* ── Mode toggle ───────────────────────────────────────────── */}
          <div className="flex gap-2">
            <Button
              variant={captureMode === "webcam" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => { setCaptureMode("webcam"); setPreviewImage(null); }}
            >
              <Camera className="w-4 h-4" />
              Live Webcam (Recommended)
            </Button>
            <Button
              variant={captureMode === "upload" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => { setCaptureMode("upload"); setPreviewImage(null); }}
            >
              <UploadCloud className="w-4 h-4" />
              Upload Photo
            </Button>
          </div>

          {/* ── Webcam mode ───────────────────────────────────────────── */}
          {captureMode === "webcam" && (
            <div className="space-y-3">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-border bg-black">
                {previewImage ? (
                  <img src={previewImage} alt="Captured" className="w-full h-full object-cover" />
                ) : (
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="w-full h-full object-cover"
                    mirrored={true}
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={captureFromWebcam} variant="outline">
                  <Camera className="w-4 h-4" />
                  Capture Photo
                </Button>
                {previewImage && (
                  <Button variant="ghost" className="gap-2" onClick={() => setPreviewImage(null)}>
                    <RefreshCw className="w-4 h-4" />
                    Retake
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Have the employee sit in front of this webcam and click "Capture Photo".
                This ensures the registration photo matches how the camera sees them.
              </p>
            </div>
          )}

          {/* ── File upload mode ──────────────────────────────────────── */}
          {captureMode === "upload" && (
            <div className="space-y-3">
              <div className="relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleFileChange}
                />
                {previewImage ? (
                  <div className="relative w-full max-w-[240px] aspect-square rounded-lg overflow-hidden border shadow">
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-10 h-10 text-muted-foreground mb-3 group-hover:text-primary transition-colors" />
                    <p className="text-sm font-medium text-muted-foreground">Click to upload a photo</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports .jpg, .png</p>
                  </>
                )}
              </div>
              {previewImage && (
                <Button variant="ghost" size="sm" className="gap-2 w-full" onClick={() => setPreviewImage(null)}>
                  <Trash2 className="w-3 h-3" />
                  Remove photo
                </Button>
              )}
              <p className="text-xs text-yellow-500 text-center">
                ⚠️ Uploaded photos may not always match the live webcam. Use "Live Webcam" for best results.
              </p>
            </div>
          )}

          {/* ── Submit ────────────────────────────────────────────────── */}
          <Button
            size="lg"
            className="w-full text-lg shadow-md hover:shadow-xl transition-all"
            onClick={uploadAndRegister}
            disabled={isProcessing || !userName || !previewImage || registered}
          >
            {registered ? (
              <><CheckCircle2 className="mr-2 h-5 w-5 text-green-400" />Registered Successfully!</>
            ) : isProcessing ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Saving Face Data…</>
            ) : (
              "Save Facial Data"
            )}
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
