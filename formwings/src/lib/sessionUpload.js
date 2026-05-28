import { supabase, supabaseConfig } from "./supabaseClient";

const TABLE = "athlete_sessions";
const PENDING_KEY = "formwings_pending_session_uploads_v1";
const MAX_PENDING_SESSIONS = 8;

function makeClientUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const bytes = typeof crypto !== "undefined" && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint8Array(16))
    : Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function cleanJson(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 3) {
  const number = finiteNumber(value);
  if (number === null) return null;
  const factor = 10 ** digits;
  return Math.round(number * factor) / factor;
}

function avg(packets, key) {
  const values = packets
    .map((packet) => finiteNumber(packet?.[key]))
    .filter((value) => value !== null);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isoFromMaybe(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  const number = finiteNumber(value);
  return number === null ? null : new Date(number).toISOString();
}

function normalizePacket(packet, index) {
  const receivedAt = isoFromMaybe(packet?.ts);
  return cleanJson({
    packet_index: index,
    received_at: receivedAt,
    sensor_timestamp_ms: finiteNumber(packet?.timestamp),
    ...packet,
  });
}

function countBy(values) {
  return values.reduce((acc, value) => {
    if (value == null) return acc;
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function summarizeEnvironment(packets) {
  const samples = packets.map((packet) => packet?.envData).filter(Boolean);
  if (!samples.length) return {};

  const heatIndexes = samples
    .map((sample) => finiteNumber(sample.heat_index_c))
    .filter((value) => value !== null);
  const temperatures = samples
    .map((sample) => finiteNumber(sample.temperature_c))
    .filter((value) => value !== null);
  const humidities = samples
    .map((sample) => finiteNumber(sample.humidity_pct))
    .filter((value) => value !== null);

  return cleanJson({
    samples: samples.length,
    avg_temperature_c: temperatures.length ? round(temperatures.reduce((s, v) => s + v, 0) / temperatures.length, 1) : null,
    avg_humidity_pct: humidities.length ? round(humidities.reduce((s, v) => s + v, 0) / humidities.length, 1) : null,
    max_heat_index_c: heatIndexes.length ? round(Math.max(...heatIndexes), 1) : null,
    risk_states: countBy(samples.map((sample) => sample.risk_state)),
    last: samples[samples.length - 1],
  });
}

function footStrikeDominant(packets) {
  let heel = 0;
  let midfoot = 0;
  packets.forEach((packet) => {
    const likelihood = finiteNumber(packet?.heelLikelihood);
    const isHeel = likelihood !== null ? likelihood >= 0.5 : packet?.fs === 1;
    if (isHeel) heel += 1;
    else midfoot += 1;
  });
  if (!heel && !midfoot) return null;
  return heel > midfoot ? "heel" : "midfoot";
}

function inferStartedAt({ startedAt, endedAt, elapsed, packets }) {
  if (startedAt) return startedAt;
  const firstPacketTs = packets[0]?.ts;
  const firstPacketIso = isoFromMaybe(firstPacketTs);
  if (firstPacketIso) return firstPacketIso;
  const endedMs = Date.parse(endedAt) || Date.now();
  return new Date(endedMs - (finiteNumber(elapsed) ?? 0) * 1000).toISOString();
}

export function buildSessionRow({
  sessionId,
  startedAt,
  endedAt,
  elapsed,
  distance,
  goodCount,
  badCount,
  fullHistory = [],
  mode = "demo",
}) {
  const ended = endedAt || new Date().toISOString();
  const packets = fullHistory.map(normalizePacket);
  const good = goodCount || packets.filter((packet) => packet.formState === "GOOD").length;
  const bad = badCount || packets.filter((packet) => packet.formState === "BAD").length;
  const total = good + bad || packets.length || 1;

  return cleanJson({
    session_id: sessionId || makeClientUuid(),
    mode,
    started_at: inferStartedAt({ startedAt, endedAt: ended, elapsed, packets }),
    ended_at: ended,
    duration_s: Math.max(0, Math.round(finiteNumber(elapsed) ?? 0)),
    distance_km: round(distance ?? 0, 4),
    good_pct: round((good / total) * 100, 2),
    good_windows: good,
    bad_windows: bad,
    packet_count: packets.length,
    avg_cadence: round(avg(packets, "c"), 2),
    avg_vo_cm: round(avg(packets, "vo"), 2),
    avg_gct_ms: round(avg(packets, "gct"), 2),
    avg_vgrf_bw: round(avg(packets, "vgrf"), 3),
    avg_peak_vgrf_bw: round(avg(packets, "vgrf2"), 3),
    avg_lean_deg: round(avg(packets, "lean"), 2),
    avg_asym_pct: round(avg(packets, "asym"), 2),
    avg_heel_likelihood: round(avg(packets, "heelLikelihood"), 3),
    foot_strike_dominant: footStrikeDominant(packets),
    environment_summary: summarizeEnvironment(packets),
    packets,
    upload_source: "formwings-web",
    client_version: "0.2.0",
  });
}

export function loadPendingUploads() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePendingUploads(rows) {
  const deduped = Array.from(
    new Map(rows.slice(-MAX_PENDING_SESSIONS).map((row) => [row.session_id, row])).values()
  );
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(deduped));
    return deduped;
  } catch {
    const compact = deduped.map((row) => ({
      ...row,
      packets: row.packets?.slice(-300) ?? [],
      local_queue_warning: "Packet history was trimmed because localStorage quota was exceeded.",
    }));
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(compact));
      return compact;
    } catch {
      return [];
    }
  }
}

