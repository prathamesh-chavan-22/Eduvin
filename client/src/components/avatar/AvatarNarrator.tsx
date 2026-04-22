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
  A: <ellipse cx="60" cy="74" rx="9" ry="3" fill="#c62828" />,
  B: <ellipse cx="60" cy="74" rx="7" ry="5" fill="#c62828" />,
  C: <ellipse cx="60" cy="74" rx="11" ry="6" fill="#b71c1c" />,
  D: (
    <g>
      <ellipse cx="60" cy="74" rx="13" ry="8" fill="#b71c1c" />
      <ellipse cx="60" cy="76" rx="10" ry="4" fill="#7b1fa2" opacity="0.6" />
    </g>
  ),
  X: (
    <path
      d="M52 74 Q60 77 68 74"
      stroke="#c62828"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
  ),
};

function Eye({ cx, cy = 54, blink, dx = 0, dy = 0 }: { cx: number; cy?: number; blink: boolean; dx?: number; dy?: number }) {
  return blink ? (
    <line
      x1={cx - 7}
      y1={cy + 2}
      x2={cx + 7}
      y2={cy + 2}
      stroke="#2d1b0e"
      strokeWidth="3"
      strokeLinecap="round"
    />
  ) : (
    <g>
      <ellipse cx={cx} cy={cy} rx="7" ry="8.5" fill="white" />
      <ellipse cx={cx + dx} cy={cy + 1 + dy} rx="4.5" ry="5.5" fill="#1e3a8a" />
      <ellipse cx={cx + dx} cy={cy + 1.5 + dy} rx="2" ry="3" fill="#0d0d0d" />
      <circle cx={cx - 1.5 + dx} cy={cy - 2 + dy} r="1.8" fill="white" />
      <circle cx={cx + 2 + dx} cy={cy + 3 + dy} r="0.8" fill="white" opacity="0.8" />
    </g>
  );
}

export default function AvatarNarrator({ audioRef, audioUrl }: Props) {
  const [viseme, setViseme] = useState("X");
  const [blink, setBlink] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ dx: 0, dy: 0 });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafIdRef = useRef<number>(0);
  const svgRef = useRef<SVGSVGElement>(null);

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
    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgCenterX = rect.left + rect.width / 2;
      const svgCenterY = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - svgCenterX;
      const deltaY = e.clientY - svgCenterY;
      
      const angle = Math.atan2(deltaY, deltaX);
      const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 150, 1);
      
      const maxDx = 2.5;
      const maxDy = 3.0;
      
      setEyeOffset({
        dx: Math.cos(angle) * distance * maxDx,
        dy: Math.sin(angle) * distance * maxDy,
      });
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
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
      ref={svgRef}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Course narrator avatar"
      role="img"
      className="w-full h-full select-none"
    >
      {/* Background Shadow */}
      <ellipse cx="60" cy="116" rx="35" ry="4" fill="black" opacity="0.1" />

      {/* Back Hair */}
      <path d="M 30 50 C 20 70, 20 110, 35 120 L 85 120 C 100 110, 100 70, 90 50 C 90 0, 30 0, 30 50 Z" fill="#2d1b0e" />
      
      {/* Neck */}
      <path d="M 50 80 L 70 80 L 68 100 L 52 100 Z" fill="#f5c7ad" />
      <path d="M 50 80 L 70 80 L 69 88 L 51 88 Z" fill="#e0a382" opacity="0.6" />

      {/* Torso/Shirt */}
      <path d="M 35 120 C 35 95, 45 90, 60 90 C 75 90, 85 95, 85 120 Z" fill="#2563eb" />
      {/* Shoulders / Arms */}
      <path d="M 35 95 C 25 100, 20 110, 20 120 L 35 120 Z" fill="#3b82f6" />
      <path d="M 85 95 C 95 100, 100 110, 100 120 L 85 120 Z" fill="#3b82f6" />
      {/* Collar */}
      <path d="M 52 90 L 68 90 L 60 98 Z" fill="#1e40af" />

      {/* Head (Base) */}
      <ellipse cx="60" cy="55" rx="28" ry="32" fill="#ffe0d2" />
      
      {/* Cheeks */}
      <ellipse cx="42" cy="62" rx="5" ry="3" fill="#ffb6b9" opacity="0.7" />
      <ellipse cx="78" cy="62" rx="5" ry="3" fill="#ffb6b9" opacity="0.7" />

      {/* Eyes */}
      <Eye cx={46} cy={54} blink={blink} dx={eyeOffset.dx} dy={eyeOffset.dy} />
      <Eye cx={74} cy={54} blink={blink} dx={eyeOffset.dx} dy={eyeOffset.dy} />

      {/* Eyebrows */}
      <path d="M 38 46 Q 46 42 52 46" stroke="#2d1b0e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 82 46 Q 74 42 68 46" stroke="#2d1b0e" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Nose */}
      <path d="M 60 62 C 60 62, 58 65, 60 66 C 62 65, 60 62, 60 62 Z" fill="#e0a382" />

      {mouthShape}

      {/* Front Hair / Bangs */}
      <path d="M 28 50 C 28 0, 92 0, 92 50 C 92 60, 85 65, 80 50 C 75 35, 65 35, 60 40 C 55 35, 45 35, 40 50 C 35 65, 28 60, 28 50 Z" fill="#2d1b0e" />
      
      {/* Side Hair Strands */}
      <path d="M 32 45 C 28 70, 32 90, 38 100 C 42 80, 38 60, 38 45 Z" fill="#3a2312" />
      <path d="M 88 45 C 92 70, 88 90, 82 100 C 78 80, 82 60, 82 45 Z" fill="#3a2312" />
    </svg>
  );
}
