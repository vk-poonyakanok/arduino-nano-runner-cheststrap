/**
 * MetricStrip — Telemetry Grid with Dynamic Filling Icons (Logos)
 * Each metric's SVG logo acts as a micro-gauge, dynamically filling,
 * tilting, or sweeping high and low to represent live values.
 */

const C = {
  good:  "#10B981",   // Emerald green
  bad:   "#EF4444",   // Red alert
  warn:  "#F59E0B",   // Warning amber
  teal:  "#06B6D4",   // Cyan focus
  muted: "rgba(255, 255, 255, 0.4)",
};

function metricColor(value, lo, hi, invert = false) {
  const ratio = (value - lo) / (hi - lo);
  if (invert) {
    if (ratio < 0.4) return C.good;
    if (ratio < 0.7) return C.warn;
    return C.bad;
  }
  if (ratio > 0.6) return C.good;
  if (ratio > 0.35) return C.warn;
  return C.bad;
}

function Bar({ fill, color }) {
  return (
    <div className="h-[5px] rounded-full bg-[rgba(255,255,255,0.06)] mt-2.5 overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${Math.max(4, Math.min(100, fill * 100))}%`,
          background: color,
        }} 
      />
    </div>
  );
}

function Chip({ svgIcon, label, value, unit, color, isFocused }) {
  return (
    <div 
      className={`flex items-center gap-2 transition-all duration-300 ${
        isFocused ? "opacity-100 scale-102" : "opacity-85"
      }`}
    >
      {/* Huge Value */}
      <div 
        className="text-4xl font-black font-mono tracking-tighter text-white select-all"
        style={{
          color: isFocused ? C.teal : "#FFFFFF",
          textShadow: isFocused ? `0 0 8px ${C.teal}40` : "none"
        }}
      >
        {value}
      </div>
      
      {/* Label, unit, and mini-gauge icon stacked on the right */}
      <div className="flex flex-col text-left justify-center min-w-0">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider truncate max-w-[70px] select-none">
            {label}
          </span>
          <span className="opacity-95 flex-shrink-0 animate-pulse-slow" style={{ color: isFocused ? C.teal : color }}>
            {svgIcon}
          </span>
        </div>
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1 select-none leading-none">
          {unit.trim()}
        </span>
      </div>
    </div>
  );
}

