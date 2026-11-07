// Cosmillion Worker — question generation and grading framework.
//
//   Daily Dive:  a cron asks Claude (Opus) for 7 unique prompts, each
//                { id, prompt, category, strict_criteria }, stored in KV.
//   Answer:      A. sanitize (trim + lowercase)
//                B. Claude (Haiku) binary validation against the prompt + strict_criteria
//                C. invalid → failure response, the player may guess again within 25 s
//                   valid   → Zipf scoring: corpus word frequency → rank percentile →
//                             tier badge + 4–100 points
import { generateDive, validateAnswer } from "./llm.js";
import { PROMPTS_PER_DAY, ROUND_SECONDS, MAX_SCORE, matchAnswer, seedPuzzle } from "../public/shared/game-core.js";
import { RARITY_TIERS, sanitize, createFrequencyIndex, scoreAnswer } from "../public/shared/zipf.js";

const DAY = 86400000;
const MAX_ANSWER_LEN = 60;
const VERDICT_TTL = 60 * 60 * 24 * 30;

// ---------- Helpers ----------
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const err = (message, status = 400) => json({ error: message }, status);
const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
const utcToday = () => isoDate(Date.now());
const validDate = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
const puzzleNumber = (env, date) => Math.floor((Date.parse(date) - Date.parse(env.LAUNCH_DATE || "2026-11-01")) / DAY) + 1;

/** Players in every time zone can play "their" today: UTC yesterday through tomorrow. */
function playableDate(date) {
  const t = Date.parse(utcToday()), d = Date.parse(date);
  return d >= t - DAY && d <= t + DAY;
}

// The frequency list ships as static assets (public/freq). One index per isolate; shards load on demand.
let frequencyIndex = null;
function frequency(env) {
  frequencyIndex ||= createFrequencyIndex(async (path) => {
    const res = await env.ASSETS.fetch(new Request(`https://assets.local/freq/${path}`));
    return res.ok ? res.text() : null;
  });
  return frequencyIndex;
}

// ---------- Daily Dive storage ----------
const diveKey = (date) => `dive:${date}`;
const loadDive = (env, date) => env.PUZZLES.get(diveKey(date), "json");

/** The Daily Dive players see. Falls back to (and pins) a built-in dive if no generated one is live. */
async function liveDive(env, date) {
  const stored = await loadDive(env, date);
  if (stored && (stored.status === "live" || env.REQUIRE_REVIEW !== "true")) return stored;
  const seed = { ...seedPuzzle(date), generated_at: new Date().toISOString() };
  if (!stored) await env.PUZZLES.put(diveKey(date), JSON.stringify(seed)); // pin: the dive can't change mid-day
  return seed;
}

async function createDive(env, date) {
  const recent = (await env.PUZZLES.get("recent-prompts", "json")) || [];
  const prompts = await generateDive(env, { date, avoid: recent.slice(-70) });
  const dive = {
    v: 2,
    date,
    source: "llm",
    status: env.REQUIRE_REVIEW === "true" ? "draft" : "live",
    generated_at: new Date().toISOString(),
    prompts,
  };
  await env.PUZZLES.put(diveKey(date), JSON.stringify(dive));
  await env.PUZZLES.put("recent-prompts", JSON.stringify([...recent, ...prompts.map((p) => p.prompt)].slice(-140)));
  return dive;
}

// ---------- Validation (steps A–C) ----------
async function validate(env, ctx, request, item, answer) {
  // No LLM configured: built-in prompts carry an answer list that can validate offline.
  if (!env.ANTHROPIC_API_KEY) {
    if (item.answers) {
      const hit = matchAnswer(item, answer);
      // Score the correct spelling, so a forgiven typo isn't mistaken for a rare word.
      return hit ? { valid: true, canonical: sanitize(hit.answer) } : { valid: false, reason: "Not on our answer list." };
    }
    return { valid: false, reason: "The validator isn't configured.", unavailable: true };
  }

  // Same answer to the same prompt always gets the same verdict.
  const cacheKey = `verdict:${item.id}:${answer.slice(0, 80)}`;
  const cached = await env.PUZZLES.get(cacheKey, "json");
  if (cached) return cached;

  if (env.VALIDATOR_LIMITER) {
    const { success } = await env.VALIDATOR_LIMITER.limit({ key: request.headers.get("cf-connecting-ip") || "anon" });
    if (!success) return { valid: false, reason: "Too many guesses at once. Wait a moment.", unavailable: true };
  }
  let verdict;
  try {
    verdict = await validateAnswer(env, item, answer);
  } catch (e) {
    console.error("Validator failed:", e.message);
    return { valid: false, reason: "Couldn't reach the validator. Try again.", unavailable: true };
  }
  ctx.waitUntil(env.PUZZLES.put(cacheKey, JSON.stringify(verdict), { expirationTtl: VERDICT_TTL }));
  return verdict;
}

