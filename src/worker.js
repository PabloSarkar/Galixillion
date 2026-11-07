// Cosmillion Cloudflare Worker: serves the static game from /public and the JSON API under /api.
//
// Workflow:
//   1. A daily cron asks Claude for tomorrow's 7 prompts, then builds an answer sheet for each
//      (valid answers, aliases, estimated share of players, curated "gem").
//   2. Sheets are stored in KV. They are never sent to the browser before an answer is given.
//   3. Players' answers are scored on the server against the sheet (aliases + typo tolerance).
//   4. A valid answer missing from the sheet is judged by Claude, capped below the gem tier,
//      and cached so everyone who types it gets the same score.
//   5. Admin endpoints let a human review or edit a puzzle before it goes live.
import { generatePrompts, buildAnswerSheet, judgeAnswer } from "./llm.js";
import {
  PROMPTS_PER_DAY, ROUND_SECONDS, MAX_SCORE, TIERS, tierFor, matchAnswer, normalize, revealFor, seedPuzzle, seedSheet,
} from "../public/shared/game-core.js";
import { SEED_BANK } from "../public/shared/seed-bank.js";

const DAY = 86400000;
const MAX_ANSWER_LEN = 60;

// ---------- Helpers ----------
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const err = (message, status = 400) => json({ error: message }, status);

const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
const utcToday = () => isoDate(Date.now());
const validDate = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

function puzzleNumber(env, date) {
  const launch = Date.parse(env.LAUNCH_DATE || "2026-11-01");
  return Math.floor((Date.parse(date) - launch) / DAY) + 1;
}

/** Players in any time zone can play "their" today: allow UTC yesterday..tomorrow. */
function playableDate(date) {
  const t = Date.parse(utcToday());
  const d = Date.parse(date);
  return d >= t - DAY && d <= t + DAY;
}

// ---------- Puzzle storage ----------
const puzzleKey = (date) => `puzzle:${date}`;

async function loadPuzzle(env, date) {
  return env.PUZZLES.get(puzzleKey(date), "json");
}

/** The puzzle players see for a date. Falls back to (and pins) a seed puzzle if none is live. */
async function livePuzzle(env, date) {
  const stored = await loadPuzzle(env, date);
  if (stored && stored.status === "live") return stored;
  if (stored && stored.status === "draft" && env.REQUIRE_REVIEW !== "true") return stored;
  const seed = { ...seedPuzzle(date), generated_at: new Date().toISOString() };
  // Pin it so the day's puzzle can't change mid-game, unless a draft is waiting for review.
  if (!stored) await env.PUZZLES.put(puzzleKey(date), JSON.stringify(seed));
  return seed;
}

async function generateDaily(env, date) {
  const recent = (await env.PUZZLES.get("recent-prompts", "json")) || [];
  const prompts = await generatePrompts(env, { date, avoid: recent.slice(-60) });

  const build = async (p) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const sheet = await buildAnswerSheet(env, p);
        if (sheet.answers.length >= 30) return sheet;
      } catch (e) {
        console.error(`Answer sheet failed for "${p.text}" (attempt ${attempt + 1}):`, e.message);
      }
    }
    return null;
  };
  const sheets = await Promise.all(prompts.map(build));

  // Any prompt whose sheet failed is replaced by a hand-written one.
  const spare = SEED_BANK.map(seedSheet).filter((s) => !sheets.some((x) => x && x.text === s.text));
  const finalSheets = sheets.map((s) => s || spare.shift()).slice(0, PROMPTS_PER_DAY);

  const puzzle = {
    date,
    source: "llm",
    status: env.REQUIRE_REVIEW === "true" ? "draft" : "live",
    generated_at: new Date().toISOString(),
    prompts: finalSheets,
  };
  await env.PUZZLES.put(puzzleKey(date), JSON.stringify(puzzle));
  await env.PUZZLES.put("recent-prompts", JSON.stringify([...recent, ...finalSheets.map((s) => s.text)].slice(-120)));
  return puzzle;
}

// ---------- Public API ----------
async function getDaily(env, url) {
  const date = url.searchParams.get("date") || utcToday();
  if (!validDate(date) || !playableDate(date)) return err("That date isn't playable.", 404);
  const p = await livePuzzle(env, date);
  return json({
    date,
    number: puzzleNumber(env, date),
    source: p.source,
    roundSeconds: ROUND_SECONDS,
    maxScore: MAX_SCORE,
    tiers: TIERS.slice(1),
    prompts: p.prompts.map((s, index) => ({ index, text: s.text, category: s.category })),
  });
}

function resultFor(entry, source, tierOverride) {
  const tier = tierOverride ?? entry.tier;
  return { accepted: true, answer: entry.answer, tier, tierName: TIERS[tier].name, points: TIERS[tier].points, source };
}

