const C = { 
  good: "#10B981", 
  bad: "#EF4444", 
  warn: "#F59E0B",
  teal: "#06B6D4", 
  muted: "#8BAEC8", 
  bg: "#030712" 
};

function avg(arr, key) {
  if (!arr.length) return 0;
  return arr.reduce((s, r) => s + (r[key] ?? 0), 0) / arr.length;
}

const METRIC_DEFS = [
  { key: "c",    label: "Cadence",        unit: " spm",  round: 0, 
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5">
        <circle cx="18" cy="4" r="2"/><path d="m8 23 2-6 2.5-2 1.5 5"/><path d="M15 13.5H9L6 10l3-5.5 3 2 1 2.5"/>
      </svg>
    ) 
  },
  { key: "vo",   label: "Bounce",         unit: " cm",   round: 1,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5">
        <path d="m8 6 4-4 4 4"/><path d="m16 18-4 4-4-4"/><path d="M12 2v20"/>
      </svg>
    )
  },
  { key: "gct",  label: "Ground Contact", unit: " ms",   round: 0,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
    )
  },
  { key: "vgrf", label: "Impact Force",   unit: " ×BW",   round: 2,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    )
  },
  { key: "lean", label: "Trunk Lean",     unit: "°",     round: 1,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5">
        <line x1="12" y1="22" x2="12" y2="2"/><line x1="12" y1="22" x2="20" y2="6"/><path d="M12 12a8 8 0 0 1 6.5-4"/>
      </svg>
    )
  },
  { key: "asym", label: "L/R Balance",    unit: "%",     round: 1,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5">
        <line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="12" r="2.5"/>
      </svg>
    )
  },
];

