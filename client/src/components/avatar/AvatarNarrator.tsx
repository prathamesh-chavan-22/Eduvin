/**
 * AvatarNarrator – Duolingo-style SVG mascot that lip-syncs to course narration.
 * 
 * This version uses real-time Web Audio API analysis (Amplitude-based) 
 * instead of pre-processed Rhubarb JSON timelines.
 */
import { useEffect, useRef, useState } from "react";

type Props = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioUrl?: string | null;
};

// ─── Mouth shape paths ───────────────────────────────────────────────────────
const MOUTH_SHAPES: Record<string, React.ReactNode> = {
  A: <ellipse cx="60" cy="88" rx="12" ry="3" fill="#c62828" />,
  B: <ellipse cx="60" cy="88" rx="10" ry="5" fill="#c62828" />,
  C: <ellipse cx="60" cy="88" rx="14" ry="6" fill="#b71c1c" />,
  D: (
    <g>
      <ellipse cx="60" cy="88" rx="16" ry="9" fill="#b71c1c" />
      <ellipse cx="60" cy="90" rx="13" ry="5" fill="#7b1fa2" opacity="0.6" />
    </g>
  ),
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

function Eye({ cx, blink }: { cx: number; blink: boolean }) {
  return blink ? (
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
      <circle cx={cx + 3} cy={60} r="1.8" fill="white" />
    </g>
  );
}

export default function AvatarNarrator({ audioRef, audioUrl }: Props) {
  const [viseme, setViseme] = useState("X");
  const [blink, setBlink] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafIdRef = useRef<number>(0);

  useEffect(() => {
    // Periodic blink every ~3.2 s
    const blinkOnce = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    };
    const id = setInterval(blinkOnce, 3200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Initialize Web Audio API on first interaction or mount
    const setupAudio = () => {
      if (!audioContextRef.current) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      if (!sourceRef.current && audioContextRef.current && analyserRef.current) {
        try {
          sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
        } catch (err) {
          console.warn("MediaElementAudioSourceNode could not be created or connected. It might already be connected.", err);
        }
      }

      // Resume context if it was suspended (browser policy)
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
    };

    // Trigger setup on play or interaction
    const handlePlay = () => setupAudio();
    audio.addEventListener("play", handlePlay);

    // Animation loop
    const dataArray = new Uint8Array(128); // half of fftSize
    const tick = () => {
      // Only animate if audio is playing AND it matches the specific source we want
      const isPlaying = audio && !audio.paused && !audio.ended;
      const isCorrectSource = !audioUrl || (audio && audio.src.includes(audioUrl));

      if (analyserRef.current && isPlaying && isCorrectSource) {
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        // Map average volume to viseme
        // Typical speech average volume in byte frequency data is 30-80
        if (average < 2) setViseme("X");
        else if (average < 15) setViseme("A");
        else if (average < 35) setViseme("B");
        else if (average < 60) setViseme("C");
        else setViseme("D");
      } else if (audio?.paused || audio?.ended) {
        setViseme("X");
      }
      
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      audio.removeEventListener("play", handlePlay);
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [audioRef]);

  const mouthShape = MOUTH_SHAPES[viseme] || MOUTH_SHAPES["X"];

  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Course narrator avatar"
      role="img"
      className="w-full h-full select-none"
    >
      <ellipse cx="60" cy="116" rx="30" ry="5" fill="black" opacity="0.08" />
      <circle cx="60" cy="60" r="50" fill="#FFA726" />
      <ellipse cx="35" cy="78" rx="9" ry="6" fill="#FF7043" opacity="0.35" />
      <ellipse cx="85" cy="78" rx="9" ry="6" fill="#FF7043" opacity="0.35" />
      <Eye cx={40} blink={blink} />
      <Eye cx={80} blink={blink} />
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
      <ellipse cx="60" cy="76" rx="4" ry="3" fill="#E64A19" opacity="0.55" />
      <ellipse cx="60" cy="88" rx="18" ry="12" fill="#FFCCBC" />
      {mouthShape}
    </svg>
  );
}