export function getPendingUploadCount() {
  return loadPendingUploads().length;
}

export function queueSessionUpload(row) {
  const pending = loadPendingUploads();
  return savePendingUploads([...pending, row]);
}

function removeQueuedSession(sessionId) {
  if (!sessionId) return;
  savePendingUploads(loadPendingUploads().filter((row) => row.session_id !== sessionId));
}

async function rowWithAuthUser(row) {
  if (!supabase) return row;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ? { ...row, user_id: data.user.id } : row;
  } catch {
    return row;
  }
}

async function insertRow(row) {
  const payload = await rowWithAuthUser(row);
  return supabase.from(TABLE).insert(payload);
}

export async function flushPendingSessionUploads() {
  if (!supabaseConfig.isConfigured) {
    return {
      ok: false,
      uploaded: 0,
      remaining: getPendingUploadCount(),
      message: `Missing ${supabaseConfig.missing.join(", ")}`,
    };
  }

  const pending = loadPendingUploads();
  const failed = [];
  let firstError = null;

  for (const row of pending) {
    try {
      const { error } = await insertRow(row);
      if (error) {
        if (error.code === "23505") continue;
        failed.push(row);
        firstError ||= error;
      }
    } catch (error) {
      failed.push(row);
      firstError ||= error;
    }
  }

  savePendingUploads(failed);
  return {
    ok: failed.length === 0,
    uploaded: pending.length - failed.length,
    remaining: failed.length,
    message: firstError?.message ?? null,
  };
}

export async function uploadSessionRow(row) {
  if (!row?.packet_count) {
    return { ok: false, queued: false, status: "empty", message: "No packets to upload" };
  }

  if (!supabaseConfig.isConfigured) {
    queueSessionUpload(row);
    return {
      ok: false,
      queued: true,
      status: "queued",
      message: `Queued locally. Missing ${supabaseConfig.missing.join(", ")}`,
    };
  }

  removeQueuedSession(row.session_id);
  try {
    const { error } = await insertRow(row);
    if (error) {
      if (error.code === "23505") {
        return { ok: true, queued: false, status: "saved", message: "Already saved to Supabase" };
      }
      queueSessionUpload(row);
      return { ok: false, queued: true, status: "queued", message: error.message };
    }
  } catch (error) {
    queueSessionUpload(row);
    return { ok: false, queued: true, status: "queued", message: error?.message ?? "Network error" };
  }

  const flush = await flushPendingSessionUploads();
  return {
    ok: true,
    queued: false,
    status: "saved",
    message: flush.uploaded > 0
      ? `Saved. Also synced ${flush.uploaded} queued session${flush.uploaded === 1 ? "" : "s"}.`
      : "Saved to Supabase",
  };
}