export function Summary({ history, goodCount, badCount, elapsedFmt, distance, onNavigate }) {
  const total   = goodCount + badCount || 1;
  const goodPct = Math.round((goodCount / total) * 100);
  const isGood  = goodPct >= 70;

  const share = async () => {
    const text = `FormSense Session: ${elapsedFmt} | ${distance.toFixed(2)} km | Biomechanical Form: ${goodPct}% GOOD`;
    if (navigator.share) {
      try { await navigator.share({ title: "FormSense Analysis", text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    }
  };

  // SVG shoe sole outline for Foot Strike stats
  const shoeIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5">
      <path d="M3 14c2.5 0 4-1 6-1 2.5 0 4 1.5 7 1.5 2 0 3-1 5-1V9.5c-2.5 0-3.5 1-5 1-2.5 0-4-1.5-7-1.5-2 0-3.5 1-6 1V14z"/>
    </svg>
  );

  return (
    <main className="min-h-screen bg-[#030712] text-white p-6 max-pt-[max(24px,env(safe-area-inset-top))] max-pb-[max(24px,env(safe-area-inset-bottom))] flex flex-col gap-4.5 select-none">
      <h1 className="margin-0 text-xl font-black uppercase tracking-tight">Run Summary</h1>

      {/* Modern Circular Progress Ring form score card */}
      <div 
        className={`glass-card rounded-2xl p-5 flex flex-col items-center gap-4 relative overflow-hidden ${
          isGood ? "good-glow" : "bad-glow"
        }`}
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-[rgba(255,255,255,0.03)]" />
        
        {/* Dynamic Telemetry Circle */}
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg width="144" height="144" viewBox="0 0 100 100" className="-rotate-90">
            <circle 
              cx="50" 
              cy="50" 
              r="40" 
              fill="none" 
              stroke="rgba(255,255,255,0.04)" 
              strokeWidth="5" 
            />
            <circle 
              cx="50" 
              cy="50" 
              r="40" 
              fill="none" 
              stroke={isGood ? C.good : C.bad} 
              strokeWidth="6" 
              strokeDasharray="251.2" 
              strokeDashoffset={251.2 - (goodPct / 100) * 251.2}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{ filter: "drop-shadow(0 0 4px currentColor)" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <div 
              className="text-4xl font-black font-mono tracking-tighter" 
              style={{ color: isGood ? C.good : C.bad }}
            >
              {goodPct}%
            </div>
            <div className="text-[9px] font-black tracking-widest text-[rgba(255,255,255,0.4)] uppercase mt-0.5 select-none">
              GOOD FORM
            </div>
          </div>
        </div>

        <div className="text-center z-10">
          <div className="text-base font-black text-white tracking-tight">
            {distance.toFixed(2)} km
          </div>
          <div className="text-xs font-semibold text-[rgba(255,255,255,0.45)] mt-0.5">
            Total Duration: {elapsedFmt}
          </div>
        </div>

        {/* Dynamic breakdown pills */}
        <div className="flex gap-2.5 justify-center mt-1 z-10">
          <span className="text-[10px] font-black text-[#10B981] bg-[rgba(16,185,129,0.08)] px-3 py-1 rounded-full border border-[rgba(16,185,129,0.35)] tracking-wider uppercase select-none">
            {goodCount} Stables
          </span>
          <span className="text-[10px] font-black text-[#EF4444] bg-[rgba(239,68,68,0.08)] px-3 py-1 rounded-full border border-[rgba(239,68,68,0.35)] tracking-wider uppercase select-none">
            {badCount} Alerts
          </span>
        </div>
      </div>

      {/* Average telemetry readings card */}
      <div className="glass-card rounded-2xl p-4.5">
        <div className="text-[10px] font-extrabold text-[rgba(255,255,255,0.4)] tracking-widest uppercase mb-3">
          Session Averages
        </div>
        <div className="flex flex-col gap-2">
          {METRIC_DEFS.map(({ key, label, unit, round, icon }) => {
            const val = avg(history, key);
            return (
              <div key={key} className="flex justify-between items-center py-2 border-b border-[rgba(255,255,255,0.03)]">
                <span className="text-sm font-semibold text-[rgba(255,255,255,0.6)] flex items-center">
                  <span className="text-[#06B6D4] mr-2.5">{icon}</span>
                  {label}
                </span>
                <span className="text-lg font-black font-mono text-white">
                  {val.toFixed(round)}
                  <span className="text-[10px] font-bold text-[rgba(255,255,255,0.4)] ml-1 uppercase">{unit.trim()}</span>
                </span>
              </div>
            );
          })}
          
          {/* Foot strike averages */}
          <div className="flex justify-between items-center py-2 border-b border-transparent">
            <span className="text-sm font-semibold text-[rgba(255,255,255,0.6)] flex items-center">
              <span className="text-[#06B6D4] mr-2.5">{shoeIcon}</span>
              Foot Strike
            </span>
            <span className="font-extrabold text-white">
              {avg(history, "fs") > 0.5 ? (
                <span className="text-[#EF4444] font-black uppercase text-[10px] tracking-widest bg-[rgba(239,68,68,0.08)] px-2.5 py-0.5 rounded-md border border-[rgba(239,68,68,0.25)]">
                  Heel Strike
                </span>
              ) : (
                <span className="text-[#10B981] font-black uppercase text-[10px] tracking-widest bg-[rgba(16,185,129,0.08)] px-2.5 py-0.5 rounded-md border border-[rgba(16,185,129,0.25)]">
                  Mid/Forefoot
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Summary control panel actions */}
      <div className="flex gap-3.5 mt-2">
        <button 
          onClick={share} 
          className="flex-1 h-11.5 rounded-xl border-none bg-[#06B6D4] text-[#030712] font-black text-xs tracking-wider uppercase cursor-pointer hover:bg-[#22D3EE] transition-all duration-200 select-none shadow-[0_4px_12px_rgba(6,182,212,0.25)] active:scale-[0.98]"
        >
          Share Report
        </button>
        <button 
          onClick={() => onNavigate("dashboard")} 
          className="flex-1 h-11.5 rounded-xl bg-transparent text-[rgba(255,255,255,0.75)] border border-[rgba(255,255,255,0.12)] font-black text-xs tracking-wider uppercase cursor-pointer hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.03)] transition-all duration-200 select-none active:scale-[0.98]"
        >
          New Session
        </button>
      </div>
    </main>
  );
}
