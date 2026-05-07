/**
 * Mark Attendance — Face Kiosk
 * ==============================
 * 1. Camera starts automatically when the page loads.
 * 2. Every 400 ms a frame is sent to /api/attendance/detect.
 * 3. Backend returns an annotated JPEG with green box (match) or red box (Unknown).
 * 4. When the logged-in user's face is recognised, a "Mark Attendance" button appears.
 * 5. Employee clicks the button → /api/attendance/mark is called → attendance saved.
 * 6. Admins/managers receive a notification automatically.
 * 7. Page redirects to dashboard after success.
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Camera, CheckCircle2, UserCheck, ScanFace, ShieldAlert,
} from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// ── Phase states ─────────────────────────────────────────────────────────────
type Phase =
  | "scanning"    // no face visible
  | "unknown"     // face visible but wrong person
  | "recognized"  // logged-in user detected — ready to mark
  | "marking"     // API call in-flight
  | "confirmed";  // attendance saved

const POLL_MS = 500;   // ⚡ fast poll — backend is now lightweight (no liveness in detect)
const RECOGNIZED_FRAMES_REQUIRED = 3;
const UNKNOWN_FRAMES_REQUIRED = 3;
const VIDEO_CONSTRAINT_OPTIONS = [
  { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" as const },
  { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: "user" as const },
  { facingMode: "user" as const },
];

export default function MarkAttendance() {
  const webcamRef   = useRef<Webcam>(null);
  const timerRef    = useRef<NodeJS.Timeout | null>(null);
  const isPolling   = useRef(false);
  const recognizedStreakRef = useRef(0);
  const unknownStreakRef = useRef(0);
  const phoneToastShown = useRef(false); // prevents toast spam every frame

  const [phase,       setPhase]       = useState<Phase>("scanning");
  const [statusMsg,   setStatusMsg]   = useState("Starting camera…");
  const [matchedName, setMatchedName] = useState("");
  const [faceBox, setFaceBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [faceLabel, setFaceLabel] = useState<string | null>(null);
  // faceState drives box color instantly from backend — not tied to lagging phase streak
  const [faceState, setFaceState] = useState<"recognized" | "phone" | "spoof" | "unknown" | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraOptionIndex, setCameraOptionIndex] = useState(0);
  const [cameraReloadKey, setCameraReloadKey] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const videoConstraints = VIDEO_CONSTRAINT_OPTIONS[cameraOptionIndex] ?? VIDEO_CONSTRAINT_OPTIONS[VIDEO_CONSTRAINT_OPTIONS.length - 1];

  // ── Poll backend for face detection ────────────────────────────────────────
  const poll = useCallback(async () => {
    if (isPolling.current) return;           // skip if previous call still running
    if (!webcamRef.current || !cameraReady || cameraError) return;

    const shot = webcamRef.current.getScreenshot();
    if (!shot) return;

    isPolling.current = true;
    try {
      const res  = await apiRequest("POST", "/api/attendance/detect", { image_base64: shot });
      const data = await res.json();

      if (!data.face_detected) {
        recognizedStreakRef.current = 0;
        unknownStreakRef.current = 0;
        setFaceBox(null);
        setFaceLabel(null);
        setFaceState(null);
        setPhase("scanning");
        setMatchedName("");
        setStatusMsg(data.message || "No face detected — move closer");
      } else {
        // ── Update box/label immediately on every frame ──
        if (data.face_box) {
          setFaceBox(data.face_box);
          setFaceLabel(data.face_label ?? null);
        } else {
          setFaceBox(null);
          setFaceLabel(null);
        }

        // ── Drive box COLOR immediately from backend signal ──
        if (data.phone_detected) {
          setFaceState("phone");
          recognizedStreakRef.current = 0;
          unknownStreakRef.current += 1;
          setPhase("unknown");
          setMatchedName("");
          setStatusMsg("📵 Phone detected — remove phone from frame.");
          // Show toast only once per detection burst
          if (!phoneToastShown.current) {
            phoneToastShown.current = true;
            toast({
              title: "📵 Phone Detected!",
              description: "Please remove the phone from the camera frame to mark attendance.",
              variant: "destructive",
            });
          }
        } else if (data.liveness_available && !data.liveness_verified) {
          setFaceState("spoof");
          recognizedStreakRef.current = 0;
          unknownStreakRef.current += 1;
          phoneToastShown.current = false;
          setPhase("unknown");
          setMatchedName("");
          setStatusMsg("Spoof suspected (mobile/photo/video). Attendance blocked.");
        } else if (data.recognized) {
          setFaceState("recognized");
          phoneToastShown.current = false; // reset so toast can fire again next time
          recognizedStreakRef.current += 1;
          unknownStreakRef.current = 0;

          if (recognizedStreakRef.current >= RECOGNIZED_FRAMES_REQUIRED) {
            setPhase("recognized");
            setMatchedName(data.matched_user_name ?? "");
            setStatusMsg(`✅ Face matched: ${data.matched_user_name}`);
          } else {
            setStatusMsg("Hold still... confirming face match");
          }
        } else {
          setFaceState("unknown");
          phoneToastShown.current = false; // reset so toast fires again if phone returns
          unknownStreakRef.current += 1;
          recognizedStreakRef.current = 0;

          if (unknownStreakRef.current >= UNKNOWN_FRAMES_REQUIRED) {
            setPhase("unknown");
            setMatchedName("");
            setStatusMsg("Unknown face — only the logged-in employee can mark attendance");
          } else {
            setStatusMsg("Checking face...");
          }
        }
      }
    } catch {
      // silently retry
    } finally {
      isPolling.current = false;
    }
  }, [cameraError, cameraReady]);

  // ── Polling loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "confirmed" || phase === "marking" || !cameraReady || !!cameraError) return;

    setStatusMsg("Scanning for your face…");

    const loop = () => {
      poll();
      timerRef.current = setTimeout(loop, POLL_MS);
    };
    timerRef.current = setTimeout(loop, POLL_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [poll, phase, cameraReady, cameraError]);

  // ── Mark Attendance ─────────────────────────────────────────────────────────
  const markAttendance = async () => {
    if (!webcamRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);   // pause polling

    const shot = webcamRef.current.getScreenshot();
    if (!shot) return;

    setPhase("marking");
    setStatusMsg("Marking attendance…");

    try {
      const res  = await apiRequest("POST", "/api/attendance/mark", { image_base64: shot });
      const data = await res.json();

      if (data.success) {
        setPhase("confirmed");
        setFaceBox(null);
        setFaceLabel(null);
        toast({ title: "✅ Attendance Marked!", description: data.message });
        setTimeout(() => setLocation("/"), 2000);
      } else {
        toast({ title: "Not Recognised", description: data.message, variant: "destructive" });
        setPhase("scanning");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? "Something went wrong.", variant: "destructive" });
      setPhase("scanning");
    }
  };

  const retryCamera = () => {
    setCameraReady(false);
    setCameraError(null);
    setStatusMsg("Retrying camera access…");
    setCameraReloadKey((v) => v + 1);
  };

  // ── Status pill ─────────────────────────────────────────────────────────────
  const pill = {
    scanning:   { cls: "bg-slate-500/20 text-slate-300 border-slate-500/40",  icon: <Loader2    className="w-4 h-4 animate-spin" /> },
    unknown:    { cls: "bg-red-500/20   text-red-300   border-red-500/40",    icon: <ShieldAlert className="w-4 h-4" /> },
    recognized: { cls: "bg-green-500/20 text-green-300 border-green-500/40",  icon: <ScanFace   className="w-4 h-4" /> },
    marking:    { cls: "bg-blue-500/20  text-blue-300  border-blue-500/40",   icon: <Loader2    className="w-4 h-4 animate-spin" /> },
    confirmed:  { cls: "bg-green-600/30 text-green-200 border-green-500/60",  icon: <CheckCircle2 className="w-4 h-4" /> },
  }[phase];

  // ── Camera border colour ────────────────────────────────────────────────────
  const borderCls = {
    scanning:   "border-slate-600/40",
    unknown:    "border-red-500/70",
    recognized: "border-green-400/70",
    marking:    "border-blue-400/70",
    confirmed:  "border-green-500/70",
  }[phase];

  // ── Box config driven by faceState (instant, per-frame) ──
  const faceBoxCfg = (() => {
    if (faceState === "recognized") return {
      corner: "border-green-400",
      glow: "drop-shadow-[0_0_10px_rgba(74,222,128,0.9)]",
      badge: "bg-green-500 text-white",
      icon: <UserCheck className="w-3 h-3" />,
      text: matchedName || faceLabel || "Matched",
    };
    if (faceState === "phone") return {
      corner: "border-orange-400",
      glow: "drop-shadow-[0_0_10px_rgba(251,146,60,0.9)]",
      badge: "bg-orange-500 text-white",
      icon: <ShieldAlert className="w-3 h-3" />,
      text: "Phone Detected",
    };
    if (faceState === "spoof") return {
      corner: "border-purple-400",
      glow: "drop-shadow-[0_0_10px_rgba(192,132,252,0.9)]",
      badge: "bg-purple-600 text-white",
      icon: <ShieldAlert className="w-3 h-3" />,
      text: "Spoof Detected",
    };
    // unknown or null
    return {
      corner: "border-red-500",
      glow: "drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]",
      badge: "bg-red-500 text-white",
      icon: <ShieldAlert className="w-3 h-3" />,
      text: faceLabel || "Unknown",
    };
  })();
  const videoEl = webcamRef.current?.video as HTMLVideoElement | undefined;
  const frameW = videoEl?.videoWidth || 640;
  const frameH = videoEl?.videoHeight || 480;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card className="shadow-2xl border border-border/60">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl flex items-center justify-center gap-2">
            <Camera className="w-8 h-8 text-primary" />
            Face Attendance Kiosk
          </CardTitle>
          <CardDescription className="text-base">
            Look directly at the camera. A <strong>green box</strong> will appear when your face
            is recognised. Click <strong>Mark Attendance</strong> to save.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-5">

          {/* ── Camera / annotated feed ───────────────────────────────────── */}
          <div className={`relative w-full max-w-[620px] aspect-video rounded-xl overflow-hidden bg-black shadow-inner border-4 transition-colors duration-300 ${borderCls}`}>

            {/* Success overlay */}
            {phase === "confirmed" && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-green-900/80 gap-4">
                <CheckCircle2 className="w-20 h-20 text-green-300 drop-shadow-lg" />
                <p className="text-white text-2xl font-bold">Attendance Marked!</p>
                <p className="text-green-200 text-base">{matchedName}</p>
              </div>
            )}

            <Webcam
              key={cameraReloadKey}
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.5}
              videoConstraints={videoConstraints}
              className="w-full h-full object-cover"
              mirrored={true}
              onUserMedia={() => {
                setCameraReady(true);
                setCameraError(null);
                setStatusMsg("Camera ready. Scanning for your face…");
              }}
              onUserMediaError={(err) => {
                setCameraReady(false);
                const errorName = (err as DOMException | undefined)?.name ?? "CameraError";

                // Try the next safer constraint profile automatically.
                if (cameraOptionIndex < VIDEO_CONSTRAINT_OPTIONS.length - 1) {
                  setCameraOptionIndex((v) => v + 1);
                  setStatusMsg("Adjusting camera settings…");
                  return;
                }

                let message = "Unable to access camera. Please allow camera permission and try again.";
                if (errorName === "NotAllowedError" || errorName === "SecurityError") {
                  message = "Camera permission denied. Please allow camera access in browser settings.";
                } else if (errorName === "NotReadableError" || errorName === "TrackStartError") {
                  message = "Camera is busy in another app (Teams/Zoom/Meet). Close other apps and retry.";
                } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
                  message = "No camera device found. Connect a camera and retry.";
                } else if (errorName === "OverconstrainedError" || errorName === "ConstraintNotSatisfiedError") {
                  message = "Camera does not support requested settings. Retry with fallback mode.";
                }
                setCameraError(message);
                setStatusMsg("Camera access failed.");
              }}
            />

            {faceBox && (
              <div
                className="absolute z-20 pointer-events-none transition-all duration-150"
                style={{
                  left: `${(faceBox.x / frameW) * 100}%`,
                  top: `${(faceBox.y / frameH) * 100}%`,
                  width: `${(faceBox.w / frameW) * 100}%`,
                  height: `${(faceBox.h / frameH) * 100}%`,
                }}
              >
                {/* ── Corner Bracket Viewfinder ── */}
                {/* Top-Left */}
                <div className={`absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] ${faceBoxCfg.corner} ${faceBoxCfg.glow}`} />
                {/* Top-Right */}
                <div className={`absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] ${faceBoxCfg.corner} ${faceBoxCfg.glow}`} />
                {/* Bottom-Left */}
                <div className={`absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] ${faceBoxCfg.corner} ${faceBoxCfg.glow}`} />
                {/* Bottom-Right */}
                <div className={`absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] ${faceBoxCfg.corner} ${faceBoxCfg.glow}`} />

                {/* ── Label badge pinned to TOP of box ── */}
                <div className={`absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-xl whitespace-nowrap backdrop-blur-sm ${faceBoxCfg.badge}`}>
                  {faceBoxCfg.icon}
                  {faceBoxCfg.text}
                </div>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-6 text-center">
                <div className="space-y-3">
                  <p className="text-red-200 text-sm">{cameraError}</p>
                  <Button size="sm" variant="secondary" onClick={retryCamera}>
                    Retry Camera
                  </Button>
                </div>
              </div>
            )}

            {/* Scanning pulse overlay */}
            {phase === "scanning" && (
              <div className="absolute inset-0 pointer-events-none border-4 border-blue-400/20 rounded-xl animate-pulse z-20" />
            )}
          </div>

          {/* ── Status pill ──────────────────────────────────────────────── */}
          <div className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium border transition-all w-full max-w-sm justify-center ${pill.cls}`}>
            {pill.icon}
            <span>{statusMsg}</span>
          </div>

          {/* ── Action button ─────────────────────────────────────────────── */}
          {phase !== "confirmed" && (
            <Button
              id="mark-attendance-btn"
              size="lg"
              className="w-full max-w-sm text-lg py-6 shadow-md hover:shadow-xl transition-all"
              disabled={phase !== "recognized" || !cameraReady || !!cameraError}
              onClick={markAttendance}
            >
              {phase === "marking" ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Marking Attendance…
                </>
              ) : phase === "recognized" ? (
                <>
                  <UserCheck className="mr-2 h-5 w-5" />
                  Mark Attendance
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5 opacity-50" />
                  {phase === "unknown" ? "Unknown Face — Cannot Mark" : "Waiting for face…"}
                </>
              )}
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Ensure good lighting and face the camera directly. Only the logged-in employee can mark their own attendance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
