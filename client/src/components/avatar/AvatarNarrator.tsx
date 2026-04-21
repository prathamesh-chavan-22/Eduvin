/**
 * AvatarNarrator – Duolingo-style SVG mascot that lip-syncs to course narration.
 *
 * Props:
 *   audioRef    – shared ref pointing at the course player <audio> element
 *   lipSyncUrl  – URL of the Rhubarb JSON timeline (optional; falls back to idle)
 */
import { useEffect, useRef, useState } from "react";
import { pickVisemeAtTime, type MouthCue } from "./viseme";

type Props = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  lipSyncUrl?: string | null;
};

// ─── Mouth shape paths keyed by Rhubarb viseme ───────────────────────────────
// Each value is an SVG <path d="…"> or a simple shape descriptor rendered below.
const MOUTH_SHAPES: Record<string, React.ReactNode> = {
  // Closed / M-B-P
  A: <ellipse cx="60" cy="88" rx="12" ry="3" fill="#c62828" />,
  // Small open / EE
  B: <ellipse cx="60" cy="88" rx="10" ry="5" fill="#c62828" />,
  // E
  C: <ellipse cx="60" cy="88" rx="14" ry="6" fill="#b71c1c" />,
  // AI – wide open
  D: (
    <g>
      <ellipse cx="60" cy="88" rx="16" ry="9" fill="#b71c1c" />
      <ellipse cx="60" cy="90" rx="13" ry="5" fill="#7b1fa2" opacity="0.6" />
    </g>
  ),
  // O – round open
  E: (
    <g>
      <ellipse cx="60" cy="88" rx="10" ry="11" fill="#b71c1c" />
      <ellipse cx="60" cy="90" rx="7" ry="7" fill="#7b1fa2" opacity="0.5" />
    </g>
  ),
  // W / Q – puckered
  F: <ellipse cx="60" cy="88" rx="8" ry="8" fill="#c62828" />,
  // F / V – bottom-lip-over
  G: (
    <g>
      <ellipse cx="60" cy="88" rx="13" ry="5" fill="#b71c1c" />
      <rect x="48" y="88" width="24" height="4" rx="2" fill="#e57373" opacity="0.7" />
    </g>
  ),
  // L
  H: (
    <g>
      <ellipse cx="60" cy="88" rx="14" ry="7" fill="#b71c1c" />
      <ellipse cx="60" cy="84" rx="5" ry="3" fill="#ffccbc" opacity="0.8" />
    </g>
  ),
  // Rest / silence
  X: (
    <path
      d="M48 88 Q60 92 72 88"
      stroke="#c62828"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
  ),
};

// ─── Eye shapes ──────────────────────────────────────────────────────────────
function Eye({ cx, blink }: { cx: number; blink: boolean }) {
  return blink ? (
    // closed – a thin horizontal line
    <line
      x1={cx - 8}
      y1={62}
      x2={cx + 8}
      y2={62}
      stroke="#1a1a2e"
      strokeWidth="3"
      strokeLinecap="round"
    />
  ) : (
    <g>
      <ellipse cx={cx} cy={62} rx="9" ry="10" fill="white" />
      <ellipse cx={cx} cy={63} rx="5.5" ry="6" fill="#1a237e" />
      <ellipse cx={cx} cy={63} rx="2.5" ry="3" fill="#0d0d0d" />
      {/* catchlight */}
      <circle cx={cx + 3} cy={60} r="1.8" fill="white" />
    </g>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AvatarNarrator({ audioRef, lipSyncUrl }: Props) {
  const [cues, setCues] = useState<MouthCue[]>([]);
  const [viseme, setViseme] = useState("X");
  const [blink, setBlink] = useState(false);
  const rafIdRef = useRef<number>(0);

  // Load timeline JSON whenever the module changes
  useEffect(() => {
    if (!lipSyncUrl) {
      setCues([]);
      setViseme("X");
      return;
    }
    fetch(lipSyncUrl)
      .then((r) => (r.ok ? r.json() : { mouthCues: [] }))
      .then((data) =>
        setCues(Array.isArray(data?.mouthCues) ? data.mouthCues : [])
      )
      .catch(() => setCues([]));
  }, [lipSyncUrl]);

  // Periodic blink every ~3.2 s
  useEffect(() => {
    const blinkOnce = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    };
    const id = setInterval(blinkOnce, 3200);
    return () => clearInterval(id);
  }, []);

  // rAF loop — poll audio.currentTime and update viseme
  useEffect(() => {
    const tick = () => {
      const t = audioRef.current?.currentTime ?? 0;
      setViseme(pickVisemeAtTime(cues, t));
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [audioRef, cues]);

  const mouthShape = MOUTH_SHAPES[viseme] ?? MOUTH_SHAPES["X"];

  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Course narrator avatar"
      role="img"
      className="w-full h-full select-none"
    >
      {/* Shadow */}
      <ellipse cx="60" cy="116" rx="30" ry="5" fill="black" opacity="0.08" />

      {/* Head */}
      <circle cx="60" cy="60" r="50" fill="#FFA726" />

      {/* Cheek blush */}
      <ellipse cx="35" cy="78" rx="9" ry="6" fill="#FF7043" opacity="0.35" />
      <ellipse cx="85" cy="78" rx="9" ry="6" fill="#FF7043" opacity="0.35" />

      {/* Eyes */}
      <Eye cx={40} blink={blink} />
      <Eye cx={80} blink={blink} />

      {/* Eyebrows */}
      <path
        d="M31 50 Q40 46 49 50"
        stroke="#5D4037"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M71 50 Q80 46 89 50"
        stroke="#5D4037"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Nose */}
      <ellipse cx="60" cy="76" rx="4" ry="3" fill="#E64A19" opacity="0.55" />

      {/* Mouth area (white base) */}
      <ellipse cx="60" cy="88" rx="18" ry="12" fill="#FFCCBC" />

      {/* Animated mouth shape */}
      {mouthShape}
    </svg>
  );
}
