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
  A: (
    <g>
      <ellipse cx="60" cy="74" rx="6" ry="3" fill="#691a1a" />
      <ellipse cx="60" cy="75" rx="4" ry="1.5" fill="#ef4444" opacity="0.8" />
    </g>
  ),
  B: (
    <g>
      <ellipse cx="60" cy="74" rx="5" ry="4" fill="#691a1a" />
      <path d="M 56 72 Q 60 74 64 72 L 64 73 Q 60 75 56 73 Z" fill="#ffffff" opacity="0.9" />
    </g>
  ),
  C: (
    <g>
      <ellipse cx="60" cy="74" rx="8" ry="5" fill="#691a1a" />
      <path d="M 54 71.5 Q 60 74 66 71.5 Q 60 75 54 71.5 Z" fill="#ffffff" opacity="0.9" />
      <ellipse cx="60" cy="76" rx="4" ry="2" fill="#ef4444" opacity="0.8" />
    </g>
  ),
  D: (
    <g>
      <ellipse cx="60" cy="75" rx="10" ry="7" fill="#691a1a" />
      <path d="M 52 71 Q 60 74 68 71 Q 60 75 52 71 Z" fill="#ffffff" opacity="0.9" />
      <ellipse cx="60" cy="78" rx="6" ry="3" fill="#ef4444" opacity="0.9" />
    </g>
  ),
  X: (
    <path d="M 55 74 Q 60 76 65 74" stroke="#8b4513" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
  ),
};

function Eye({ cx, cy = 54, blink, dx = 0, dy = 0 }: { cx: number; cy?: number; blink: boolean; dx?: number; dy?: number }) {
  return blink ? (
    <g>
      <path d={`M ${cx - 8} ${cy + 2} Q ${cx} ${cy + 4} ${cx + 8} ${cy + 2}`} stroke="#2d1b0e" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ) : (
    <g>
      <ellipse cx={cx} cy={cy} rx="8.5" ry="9.5" fill="#ffffff" />
      <ellipse cx={cx + dx} cy={cy + 1 + dy} rx="5" ry="6" fill="url(#irisGrad)" />
      <ellipse cx={cx + dx} cy={cy + 1.5 + dy} rx="2.5" ry="3.5" fill="#0f172a" />
      <circle cx={cx - 1.5 + dx} cy={cy - 2 + dy} r="2" fill="white" opacity="0.9" />
      <circle cx={cx + 2 + dx} cy={cy + 3 + dy} r="1" fill="white" opacity="0.5" />
      <path d={`M ${cx - 8} ${cy - 2} Q ${cx} ${cy - 10} ${cx + 8} ${cy - 2}`} stroke="#2d1b0e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
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
      <defs>
        <radialGradient id="skinGrad" cx="50%" cy="50%" r="50%">
          <stop offset="30%" stopColor="#ffeadf" />
          <stop offset="85%" stopColor="#f5c7ad" />
          <stop offset="100%" stopColor="#e0a382" />
        </radialGradient>
        <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
          <stop offset="30%" stopColor="#60a5fa" />
          <stop offset="80%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
        <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a2e1b" />
          <stop offset="50%" stopColor="#2d1b0e" />
          <stop offset="100%" stopColor="#160d07" />
        </linearGradient>
        <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="20%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="neckShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#b07b62" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#e0a382" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Background Shadow */}
      <ellipse cx="60" cy="116" rx="35" ry="4" fill="black" opacity="0.15" />

      {/* Back Hair - fuller bob style */}
      <path d="M 22 55 C 10 75, 10 115, 30 120 L 90 120 C 110 115, 110 75, 98 55 C 98 -5, 22 -5, 22 55 Z" fill="url(#hairGrad)" />
      
      {/* Neck */}
      <path d="M 50 80 L 70 80 L 68 102 L 52 102 Z" fill="url(#skinGrad)" />
      {/* Neck Shadow under chin */}
      <path d="M 50 80 L 70 80 L 69 88 L 51 88 Z" fill="url(#neckShadow)" />

      {/* Torso/Shirt */}
      <path d="M 35 120 C 35 95, 45 90, 60 90 C 75 90, 85 95, 85 120 Z" fill="url(#shirtGrad)" />
      {/* Shoulders / Arms */}
      <path d="M 35 95 C 20 100, 15 110, 15 120 L 35 120 Z" fill="url(#shirtGrad)" />
      <path d="M 85 95 C 100 100, 105 110, 105 120 L 85 120 Z" fill="url(#shirtGrad)" />
      {/* Collar */}
      <path d="M 50 90 C 55 94, 65 94, 70 90 L 60 100 Z" fill="#1e3a8a" />

      {/* Head (Base) - Soft friendly shape */}
      <ellipse cx="60" cy="55" rx="30" ry="32" fill="url(#skinGrad)" />
      
      {/* Cheeks */}
      <ellipse cx="42" cy="62" rx="7" ry="4" fill="#ffb6b9" opacity="0.5" />
      <ellipse cx="78" cy="62" rx="7" ry="4" fill="#ffb6b9" opacity="0.5" />

      {/* Eyes */}
      <Eye cx={45} cy={53} blink={blink} dx={eyeOffset.dx} dy={eyeOffset.dy} />
      <Eye cx={75} cy={53} blink={blink} dx={eyeOffset.dx} dy={eyeOffset.dy} />

      {/* Eyebrows */}
      <path d="M 36 45 Q 44 41 51 42" stroke="#4a2e1b" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 84 45 Q 76 41 69 42" stroke="#4a2e1b" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Nose - soft and simple */}
      <path d="M 58 64 Q 60 67 62 64" stroke="#c07e60" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />

      {mouthShape}

      {/* Front Hair / Bangs */}
      <path d="M 28 50 C 28 5, 92 5, 92 50 C 92 65, 85 70, 80 50 C 75 25, 65 25, 60 32 C 55 25, 45 25, 40 50 C 35 70, 28 65, 28 50 Z" fill="url(#hairGrad)" />
      
      {/* Side Hair Strands - more defined */}
      <path d="M 30 45 C 22 75, 28 105, 40 115 C 45 95, 38 65, 38 45 Z" fill="url(#hairGrad)" />
      <path d="M 90 45 C 98 75, 92 105, 80 115 C 75 95, 82 65, 82 45 Z" fill="url(#hairGrad)" />
      
      {/* Hair Highlights */}
      <path d="M 40 20 Q 50 15 60 20" stroke="#6b452c" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M 60 20 Q 70 15 80 20" stroke="#6b452c" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />

    </svg>
  );
}
