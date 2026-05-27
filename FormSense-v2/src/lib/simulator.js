function rng(lo, hi) { return lo + Math.random() * (hi - lo); }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

let prev = null;
let t = 0;

export function resetSimulator() {
  prev = null;
  t = 0;
}

/**
 * Generate one realistic sensor packet.
 * Fatigue builds over ~5 min; occasional "challenge" spikes simulate bad form.
 */
export function generatePacket(seq) {
  t += 0.5;
  const fatigue    = clamp(t / 300, 0, 1);
  const wave       = (Math.sin(t / 13) + 1) / 2;
  const spike      = Math.random() < 0.10 ? rng(0.3, 1) : 0;

  const cadence    = clamp(rng(170, 182) - fatigue * 20 - wave * 4  - spike * 30,  140, 190);
  const vo         = clamp(rng(6.5, 9)   + fatigue * 4  + wave * 1.5 + spike * 5,  5,   15);
  const gct        = clamp(rng(220, 265) + fatigue * 60 + wave * 20  + spike * 80,  180, 380);
  const vgrf       = clamp(rng(2.1, 2.5) + fatigue * 0.4 + wave * 0.1 + spike * 0.6, 1.8, 3.2);
  const lean       = clamp(rng(6, 11)    + fatigue * 9  + wave * 3   + spike * 15,  3,   28);
  const asym       = clamp(rng(1, 4)     + fatigue * 5  + wave * 2   + spike * 10,  0,   20);
  const fs         = (cadence < 155 || vgrf > 2.7) ? 1 : 0;

  prev = { seq, cadence, vo, gct, vgrf, lean, asym, fs };

  return {
    seq,
    c:    cadence,
    vo,
    gct,
    vgrf,
    lean,
    asym,
    fs,
    form: null,   // classified client-side in demo mode
  };
}