// ---------- Public API ----------
async function getDaily(env, url) {
  const date = url.searchParams.get("date") || utcToday();
  if (!validDate(date) || !playableDate(date)) return err("That date isn't playable.", 404);
  const dive = await liveDive(env, date);
  return json({
    date,
    number: puzzleNumber(env, date),
    source: dive.source,
    roundSeconds: ROUND_SECONDS,
    maxScore: MAX_SCORE,
    tiers: RARITY_TIERS,
    prompts: dive.prompts.map((p, index) => ({ index, id: p.id, prompt: p.prompt, category: p.category })),
  });
}

async function postAnswer(env, request, ctx) {
  let body;
  try { body = await request.json(); } catch { return err("Expected JSON."); }
  const { date, index } = body || {};
  if (!validDate(date) || !playableDate(date)) return err("That date isn't playable.", 404);
  if (!Number.isInteger(index) || index < 0 || index >= PROMPTS_PER_DAY) return err("Bad prompt index.");

  // A. Sanitization
  const answer = sanitize(body.answer).slice(0, MAX_ANSWER_LEN);
  if (!answer) return json({ valid: false, reason: "Type an answer first." });

  const dive = await liveDive(env, date);
  const item = dive.prompts[index];

  // B + C. Validation; an invalid answer returns at once so the player can guess again.
  const verdict = await validate(env, ctx, request, item, answer);
  if (!verdict.valid) return json({ valid: false, prompt_id: item.id, reason: verdict.reason, retry: true });

  // Scoring: Zipf frequency → percentile → tier badge + points.
  const scored = verdict.canonical || answer;
  const score = await scoreAnswer(frequency(env), scored);
  return json({ valid: true, prompt_id: item.id, answer: scored, ...score });
}

// ---------- Admin API (review pass) ----------
function authorized(env, request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return Boolean(env.ADMIN_TOKEN) && token.length > 0 && token === env.ADMIN_TOKEN;
}

async function admin(env, request, url) {
  if (!authorized(env, request)) return err("Unauthorized.", 401);
  const date = url.searchParams.get("date") || utcToday();
  if (!validDate(date)) return err("Bad date.");
  const route = url.pathname.replace("/api/admin/", "");

  if (route === "generate" && request.method === "POST") {
    if (!env.ANTHROPIC_API_KEY) return err("ANTHROPIC_API_KEY is not set.", 500);
    const existing = await loadDive(env, date);
    if (existing?.source === "llm" && url.searchParams.get("force") !== "true") {
      return err("A generated dive already exists for that date. Add force=true to replace it.", 409);
    }
    return json(await createDive(env, date));
  }
  if (route === "dive" && request.method === "GET") {
    return json((await loadDive(env, date)) || { error: "No dive stored for that date." });
  }
  if (route === "dive" && request.method === "PUT") {
    let d;
    try { d = await request.json(); } catch { return err("Expected JSON."); }
    if (!Array.isArray(d?.prompts) || d.prompts.length !== PROMPTS_PER_DAY) return err(`A dive needs exactly ${PROMPTS_PER_DAY} prompts.`);
    const texts = new Set();
    for (const p of d.prompts) {
      if (![p.prompt, p.category, p.strict_criteria].every((s) => typeof s === "string" && s.trim())) {
        return err("Every prompt needs prompt, category and strict_criteria.");
      }
      if (texts.has(p.prompt.toLowerCase())) return err("Prompts must be unique.");
      texts.add(p.prompt.toLowerCase());
      p.id ||= crypto.randomUUID();
    }
    const dive = { v: 2, date, source: d.source || "manual", status: d.status === "draft" ? "draft" : "live", edited_at: new Date().toISOString(), prompts: d.prompts };
    await env.PUZZLES.put(diveKey(date), JSON.stringify(dive));
    return json({ ok: true, date, status: dive.status });
  }
  if (route === "publish" && request.method === "POST") {
    const d = await loadDive(env, date);
    if (!d) return err("No dive stored for that date.", 404);
    d.status = "live";
    await env.PUZZLES.put(diveKey(date), JSON.stringify(d));
    return json({ ok: true, date, status: "live" });
  }
  return err("Unknown admin route.", 404);
}

// ---------- Entry points ----------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      if (url.pathname === "/api/daily" && request.method === "GET") return await getDaily(env, url);
      if (url.pathname === "/api/answer" && request.method === "POST") return await postAnswer(env, request, ctx);
      if (url.pathname.startsWith("/api/admin/")) return await admin(env, request, url);
      return err("Not found.", 404);
    } catch (e) {
      console.error(e);
      return err("Something went wrong on our side.", 500);
    }
  },

  // Daily cron: make sure the next two days have a Daily Dive (time for an optional review).
  async scheduled(event, env) {
    if (!env.ANTHROPIC_API_KEY) return console.warn("ANTHROPIC_API_KEY not set; skipping Daily Dive generation.");
    for (const date of [isoDate(Date.now() + DAY), isoDate(Date.now() + 2 * DAY)]) {
      if (await loadDive(env, date)) continue;
      try {
        await createDive(env, date);
        console.log(`Generated Daily Dive for ${date}`);
      } catch (e) {
        console.error(`Daily Dive generation failed for ${date}:`, e.message);
      }
    }
  },
};
