export const SERVICE_UUID  = "19b10000-e8f2-537e-4f6c-d104768a1214";
export const CHAR_UUID     = "19b10001-e8f2-537e-4f6c-d104768a1214";

/**
 * Parse one BLE notify packet.
 * Expected JSON: {"seq":1,"c":174,"vo":8.2,"gct":245,"vgrf":2.4,"lean":9.1,"asym":3.2,"fs":0,"form":0}
 * Returns null on parse failure so caller can ignore bad frames.
 */
export function parsePacket(raw) {
  try {
    const p = JSON.parse(raw);
    if (typeof p.c !== "number") return null;
    return {
      seq:   p.seq  ?? 0,
      c:     p.c,          // cadence spm
      vo:    p.vo,         // vertical oscillation cm
      gct:   p.gct,        // ground contact time ms
      vgrf:  p.vgrf,       // peak vGRF ×BW
      lean:  p.lean,       // trunk lean °
      asym:  p.asym,       // L/R asymmetry %
      fs:    p.fs,         // 0=fore/mid  1=heel
      form:  p.form,       // 0=GOOD  1=BAD
    };
  } catch {
    return null;
  }
}
