/**
 * Threshold-based GOOD/BAD classifier used in Demo mode.
 * In Model mode this function is bypassed — UNO Q sends form=0|1 directly.
 */
export function classify(m) {
  if (!m) return "GOOD";
  if (m.c   < 152)  return "BAD";   // cadence too low → braking impact risk
  if (m.lean > 18)  return "BAD";   // over-lean → low-back strain
  if (m.gct  > 310) return "BAD";   // ground contact too long → loading risk
  if (m.vgrf > 2.8) return "BAD";   // impact too high
  if (m.asym > 10)  return "BAD";   // significant L/R imbalance
  return "GOOD";
}

/** Identify the primary metric causing BAD — used for the hint label. */
export function badReason(m) {
  if (!m) return null;
  if (m.lean  > 18)  return "Reduce forward lean";
  if (m.c     < 152) return "Increase cadence";
  if (m.gct   > 310) return "Shorten ground contact";
  if (m.vgrf  > 2.8) return "Land softer";
  if (m.asym  > 10)  return "Even out left/right stride";
  if (m.fs    === 1) return "Land on midfoot";
  return null;
}