async function postAnswer(env, request, ctx) {
  let body;
  try { body = await request.json(); } catch { return err("Expected JSON."); }
  const { date, index } = body || {};
  const answer = String(body?.answer ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, MAX_ANSWER_LEN);
  if (!validDate(date) || !playableDate(date)) return err("That date isn't playable.", 404);
  if (!Number.isInteger(index) || index < 0 || index >= PROMPTS_PER_DAY) return err("Bad prompt index.");
  if (!answer || !normalize(answer)) return json({ accepted: false, reason: "empty" });

  const puzzle = await livePuzzle(env, date);
  const sheet = puzzle.prompts[index];

  // 1. Answer sheet (exact, alias, small typos).
  const hit = matchAnswer(sheet, answer);
  if (hit) return json(resultFor(hit, "sheet"));

  // 2. Claude judges answers the sheet missed.
  if (!env.ANTHROPIC_API_KEY) return json({ accepted: false, reason: "not_on_sheet" });

  const cacheKey = `judge:${date}:${index}:${normalize(answer).replace(/ /g, "").slice(0, 80)}`;
  let verdict = await env.PUZZLES.get(cacheKey, "json");
  if (!verdict) {
    if (env.JUDGE_LIMITER) {
      const ip = request.headers.get("cf-connecting-ip") || "anon";
      const { success } = await env.JUDGE_LIMITER.limit({ key: ip });
      if (!success) return json({ accepted: false, reason: "rate_limited" });
    }
    try {
      verdict = await judgeAnswer(env, sheet, answer);
    } catch (e) {
      console.error("Judge failed:", e.message);
      return json({ accepted: false, reason: "judge_unavailable" });
    }
    ctx.waitUntil(env.PUZZLES.put(cacheKey, JSON.stringify(verdict), { expirationTtl: 60 * 60 * 24 * 30 }));
  }

  if (!verdict.valid) return json({ accepted: false, reason: "invalid" });
  if (verdict.matches_existing) {
    const existing = matchAnswer(sheet, verdict.matches_existing);
    if (existing) return json(resultFor(existing, "sheet"));
  }
  // Judged answers can reach Deep Space (85) but never the curated gem tier.
  const tier = Math.min(5, tierFor({ share: +verdict.share || 0, too_clever: !!verdict.too_clever }));
  return json(resultFor({ answer: verdict.canonical || answer }, "judge", tier));
}

async function getReveal(env, url) {
  const date = url.searchParams.get("date");
  const index = Number(url.searchParams.get("index"));
  if (!validDate(date) || !playableDate(date)) return err("That date isn't playable.", 404);
  if (!Number.isInteger(index) || index < 0 || index >= PROMPTS_PER_DAY) return err("Bad prompt index.");
  const puzzle = await livePuzzle(env, date);
  return json(revealFor(puzzle.prompts[index]));
}

// ---------- Admin API (manual review pass) ----------
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
    const existing = await loadPuzzle(env, date);
    if (existing?.source === "llm" && url.searchParams.get("force") !== "true") {
      return err("An LLM puzzle already exists for that date. Add force=true to replace it.", 409);
    }
    return json(await generateDaily(env, date));
  }
  if (route === "puzzle" && request.method === "GET") {
    return json((await loadPuzzle(env, date)) || { error: "No puzzle stored for that date." }, 200);
  }
  if (route === "puzzle" && request.method === "PUT") {
    let p;
    try { p = await request.json(); } catch { return err("Expected JSON."); }
    if (!Array.isArray(p?.prompts) || p.prompts.length !== PROMPTS_PER_DAY) return err(`Puzzle needs exactly ${PROMPTS_PER_DAY} prompts.`);
    for (const s of p.prompts) {
      if (typeof s.text !== "string" || !Array.isArray(s.answers) || !s.answers.length) return err("Every prompt needs text and answers.");
      for (const a of s.answers) {
        a.aliases ||= [];
        a.share = +a.share || 0;
        if (![1, 2, 3, 4, 5, 6].includes(a.tier)) a.tier = tierFor({ ...a, gem: a.answer === s.gem });
      }
      if (!s.gem) s.gem = s.answers.find((a) => a.tier === 6)?.answer || "";
    }
    const puzzle = { ...p, date, status: p.status === "draft" ? "draft" : "live", edited_at: new Date().toISOString() };
    await env.PUZZLES.put(puzzleKey(date), JSON.stringify(puzzle));
    return json({ ok: true, date, status: puzzle.status });
  }
  if (route === "publish" && request.method === "POST") {
    const p = await loadPuzzle(env, date);
    if (!p) return err("No puzzle stored for that date.", 404);
    p.status = "live";
    await env.PUZZLES.put(puzzleKey(date), JSON.stringify(p));
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
      if (url.pathname === "/api/reveal" && request.method === "GET") return await getReveal(env, url);
      if (url.pathname.startsWith("/api/admin/")) return await admin(env, request, url);
      return err("Not found.", 404);
    } catch (e) {
      console.error(e);
      return err("Something went wrong on our side.", 500);
    }
  },

  // Cron: make sure the next two days have puzzles, so there's time for a human review.
  async scheduled(event, env, ctx) {
    if (!env.ANTHROPIC_API_KEY) return console.warn("ANTHROPIC_API_KEY not set; skipping puzzle generation.");
    const now = Date.now();
    for (const date of [isoDate(now + DAY), isoDate(now + 2 * DAY)]) {
      if (await loadPuzzle(env, date)) continue;
      try {
        await generateDaily(env, date);
        console.log(`Generated puzzle for ${date}`);
      } catch (e) {
        console.error(`Puzzle generation failed for ${date}:`, e.message);
      }
    }
  },
};
