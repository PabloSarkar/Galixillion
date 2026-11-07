// Shared by the Cloudflare Worker (server-side scoring) and the browser (offline fallback).
import { SEED_BANK } from "./seed-bank.js";

export const PROMPTS_PER_DAY = 7;
export const ROUND_SECONDS = 25;
export const MAX_SCORE = PROMPTS_PER_DAY * 100;

// ---------- Answer matching ----------
const STRIP_WORDS = ["space telescope", "telescope", "constellation", "galaxy", "spacecraft", "rocket", "rover", "mission", "probe", "the", "a", "an"];

export function normalize(s) {
  return String(s).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function variants(s) {
  const n = normalize(s);
  const out = new Set();
  if (n) out.add(n.replace(/ /g, ""));
  let stripped = ` ${n} `;
  for (const w of STRIP_WORDS) stripped = stripped.replace(new RegExp(` ${w} `, "g"), " ");
  stripped = stripped.trim().replace(/ /g, "");
  if (stripped) out.add(stripped);
  return [...out];
}

function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Offline/no-LLM validator: find a typed answer in a known answer list (aliases, small typos). */
export function matchAnswer(sheet, input) {
  const ins = variants(input);
  if (!ins.length) return null;
  const keyed = sheet.answers.map((a) => ({ a, keys: [a.answer, ...(a.aliases || [])].flatMap(variants) }));
  for (const { a, keys } of keyed) if (keys.some((k) => ins.includes(k))) return a;
  let best = null, bestD = 99;
  for (const { a, keys } of keyed) {
    for (const k of keys) {
      const allowed = k.length >= 9 ? 2 : k.length >= 5 ? 1 : 0;
      if (!allowed) continue;
      for (const v of ins) {
        const d = levenshtein(v, k);
        if (d <= allowed && d < bestD) { best = a; bestD = d; }
      }
    }
  }
  return best;
}

// ---------- Seed puzzles (no LLM) ----------
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seededRandom(seed) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function seedId(date, i) {
  const hex = [0, 1, 2, 3].map((k) => hashString(`${date}#${i}#${k}`).toString(16).padStart(8, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Turn a seed-bank entry into a Daily Dive prompt. `answers` is only used to validate when no LLM is configured. */
export function seedPrompt(entry, id) {
  return {
    id,
    prompt: entry.q,
    category: entry.category,
    strict_criteria: entry.criteria,
    answers: entry.a.map(([answer, , ...aliases]) => ({ answer, aliases })),
  };
}

export function seedPuzzle(date) {
  const rand = seededRandom(hashString(date));
  const pool = SEED_BANK.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return { v: 2, date, source: "seed", status: "live", prompts: pool.slice(0, PROMPTS_PER_DAY).map((e, i) => seedPrompt(e, seedId(date, i))) };
}

// ---------- Altitude ----------
export const ZONES = [
  { score: 0,   name: "Launchpad",          km: 0 },
  { score: 15,  name: "Cloud deck",         km: 10 },
  { score: 40,  name: "Kármán line",        km: 100 },
  { score: 80,  name: "Low Earth orbit",    km: 400,     body: "station" },
  { score: 140, name: "The Moon",           km: 384400,  body: "moon" },
  { score: 210, name: "Mars",               km: 225e6,   body: "mars" },
  { score: 290, name: "Asteroid belt",      km: 4.0e8,   body: "belt" },
  { score: 370, name: "Jupiter",            km: 7.78e8,  body: "jupiter" },
  { score: 450, name: "Saturn",             km: 1.43e9,  body: "saturn" },
  { score: 530, name: "Uranus",             km: 2.87e9,  body: "uranus" },
  { score: 600, name: "Neptune",            km: 4.5e9,   body: "neptune" },
  { score: 650, name: "Kuiper belt",        km: 7.5e9,   body: "kuiper" },
  { score: 700, name: "Interstellar space", km: 2.4e10,  body: "galaxy" },
];

export function zoneFor(score) {
  let z = ZONES[0];
  for (const zone of ZONES) if (score >= zone.score) z = zone;
  return z;
}

export function kmFor(score) {
  for (let i = 0; i < ZONES.length - 1; i++) {
    const a = ZONES[i], b = ZONES[i + 1];
    if (score < b.score) {
      const t = (score - a.score) / (b.score - a.score);
      return a.km <= 0 ? b.km * t : a.km * Math.pow(b.km / a.km, t);
    }
  }
  return ZONES[ZONES.length - 1].km;
}

export function formatKm(km) {
  if (km < 1e6) return `${Math.round(km).toLocaleString("en-US")} km`;
  if (km < 1e9) return `${(km / 1e6).toFixed(1)} million km`;
  return `${(km / 1e9).toFixed(2)} billion km`;
}
