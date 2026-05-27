import { useCallback, useEffect, useRef, useState } from "react";
import { PostureArc } from "../components/PostureArc";
import { MetricStrip } from "../components/MetricStrip";
import { classify, badReason } from "../lib/classify";
import { generatePacket, resetSimulator } from "../lib/simulator";

const synth = typeof window !== "undefined" && window.speechSynthesis;
function speak(text) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.1; u.pitch = 1;
  synth.speak(u);
}

function BleChip({ bleStatus }) {
  if (bleStatus === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#10B981] bg-[rgba(16,185,129,0.06)] px-2.5 py-0.5 rounded-full border border-[rgba(16,185,129,0.25)] tracking-wider uppercase select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
        Live
      </span>
    );
  }
  if (bleStatus === "stale") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#F59E0B] bg-[rgba(245,158,11,0.06)] px-2.5 py-0.5 rounded-full border border-[rgba(245,158,11,0.25)] tracking-wider uppercase select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-ping" />
        Sync
      </span>
    );
  }
  if (bleStatus === "disconnected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#EF4444] bg-[rgba(239,68,68,0.06)] px-2.5 py-0.5 rounded-full border border-[rgba(239,68,68,0.25)] tracking-wider uppercase select-none">
        Offline
      </span>
    );
  }
  return null;
}

export function RunningMan({ color, strideSec, size = 24 }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color} 
      strokeWidth="2.8" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="opacity-95"
    >
      {/* Head */}
      <circle cx="12" cy="5" r="1.8" fill={color} stroke="none" />
      
      {/* Torso */}
      <line x1="12" y1="7" x2="12" y2="13" />
      
      {/* Left Arm */}
      <path d="M 12 8 L 9 11 L 11 14" />
      
      {/* Right Arm */}
      <path d="M 12 8 L 15 11 L 13 14" />
      
      {/* Left Leg */}
      <path d="M 12 13 L 10 17 L 13 20" />
      
      {/* Right Leg */}
      <path d="M 12 13 L 14 17 L 11 20" />
    </svg>
  );
}

export function WorkoutLogoRing({ score, strideSec }) {
  const color = score >= 75 ? "#00FF66" : score >= 50 ? "#F59E0B" : "#FF3333";
  const strokeDashoffset = 75.4 - (score / 100 * 75.4); // 2 * PI * r (r=12)
  
  return (
    <div className="relative w-11 h-11 flex items-center justify-center flex-shrink-0">
      {/* Background Track Ring */}
      <svg width="44" height="44" viewBox="0 0 32 32" className="-rotate-90">
        <circle 
          cx="16" cy="16" r="12" 
          fill="none" 
          stroke="rgba(255, 255, 255, 0.08)" 
          strokeWidth="3.8" 
        />
        {/* Dynamic score ring */}
        <circle 
          cx="16" cy="16" r="12" 
          fill="none" 
          stroke={color} 
          strokeWidth="3.8" 
          strokeDasharray="75.4"
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      
      {/* Animating running man stick figure inside circle */}
      <div className="absolute inset-0 flex items-center justify-center">
        <RunningMan color="#00E5FF" strideSec={strideSec} size={22} />
      </div>
    </div>
  );
}

export function PacingSlider({ score, formState }) {
  const color = formState === "GOOD" ? "#00FF66" : "#FF3333";
  return (
    <div className="w-full max-w-[320px] h-[40px] flex items-center relative select-none mx-auto">
      {/* Background Track with zone divisions */}
      <div className="absolute inset-x-0 h-3 rounded-full overflow-hidden bg-gradient-to-r from-[#FF3333]/20 via-[#F59E0B]/20 to-[#00FF66]/20 border border-[rgba(255,255,255,0.06)]" />
      
      {/* Sliding Pacing Bubble (Pill shape) */}
      <div 
        className="absolute h-8.5 px-4 rounded-full flex items-center justify-center font-black text-xs select-none transition-all duration-300 ease-out uppercase tracking-widest"
        style={{
          left: `calc(${score}% - ${score * 0.72}px)`, // Adjusts to keep the 72px wide bubble inside viewport bounds
          backgroundColor: color,
          color: "#000000",
          boxShadow: `0 0 12px ${color}60`,
          minWidth: "72px",
        }}
      >
        {formState}
      </div>
    </div>
  );
}