export function MetricStrip({ metrics }) {
  if (!metrics) return null;

  const { c, vo, gct, vgrf, lean, asym, fs, attn } = metrics;

  // Determine index of highest attention weight if array present
  const maxAttnIdx = attn && Array.isArray(attn) && attn.length >= 7 
    ? attn.indexOf(Math.max(...attn)) 
    : -1;

  const cadColor  = metricColor(c,    140, 190, false);
  const voColor   = metricColor(vo,   5,   15,  true);
  const gctColor  = metricColor(gct,  180, 380, true);
  const vgrfColor = metricColor(vgrf, 1.8, 3.2, true);
  const leanColor = metricColor(lean, 3,   28,  true);
  const asymColor = metricColor(asym, 0,   20,  true);

  const isCadFocused = maxAttnIdx === 0;
  const isVoFocused  = maxAttnIdx === 1;
  const isGctFocused = maxAttnIdx === 2;
  const isVgrfFocused= maxAttnIdx === 3;
  const isLeanFocused= maxAttnIdx === 4;
  const isAsymFocused= maxAttnIdx === 5;
  const isFsFocused  = maxAttnIdx === 6;

  // Computed fill ratios for circular/stretching SVG shapes
  const cadFill  = Math.max(0, Math.min(1, (c - 140) / 50));
  const voFill   = Math.max(0, Math.min(1, 1 - (vo - 5) / 10));
  const gctFill  = Math.max(0, Math.min(1, 1 - (gct - 180) / 200));
  const vgrfFill = Math.max(0, Math.min(1, 1 - (vgrf - 1.8) / 1.4));
  const leanFill = Math.max(0, Math.min(1, 1 - (lean - 3) / 25));
  const asymFill = Math.max(0, Math.min(1, 0.5 + (asym / 40)));

  // 1. Cadence Logo: Vertical gradient fill on Runner Icon
  const cadenceIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="cadGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={isCadFocused ? C.teal : cadColor} />
          <stop offset={`${cadFill * 100}%`} stopColor={isCadFocused ? C.teal : cadColor} />
          <stop offset={`${cadFill * 100}%`} stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="4" r="2" fill="url(#cadGrad)" stroke="none" />
      <path d="m8 23 2-6 2.5-2 1.5 5" stroke="url(#cadGrad)" />
      <path d="M15 13.5H9L6 10l3-5.5 3 2 1 2.5" stroke="url(#cadGrad)" />
    </svg>
  );

  // 2. Bounce Logo: Vertical gauge column with a bobbing weight going high/low
  const bounceIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="2" width="4" height="20" rx="2" fill="rgba(255,255,255,0.12)" stroke="none" />
      <rect 
        x="10" 
        y={2 + (1 - voFill) * 14} 
        width="4" 
        height={voFill * 14} 
        rx="1" 
        fill={isVoFocused ? C.teal : voColor} 
        stroke="none" 
      />
      <circle 
        cx="12" 
        cy={3 + (1 - voFill) * 14} 
        r="3.5" 
        fill="#fff" 
        stroke={isVoFocused ? C.teal : voColor} 
        strokeWidth="1.5"
      />
    </svg>
  );

  // 3. Ground Contact Logo: Clock sweeping segment based on fill
  const gctIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
      <circle 
        cx="12" cy="12" r="10" 
        stroke={isGctFocused ? C.teal : gctColor} 
        strokeWidth="3" 
        strokeDasharray="62.8"
        strokeDashoffset={62.8 - (gctFill * 62.8)}
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
      />
    </svg>
  );

  // 4. Impact Force Logo: Lightning bolt with vertical gradient fill
  const vgrfIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="vgrfGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={isVgrfFocused ? C.teal : vgrfColor} />
          <stop offset={`${vgrfFill * 100}%`} stopColor={isVgrfFocused ? C.teal : vgrfColor} />
          <stop offset={`${vgrfFill * 100}%`} stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
        </linearGradient>
      </defs>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" fill="url(#vgrfGrad)" stroke="none" />
    </svg>
  );

  // 5. Trunk Lean Logo: Angle dial arc growing
  const leanIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="22" x2="12" y2="2" stroke="rgba(255,255,255,0.15)" />
      <line x1="12" y1="22" x2={12 + 10 * Math.sin(leanFill * 0.8)} y2={22 - 18 * Math.cos(leanFill * 0.8)} stroke={isLeanFocused ? C.teal : leanColor} />
    </svg>
  );

  // 6. L/R Balance Logo: Balance scale that TILTS dynamically!
  const tiltAngle = (asymFill - 0.5) * 36;
  const balanceIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="4" x2="12" y2="22" stroke="rgba(255,255,255,0.2)" />
      <g transform={`rotate(${tiltAngle} 12 7)`} className="transition-transform duration-500 ease-out">
        <line x1="3" y1="7" x2="21" y2="7" stroke={isAsymFocused ? C.teal : asymColor} strokeWidth="3" />
      </g>
    </svg>
  );

  const shoeIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14c2.5 0 4-1 6-1 2.5 0 4 1.5 7 1.5 2 0 3-1 5-1V9.5c-2.5 0-3.5 1-5 1-2.5 0-4-1.5-7-1.5-2 0-3.5 1-6 1V14z"/>
    </svg>
  );

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4.5 px-2">
      <Chip
        svgIcon={cadenceIcon} label="Cadence"
        value={Math.round(c)} unit=" spm"
        color={cadColor}
        isFocused={isCadFocused}
      />
      <Chip
        svgIcon={bounceIcon} label="Bounce"
        value={vo.toFixed(1)} unit=" cm"
        color={voColor}
        isFocused={isVoFocused}
      />
      <Chip
        svgIcon={gctIcon} label="Ground"
        value={Math.round(gct)} unit=" ms"
        color={gctColor}
        isFocused={isGctFocused}
      />
      <Chip
        svgIcon={vgrfIcon} label="Impact"
        value={vgrf.toFixed(1)} unit=" g"
        color={vgrfColor}
        isFocused={isVgrfFocused}
      />
      <Chip
        svgIcon={leanIcon} label="Lean"
        value={lean.toFixed(1)} unit=" °"
        color={leanColor}
        isFocused={isLeanFocused}
      />
      <Chip
        svgIcon={balanceIcon} label="Balance"
        value={asym.toFixed(1)} unit=" %"
        color={asymColor}
        isFocused={isAsymFocused}
      />
      
      {/* Compact Foot Strike spans full width */}
      <div className="col-span-2 flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-3 mt-1">
        <div className="flex items-center gap-2.5">
          <span style={{ color: isFsFocused ? C.teal : "rgba(255,255,255,0.4)" }}>
            {shoeIcon}
          </span>
          <div className="flex flex-col text-left leading-none">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Foot Strike</span>
            <span 
              className="text-[13px] font-black uppercase tracking-wider mt-1"
              style={{ color: fs === 1 ? C.bad : C.good }}
            >
              {fs === 1 ? "Heel Strike" : "Midfoot"}
            </span>
          </div>
        </div>
        
        {/* Pressure Map SVG */}
        <svg width="54" height="20" viewBox="0 0 54 24" className="opacity-90 select-none flex-shrink-0">
          <path 
            d="M 6 12 C 6 6, 12 3, 20 3 C 28 3, 34 5, 40 7 C 46 9, 49 10, 49 12 C 49 14, 46 15, 40 17 C 34 19, 28 21, 20 21 C 12 21, 6 18, 6 12 Z" 
            fill="none" 
            stroke="rgba(255,255,255,0.18)" 
            strokeWidth="2.5" 
          />
          <path 
            d="M 6 12 C 6 8, 9 6, 13 6 C 16 6, 16 18, 13 18 C 9 18, 6 16, 6 12 Z" 
            fill={fs === 1 ? C.bad : "none"} 
            stroke={fs === 1 ? C.bad : "transparent"} 
            strokeWidth="2.5"
            opacity={fs === 1 ? 0.95 : 0}
          />
          <path 
            d="M 32 8 C 36 6, 42 7, 46 9 C 48 10, 48 14, 46 15 C 42 17, 36 18, 32 16 Z" 
            fill={fs === 0 ? C.good : "none"} 
            stroke={fs === 0 ? C.good : "transparent"} 
            strokeWidth="2.5"
            opacity={fs === 0 ? 0.95 : 0}
          />
        </svg>
      </div>
    </div>
  );
}