export function Dashboard({ mode, setMode, bleLatest, bleStatus, onNavigate, session }) {
  const [metrics,    setMetrics]    = useState(null);
  const [formState,  setFormState]  = useState("GOOD");
  const [hint,       setHint]       = useState(null);
  const [voice,      setVoice]      = useState(false);
  const [centiSeconds, setCentiSeconds] = useState("00");
  const [wallClock, setWallClock] = useState("10:09");
  
  const seqRef      = useRef(0);
  const simRef      = useRef(null);
  const lastFormRef = useRef("GOOD");

  // Dynamic wall clock effect
  useEffect(() => {
    const update = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      setWallClock(`${h}:${m}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // Centiseconds rolling effect when workout is active
  useEffect(() => {
    if (!session.running) { setCentiSeconds("00"); return; }
    let frame;
    const update = () => {
      const ms = Date.now() % 1000;
      setCentiSeconds(String(Math.floor(ms / 10)).padStart(2, "0"));
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [session.running]);

  const applyPacket = useCallback((packet) => {
    const form = packet.form !== null
      ? (packet.form === 0 ? "GOOD" : "BAD")   // model result from UNO Q
      : classify(packet);                       // demo threshold fallback

    const reason = form === "BAD" ? badReason(packet) : null;
    setMetrics(packet);
    setFormState(form);
    setHint(reason);
    if (!session.running) session.startSession();
    session.recordPacket(packet, form);
    // voice alert on state transition
    if (voice && form !== lastFormRef.current) {
      speak(form === "BAD" ? `Bad form. ${reason ?? ""}` : "Good form.");
    }
    lastFormRef.current = form;
  }, [session, voice]);

  // Demo mode: tick every 500 ms
  useEffect(() => {
    if (mode !== "demo") { clearInterval(simRef.current); return; }
    resetSimulator();
    simRef.current = setInterval(() => {
      seqRef.current += 1;
      applyPacket(generatePacket(seqRef.current));
    }, 500);
    return () => clearInterval(simRef.current);
  }, [mode, applyPacket]);

  // BLE mode: consume latest packet from useBle
  useEffect(() => {
    if (mode !== "ble" || !bleLatest) return;
    applyPacket(bleLatest);
  }, [mode, bleLatest, applyPacket]);

  const isGood = formState === "GOOD";

  const cadence = metrics?.c ?? 170;
  const strideSec = (60 / cadence).toFixed(3);
  
  const asym = metrics?.asym ?? 2;
  const fs = metrics?.fs ?? 0;
  const heelStrike = fs === 1;

  // Theming colors based on posture alerts and asymmetries
  const color = isGood ? "#00FF66" : "#FF3333";
  const colorL = asym > 10 ? "#FF3333" : asym > 5 ? "#F59E0B" : color;
  const colorR = asym > 10 ? "#F59E0B" : color;

  // Compute live Form Score (0 - 100) dynamically based on all 7 parameters
  const formScore = (() => {
    if (!metrics) return 100;
    const { c, vo, gct, vgrf, lean } = metrics;
    let score = 100;
    
    // 1. Cadence (ideal: 180+ spm)
    if (c < 180) score -= Math.max(0, 180 - c) * 0.65;
    // 2. Bounce / VO (ideal: <= 6 cm)
    if (vo > 6) score -= Math.max(0, vo - 6) * 3.5;
    // 3. Ground Contact Time (ideal: <= 220 ms)
    if (gct > 220) score -= Math.max(0, gct - 220) * 0.15;
    // 4. Impact Force (ideal: <= 1.8 g)
    if (vgrf > 1.8) score -= Math.max(0, vgrf - 1.8) * 15;
    // 5. Trunk Lean (ideal: <= 10 deg)
    if (lean > 10) score -= Math.max(0, lean - 10) * 2.5;
    // 6. Balance / Asym (ideal: <= 2%)
    score -= asym * 2.0;
    // 7. Foot Strike (ideal: mid/forefoot, fs === 0)
    if (fs === 1) score -= 15;
    
    return Math.round(Math.max(0, Math.min(100, score)));
  })();

  return (
    <main className="h-screen flex flex-col bg-[#000000] text-white overflow-hidden justify-between pt-[max(12px,env(safe-area-inset-top))] px-4 pb-[max(12px,env(safe-area-inset-bottom))] relative font-sans">

      {/* Synchronized Dashboard Cadence Blinking Metronomes (Physical Stepping Motion) */}
      <style>{`
        .db-lf-blink { animation: dbBlinkLeft ${strideSec}s ease-in-out infinite; }
        .db-rf-blink { animation: dbBlinkRight ${strideSec}s ease-in-out infinite; }
        .db-lf-blob { animation: dbBlobLeft ${strideSec}s ease-in-out infinite; }
        .db-rf-blob { animation: dbBlobRight ${strideSec}s ease-in-out infinite; }

        @keyframes dbBlobLeft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.15; }
        }
        @keyframes dbBlobRight {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 1; }
        }

        @keyframes dbBlinkLeft {
          0%, 100% {
            transform: scale(1.15) translateY(-43%);
            background-color: rgba(255, 255, 255, 0.08);
            border-color: ${colorL};
            box-shadow: 0 0 20px ${colorL}60;
            opacity: 1;
          }
          50% {
            transform: scale(0.9) translateY(-57%);
            background-color: rgba(255, 255, 255, 0.02);
            border-color: rgba(255, 255, 255, 0.04);
            box-shadow: none;
            opacity: 0.35;
          }
        }
        @keyframes dbBlinkRight {
          0%, 100% {
            transform: scale(0.9) translateY(-57%);
            background-color: rgba(255, 255, 255, 0.02);
            border-color: rgba(255, 255, 255, 0.04);
            box-shadow: none;
            opacity: 0.35;
          }
          50% {
            transform: scale(1.15) translateY(-43%);
            background-color: rgba(255, 255, 255, 0.08);
            border-color: ${colorR};
            box-shadow: 0 0 20px ${colorR}60;
            opacity: 1;
          }
        }
      `}</style>

      {/* ── LOCKED HEIGHT HUD STATUS HEADER ── */}
      <div 
        className="flex items-center justify-end select-none px-1 h-11 flex-shrink-0"
      >
        <div className="text-[15px] font-black text-[rgba(255,255,255,0.7)] tracking-wide font-mono">
          {wallClock}
        </div>
      </div>

      {/* ── 2. WORKOUT MASSIVE NEON YELLOW TIMER ── */}
      <div className="text-center select-none py-1.5 flex-shrink-0">
        <div className="text-6xl font-black font-mono tracking-tight text-[#FFFF00] leading-none drop-shadow-[0_2px_10px_rgba(255,255,0,0.2)]">
          {session.elapsedFmt}<span className="text-4xl font-black opacity-85">.{centiSeconds}</span>
        </div>
      </div>

      {/* ── 3. HORIZONTAL PACING SCORE GAUGE ── */}
      <div className="w-full select-none flex-shrink-0">
        <PacingSlider score={formScore} formState={formState} />
      </div>

      {/* ── 4. BIOMECHANICAL CENTRAL HUB (Minimalist Scope with Edge Metronomes) ── */}
      <div className="flex-1 flex items-center justify-center min-h-0 select-none w-full relative py-2.5">
        
        {/* LEFT GIANT FOOT SOLE metronome card (Absolutely pinned to left border) */}
        <div 
          className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-[20px] p-2.5 flex flex-col items-center justify-between h-[210px] w-[64px] overflow-hidden select-none transition-all duration-300 db-lf-blink"
        >
          <span className="text-[11px] font-black tracking-widest text-[rgba(255,255,255,0.35)]">L</span>
          <svg width="36" height="78" viewBox="0 0 24 50">
            <defs>
              <filter id="soleGlow" x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur stdDeviation="3.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g transform="translate(0, 50) scale(1, -1)">
              <path 
                d="M 5 35 C 5 42, 9 46, 14 46 C 19 46, 21 42, 20 34 C 18 26, 21 20, 18 12 C 16 6, 10 6, 8 12 C 6 18, 5 25, 5 35 Z" 
                fill="rgba(255, 255, 255, 0.02)" 
                stroke="rgba(255, 255, 255, 0.16)" 
                strokeWidth="2.0"
              />
              {heelStrike ? (
                <ellipse cx="13" cy="38" rx="6.5" ry="6.5" fill="#FF3333" filter="url(#soleGlow)" className="db-lf-blob" />
              ) : (
                <ellipse cx="13" cy="14" rx="6.5" ry="8" fill="#00FF66" filter="url(#soleGlow)" className="db-lf-blob" />
              )}
            </g>
          </svg>
          <span 
            className="text-[10px] font-black tracking-widest uppercase truncate max-w-full"
            style={{ color: heelStrike ? "#FF3333" : "#00FF66" }}
          >
            {heelStrike ? "HEEL" : "MID"}
          </span>
        </div>

        {/* CENTRAL DIAGNOSTIC HUD SCOPE CARD (Sleek Watch-Style Outline) */}
        <div 
          className={`rounded-[28px] p-3.5 w-full max-w-[230px] aspect-[160/175] flex items-center justify-center relative overflow-hidden transition-all duration-500 bg-black ${
            isGood ? "border border-[rgba(0,255,102,0.18)] shadow-[0_0_24px_rgba(0,255,102,0.08)]" : "border border-[rgba(255,51,51,0.18)] shadow-[0_0_24px_rgba(255,51,51,0.08)]"
          }`}
        >
          {/* Target Reticle ticks */}
          <div className="absolute top-3.5 left-3.5 w-3.5 h-3.5 border-t border-l rounded-tl opacity-35" style={{ borderColor: color }} />
          <div className="absolute top-3.5 right-3.5 w-3.5 h-3.5 border-t border-r rounded-tr opacity-35" style={{ borderColor: color }} />
          <div className="absolute bottom-3.5 left-3.5 w-3.5 h-3.5 border-b border-l rounded-bl opacity-35" style={{ borderColor: color }} />
          <div className="absolute bottom-3.5 right-3.5 w-3.5 h-3.5 border-b border-r rounded-br opacity-35" style={{ borderColor: color }} />
          
          <PostureArc metrics={metrics} formState={formState} />
        </div>

        {/* RIGHT GIANT FOOT SOLE metronome card (Absolutely pinned to right border) */}
        <div 
          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-[20px] p-2.5 flex flex-col items-center justify-between h-[210px] w-[64px] overflow-hidden select-none transition-all duration-300 db-rf-blink"
        >
          <span className="text-[11px] font-black tracking-widest text-[rgba(255,255,255,0.35)]">R</span>
          <svg width="36" height="78" viewBox="0 0 24 50">
            <g transform="translate(24, 50) scale(-1, -1)">
              <path 
                d="M 5 35 C 5 42, 9 46, 14 46 C 19 46, 21 42, 20 34 C 18 26, 21 20, 18 12 C 16 6, 10 6, 8 12 C 6 18, 5 25, 5 35 Z" 
                fill="rgba(255, 255, 255, 0.02)" 
                stroke="rgba(255, 255, 255, 0.16)" 
                strokeWidth="2.0"
              />
              {heelStrike ? (
                <ellipse cx="13" cy="38" rx="6.5" ry="6.5" fill="#FF3333" filter="url(#soleGlow)" className="db-rf-blob" />
              ) : (
                <ellipse cx="13" cy="14" rx="6.5" ry="8" fill="#00FF66" filter="url(#soleGlow)" className="db-rf-blob" />
              )}
            </g>
          </svg>
          <span 
            className="text-[10px] font-black tracking-widest uppercase truncate max-w-full"
            style={{ color: heelStrike ? "#FF3333" : "#00FF66" }}
          >
            {heelStrike ? "HEEL" : "MID"}
          </span>
        </div>

      </div>

      {/* ── 5. Watch Telemetry borderless Grid ── */}
      <div className="w-full flex flex-col gap-3 select-none pt-2 pb-1.5 flex-shrink-0">
        <div className="flex items-center justify-between px-1 select-none">
          <span className="text-[11px] font-black text-gray-400 tracking-widest uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
            Telemetry Metrics
          </span>
          {mode === "ble" && <BleChip bleStatus={bleStatus} />}
        </div>
        
        {/* Borderless Apple-Watch Style Metrics Grid */}
        <MetricStrip metrics={metrics} />
      </div>

      {/* ── 6. COMPLICATION WATCH DOCK (Circular translucent gray buttons) ── */}
      <div className="flex items-center justify-between gap-3 px-1.5 py-1.5 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0 select-none">
        
        {/* Toggle Mode pill */}
        <div className="flex bg-[rgba(255,255,255,0.05)] rounded-full p-0.5 max-w-[110px] flex-1">
          {["demo", "ble"].map((m) => (
            <button 
              key={m} 
              onClick={() => setMode(m)} 
              className={`flex-1 h-7.5 rounded-full border-none cursor-pointer font-black text-[10px] tracking-wider uppercase transition-all duration-150 ${
                mode === m 
                  ? "bg-[#00FF66] text-[#000000] font-black" 
                  : "bg-transparent text-[rgba(255,255,255,0.5)] hover:text-white"
              }`}
            >
              {m === "demo" ? "DEM" : "LIVE"}
            </button>
          ))}
        </div>

        {/* Circular Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Audio Speaker Mute Toggle */}
          <button 
            onClick={() => setVoice(v => !v)} 
            className={`w-9 h-9 rounded-full border-none cursor-pointer flex items-center justify-center transition-all duration-150 ${
              voice 
                ? "bg-[#00E5FF] text-black" 
                : "bg-[rgba(255,255,255,0.07)] text-[rgba(255,255,255,0.7)]"
            }`}
            title="Voice alerts"
          >
            {voice ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            )}
          </button>
          
          {/* Pause / Resume Pill */}
          <button 
            onClick={() => session.running ? session.pauseSession() : session.startSession()} 
            className="h-9 rounded-full text-[11px] font-black cursor-pointer border-none bg-[#FFFF00] text-black hover:opacity-90 transition-all duration-150 select-none flex items-center gap-1.5 px-4.5"
          >
            {session.running ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                PAUSE
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                RUN
              </>
            )}
          </button>
 
          {/* Reset button */}
          <button 
            onClick={() => { session.resetSession(); resetSimulator(); }} 
            className="w-9 h-9 rounded-full border-none cursor-pointer flex items-center justify-center bg-[rgba(255,255,255,0.07)] text-[rgba(255,255,255,0.7)]"
            title="Reset"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          </button>
 
          {/* Settings button */}
          <button 
            onClick={() => onNavigate("settings")} 
            className="w-9 h-9 rounded-full border-none cursor-pointer flex items-center justify-center bg-[rgba(255,255,255,0.07)] text-[rgba(255,255,255,0.7)]"
            title="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
 
          {/* Stop / End button */}
          <button 
            onClick={() => { session.pauseSession(); onNavigate("summary"); }} 
            className="w-9 h-9 rounded-full border-none cursor-pointer flex items-center justify-center bg-[#FF3333] text-white hover:opacity-90 font-black text-[10px]"
            title="End Run"
          >
            END
          </button>
        </div>
      </div>
 
      {/* ── 7. APPLE WATCH PAGE DOTS INDICATOR ── */}
      <div className="flex justify-center gap-2 py-1 select-none flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-[rgba(255,255,255,0.2)]" />
        <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_4px_white]" />
        <span className="w-2 h-2 rounded-full bg-[rgba(255,255,255,0.2)]" />
      </div>

    </main>
  );
}
