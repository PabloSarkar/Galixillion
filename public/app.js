import { ROUND_SECONDS, PROMPTS_PER_DAY, MAX_SCORE, ZONES, zoneFor, kmFor, formatKm, matchAnswer, seedPuzzle } from "./shared/game-core.js";
import { RARITY_TIERS, sanitize, createFrequencyIndex, scoreAnswer } from "./shared/zipf.js";

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const PX_PER_POINT = 16;
const TIER_EMOJI = ["⬛", "⬜", "🟫", "🟦", "🟩", "🟪", "🌟"];
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- Backend (with offline fallback) ----------
// Online: the Worker validates answers with Claude and scores them by corpus frequency.
// Offline (static hosting, or the API is down): validate against the built-in answer lists
// and score with the same frequency data, loaded from /freq.
const api = {
  offline: false,
  local: null,
  freq: createFrequencyIndex(async (path) => {
    const r = await fetch(`freq/${path}`);
    return r.ok ? r.text() : null;
  }),
  async daily(date) {
    try {
      const r = await fetch(`/api/daily?date=${date}`);
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch {
      this.offline = true;
      this.local = seedPuzzle(date);
      return { date, number: null, source: "seed", prompts: this.local.prompts.map((p, index) => ({ index, id: p.id, prompt: p.prompt, category: p.category })) };
    }
  },
  async answer(date, index, answer) {
    if (this.offline) {
      const clean = sanitize(answer);
      if (!matchAnswer(this.local.prompts[index], clean)) return { valid: false, reason: "Not on our star charts." };
      return { valid: true, answer: clean, ...(await scoreAnswer(this.freq, clean)) };
    }
    const r = await fetch("/api/answer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ date, index, answer }) });
    if (!r.ok) return { valid: false, reason: "Signal lost. Try again." };
    return r.json();
  },
};

// ---------- Game state ----------
const state = {
  puzzle: null,
  round: 0,
  score: 0,
  results: [],   // { text, answer, tier, points }
  timeLeft: ROUND_SECONDS,
  timerId: null,
  locked: false,
  pending: false,
};
const saveKey = () => `cosmillion:v2:${state.puzzle.date}`;
const save = () => store.set(saveKey(), { round: state.round, score: state.score, results: state.results });

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
}

async function init() {
  $("tier-legend").innerHTML = RARITY_TIERS.slice().reverse()
    .map((t) => `<li><span>${escapeHtml(t.name)}</span><span class="pts">${t.min}–${t.max}</span></li>`).join("");
  state.puzzle = await api.daily(localDate());
  $("puzzle-label").textContent = state.puzzle.number
    ? `Launch #${state.puzzle.number} · ${state.puzzle.date}`
    : `Launch for ${state.puzzle.date}`;
  $("offline-note").hidden = !api.offline;

  // Resume or show today's finished flight.
  const saved = store.get(saveKey());
  if (saved) {
    Object.assign(state, { round: saved.round, score: saved.score, results: saved.results || [] });
    scene.jumpTo(state.score);
    updateHud(state.score);
    if (state.results.length >= PROMPTS_PER_DAY) return endGame();
    $("btn-start").textContent = "Resume flight";
  }
  $("btn-start").disabled = false;
}

function nextRound() {
  if (state.results.length >= PROMPTS_PER_DAY) return endGame();
  state.round = state.results.length;
  const prompt = state.puzzle.prompts[state.round];
  state.locked = false;
  state.pending = false;
  state.timeLeft = ROUND_SECONDS;
  $("round").textContent = `Prompt ${state.round + 1} / ${PROMPTS_PER_DAY}`;
  $("question").textContent = prompt.prompt;
  $("answer").value = "";
  $("answer").disabled = false;
  $("btn-fire").disabled = false;
  setFeedback("");
  renderTimer();
  showScreen("screen-q");
  setTimeout(() => $("answer").focus(), 50);
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    if (state.pending) return; // clock pauses while mission control checks an answer
    state.timeLeft -= 0.25;
    renderTimer();
    if (state.timeLeft <= 0) finishRound(null, "timeout");
  }, 250);
}

function renderTimer() {
  const t = Math.max(0, state.timeLeft);
  $("timer-text").textContent = Math.ceil(t);
  $("timer-bar").style.width = `${(t / ROUND_SECONDS) * 100}%`;
  $("timer-bar").classList.toggle("low", t <= 6);
}

function setFeedback(text, kind = "") {
  $("feedback").textContent = text;
  $("feedback").className = `feedback ${kind}`;
}

async function submitAnswer(e) {
  e.preventDefault();
  if (state.locked || state.pending) return;
  const text = $("answer").value.trim();
  if (!text) return;
  state.pending = true;
  $("answer").disabled = true;
  $("btn-fire").disabled = true;
  setFeedback("Checking with mission control…", "pending");
  let res;
  try { res = await api.answer(state.puzzle.date, state.round, text); } catch { res = { valid: false, reason: "Signal lost. Try again." }; }
  state.pending = false;
  if (state.locked) return;
  if (res.valid) return finishRound({ ...res, typed: text }, "answer");
  $("answer").disabled = false;
  $("btn-fire").disabled = false;
  setFeedback(`“${text}” — ${res.reason || "doesn't fit."} Try another.`, "bad");
  const input = $("answer");
  input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
  input.focus(); input.select();
}

async function finishRound(res, reason) {
  if (state.locked) return;
  state.locked = true;
  clearInterval(state.timerId);

  const prompt = state.puzzle.prompts[state.round];
  const points = res ? res.points : 0;
  const prevZone = zoneFor(state.score);
  state.score += points;
  state.results.push({ text: prompt.prompt, answer: res ? res.typed : null, tier: res ? res.tier : 0, points });
  save();

  $("reveal-title").innerHTML = res
    ? `You said <b>${escapeHtml(res.typed)}</b>. ${escapeHtml(res.label)}`
    : reason === "timeout" ? "Out of time — engines stayed cold." : "Prompt skipped.";
  $("reveal-points").textContent = res ? `${res.tierName} · +${points}` : "+0";
  $("reveal-points").classList.toggle("zero", !points);
  $("reveal-sub").textContent = !res ? ""
    : res.inVocabulary
      ? `Corpus frequency: Zipf ${res.zipf.toFixed(2)}. Rarer than ${Math.round(res.percentile)}% of English words.`
      : "Not found in the word-frequency corpus: maximum rarity.";
  const newZone = zoneFor(state.score);
  if (newZone !== prevZone) setTimeout(() => { $("reveal-sub").textContent += ` Heading for ${newZone.name}!`; }, 900);
  $("btn-next").textContent = state.results.length >= PROMPTS_PER_DAY ? "See mission report" : "Next prompt";
  renderLadder(res ? res.tier : 0);
  showScreen("screen-reveal");
  scene.flyTo(state.score);
}

function renderLadder(yourTier) {
  $("ladder").innerHTML = RARITY_TIERS.slice().reverse().map((t) => {
    const cls = [t.id === yourTier ? "you" : "", t.id === 6 ? "gem" : ""].join(" ");
    return `<li class="${cls}"><span>${escapeHtml(t.name)}${t.id === yourTier ? " (you)" : ""}</span><span class="pts">${t.min}–${t.max}</span>
      <span class="examples">${escapeHtml(t.band)}</span></li>`;
  }).join("");
  $("reveal-total").textContent = "Scored by how rarely your answer's words appear in English text (wordfreq corpus).";
}

function endGame() {
  clearInterval(state.timerId);
  showScreen("screen-end");
  const zone = zoneFor(state.score);
  $("end-score").textContent = `${state.score} / ${MAX_SCORE}`;
  $("end-zone").textContent = `Your rocket reached ${zone.name}.`;
  $("end-alt").textContent = `Final altitude: ${formatKm(kmFor(state.score))}`;
  $("summary").innerHTML = state.results.map((r) =>
    `<li>${escapeHtml(r.text)} — <b>${r.answer ? escapeHtml(r.answer) : "no answer"}</b> <span class="pts">+${r.points}</span></li>`).join("");
}

function shareText() {
  const label = state.puzzle.number ? `#${state.puzzle.number}` : state.puzzle.date;
  return `Cosmillion ${label} 🚀 ${state.score}/${MAX_SCORE}\n${state.results.map((r) => TIER_EMOJI[r.tier]).join("")}\nReached ${zoneFor(state.score).name}\n${location.origin}`;
}

async function share() {
  const text = shareText();
  try {
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); $("share-status").textContent = "Copied!"; }
  } catch { /* user cancelled */ }
}

function updateHud(score) {
  $("alt").textContent = formatKm(kmFor(score));
  $("score").textContent = Math.round(score).toLocaleString();
  $("zone").textContent = zoneFor(score).name;
}

const scene = (() => {
  const canvas = $("sky");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  let shown = 0;               // score currently displayed (animates)
  let tween = null;            // { from, to, t0, dur }
  let velocity = 0;            // points per second, for effects
  let launched = false;
  let last = performance.now();
  const particles = [];
  let stars = [];
  const asteroids = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random() * 260 - 130, r: 2 + Math.random() * 6 }));
  const kuiper = Array.from({ length: 50 }, () => ({ x: Math.random(), y: Math.random() * 300 - 150, r: 1 + Math.random() * 3 }));

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    stars = Array.from({ length: Math.round((W * H) / 2600) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + 0.2,
      depth: Math.random() * 0.8 + 0.2, tw: Math.random() * Math.PI * 2,
    }));
  }

  function layout() {
    const mobile = W <= 760;
    const rocketX = mobile ? W / 2 : Math.max(120, (W - 464) / 2);
    const rocketY = mobile ? H * 0.24 : H * 0.62;
    const bodyX = mobile ? W * 0.22 : Math.max(70, rocketX - Math.min(260, W * 0.2));
    return { mobile, rocketX, rocketY, bodyX };
  }

  function skyColor(score) {
    // blue → dusk → black as we climb past the Kármán line
    const stops = [
      [0, [70, 140, 220]], [15, [40, 90, 180]], [40, [14, 24, 70]], [80, [5, 7, 22]], [99999, [4, 5, 15]],
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      const [s0, c0] = stops[i], [s1, c1] = stops[i + 1];
      if (score <= s1) {
        const t = (score - s0) / (s1 - s0);
        return c0.map((c, k) => Math.round(lerp(c, c1[k], t)));
      }
    }
    return stops[stops.length - 1][1];
  }

  function worldToScreenY(worldScore, L) {
    return L.rocketY - (worldScore - shown) * PX_PER_POINT;
  }

  function drawBackground(L, now) {
    const top = skyColor(shown + (H * 0.6) / PX_PER_POINT);
    const bottom = skyColor(Math.max(0, shown - (H * 0.4) / PX_PER_POINT));
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgb(${top})`);
    g.addColorStop(1, `rgb(${bottom})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const starAlpha = clamp((shown - 12) / 40, 0.08, 1);
    const streak = clamp(velocity * PX_PER_POINT * 0.04, 0, 60);
    for (const s of stars) {
      const y = ((s.y + shown * PX_PER_POINT * s.depth * 0.35) % H + H) % H;
      const a = starAlpha * (0.6 + 0.4 * Math.sin(now / 700 + s.tw));
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      if (streak > 2) {
        ctx.fillRect(s.x, y - streak * s.depth, s.r, streak * s.depth + s.r);
      } else {
        ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawGround(L) {
    const y = worldToScreenY(0, L) + 46; // ground just below rocket base at score 0
    if (y > H + 200) return;
    // Clouds layer near cloud deck
    ctx.fillStyle = "#1b3d23";
    ctx.fillRect(0, y, W, H - y + 400);
    ctx.fillStyle = "#2c5a33";
    ctx.fillRect(0, y, W, 8);
    // pad
    ctx.fillStyle = "#555c6b";
    ctx.fillRect(L.rocketX - 60, y - 6, 120, 8);
    // tower
    ctx.strokeStyle = "#9aa3b5"; ctx.lineWidth = 3;
    const tx = L.rocketX - 48;
    ctx.beginPath(); ctx.moveTo(tx, y - 6); ctx.lineTo(tx, y - 110); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(tx - 8, y - 12 - i * 17); ctx.lineTo(tx + 8, y - 28 - i * 17); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(tx, y - 90); ctx.lineTo(L.rocketX - 14, y - 90); ctx.stroke();
  }

  function drawClouds(L, now) {
    const base = worldToScreenY(15, L);
    if (base < -200 || base > H + 300) return;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 9; i++) {
      const cx = ((i * 211 + now * 0.01 * (i % 3 + 1)) % (W + 300)) - 150;
      const cy = base + ((i * 97) % 220) - 110;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.arc(cx + k * 26, cy + (k % 2) * 8, 22 + (k % 3) * 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawZoneLines(L) {
    ctx.font = "600 11px Inter, sans-serif";
    ctx.textBaseline = "bottom";
    for (const z of ZONES) {
      if (!z.score) continue;
      const y = worldToScreenY(z.score, L);
      if (y < -40 || y > H + 40) continue;
      ctx.strokeStyle = "rgba(180,200,255,0.18)";
      ctx.setLineDash([6, 8]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(200,215,255,0.75)";
      ctx.fillText(`${z.name.toUpperCase()} · ${formatKm(z.km)}`, 14, y - 4);
    }
  }

  function circle(x, y, r, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  function drawBodies(L, now) {
    for (const z of ZONES) {
      if (!z.body) continue;
      const y = worldToScreenY(z.score, L) - 70;
      if (y < -260 || y > H + 260) continue;
      const x = L.bodyX;
      switch (z.body) {
        case "station": {
          const sx = (now * 0.05) % (W + 200) - 100;
          ctx.fillStyle = "#c9d1e4"; ctx.fillRect(sx - 10, y - 4, 20, 8);
          ctx.fillStyle = "#3d6bd8"; ctx.fillRect(sx - 44, y - 12, 30, 24); ctx.fillRect(sx + 14, y - 12, 30, 24);
          break;
        }
        case "moon": {
          const r = L.mobile ? 46 : 70;
          const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
          g.addColorStop(0, "#f2f2ee"); g.addColorStop(1, "#9a9a96");
          circle(x, y, r, g);
          [[-0.3, -0.2, 0.18], [0.35, 0.1, 0.12], [-0.05, 0.45, 0.1], [0.2, -0.45, 0.08]].forEach(([dx, dy, rr]) =>
            circle(x + dx * r, y + dy * r, rr * r, "rgba(110,110,105,0.45)"));
          break;
        }
        case "mars": {
          const r = L.mobile ? 40 : 58;
          const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
          g.addColorStop(0, "#f08a5d"); g.addColorStop(1, "#8e2f16");
          circle(x, y, r, g);
          circle(x, y - r * 0.82, r * 0.25, "rgba(255,255,255,0.7)");
          break;
        }
        case "belt": {
          for (const a of asteroids) circle(a.x * W, y + a.y, a.r, "#8a7d6e");
          break;
        }
        case "jupiter": {
          const r = L.mobile ? 70 : 110;
          ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
          const bands = ["#d8b48a", "#b27b53", "#e8d2b0", "#a46a45", "#dcc09a", "#c08a5f", "#efdcc0"];
          bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x - r, y - r + (i * 2 * r) / bands.length, 2 * r, (2 * r) / bands.length + 1); });
          circle(x + r * 0.35, y + r * 0.25, r * 0.14, "#b8432a");
          ctx.restore();
          break;
        }
        case "saturn": {
          const r = L.mobile ? 50 : 72;
          ctx.strokeStyle = "rgba(230,210,160,0.8)"; ctx.lineWidth = 7;
          ctx.beginPath(); ctx.ellipse(x, y, r * 1.9, r * 0.45, -0.25, Math.PI, Math.PI * 2); ctx.stroke();
          const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
          g.addColorStop(0, "#f3dfa8"); g.addColorStop(1, "#b38b4a");
          circle(x, y, r, g);
          ctx.beginPath(); ctx.ellipse(x, y, r * 1.9, r * 0.45, -0.25, 0, Math.PI); ctx.stroke();
          break;
        }
        case "uranus": {
          const r = L.mobile ? 38 : 52;
          const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
          g.addColorStop(0, "#c8f4f4"); g.addColorStop(1, "#4fa6b5");
          circle(x, y, r, g);
          break;
        }
        case "neptune": {
          const r = L.mobile ? 38 : 50;
          const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
          g.addColorStop(0, "#7da8ff"); g.addColorStop(1, "#1f3c9c");
          circle(x, y, r, g);
          break;
        }
        case "kuiper": {
          for (const k of kuiper) circle(k.x * W, y + k.y, k.r, "#bcd3e6");
          break;
        }
        case "galaxy": {
          ctx.save(); ctx.translate(x + 40, y); ctx.rotate(now / 9000);
          for (let i = 0; i < 260; i++) {
            const arm = i % 2, t = i / 260 * 4;
            const rr = t * 30;
            const ang = t * 2.2 + arm * Math.PI;
            circle(Math.cos(ang) * rr, Math.sin(ang) * rr * 0.55, 1.6, `rgba(${200 + arm * 40},${170},255,${0.9 - t * 0.2})`);
          }
          circle(0, 0, 10, "rgba(255,240,210,0.9)");
          ctx.restore();
          break;
        }
      }
    }
  }

  function drawRocket(L, now, dt) {
    const bob = launched ? Math.sin(now / 400) * 3 : 0;
    const x = L.rocketX, y = L.rocketY + bob;
    const thrust = launched ? clamp(0.35 + velocity / 25, 0.35, 1.6) : 0;

    // exhaust particles
    if (thrust > 0) {
      const n = Math.round(thrust * 3);
      for (let i = 0; i < n; i++) {
        particles.push({ x: x + (Math.random() - 0.5) * 12, y: y + 44, vx: (Math.random() - 0.5) * 40,
          vy: 120 + velocity * PX_PER_POINT * 0.6 + Math.random() * 60, life: 1, r: 4 + Math.random() * 6 });
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.4; p.r += dt * 18;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(200,200,215,${p.life * 0.35})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }

    // flame
    if (thrust > 0) {
      const len = 30 + thrust * 50 + Math.random() * 12;
      const fg = ctx.createLinearGradient(0, y + 34, 0, y + 34 + len);
      fg.addColorStop(0, "rgba(255,255,220,1)");
      fg.addColorStop(0.3, "rgba(255,190,70,0.95)");
      fg.addColorStop(1, "rgba(255,70,30,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(x - 12, y + 34);
      ctx.quadraticCurveTo(x, y + 34 + len * 1.1, x + 12, y + 34);
      ctx.fill();
    }

    // fins
    ctx.fillStyle = "#e0463b";
    ctx.beginPath(); ctx.moveTo(x - 16, y + 8); ctx.lineTo(x - 32, y + 40); ctx.lineTo(x - 14, y + 34); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 16, y + 8); ctx.lineTo(x + 32, y + 40); ctx.lineTo(x + 14, y + 34); ctx.fill();
    // body
    const bg = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
    bg.addColorStop(0, "#c9cfdc"); bg.addColorStop(0.45, "#ffffff"); bg.addColorStop(1, "#9ea6b8");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(x, y - 60);
    ctx.bezierCurveTo(x + 22, y - 36, x + 18, y + 10, x + 15, y + 36);
    ctx.lineTo(x - 15, y + 36);
    ctx.bezierCurveTo(x - 18, y + 10, x - 22, y - 36, x, y - 60);
    ctx.fill();
    // nose
    ctx.fillStyle = "#e0463b";
    ctx.beginPath();
    ctx.moveTo(x, y - 60);
    ctx.bezierCurveTo(x + 12, y - 48, x + 16, y - 40, x + 17, y - 34);
    ctx.lineTo(x - 17, y - 34);
    ctx.bezierCurveTo(x - 16, y - 40, x - 12, y - 48, x, y - 60);
    ctx.fill();
    // window
    circle(x, y - 12, 8, "#2a3555");
    circle(x, y - 12, 5.5, "#7fd3ff");
    circle(x - 2, y - 14, 1.8, "rgba(255,255,255,0.8)");
    // center fin
    ctx.fillStyle = "#b8352c"; ctx.fillRect(x - 2, y + 14, 4, 24);
    // nozzle
    ctx.fillStyle = "#555c6b"; ctx.fillRect(x - 10, y + 34, 20, 5);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const prev = shown;
    if (tween) {
      const t = clamp((now - tween.t0) / tween.dur, 0, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      shown = lerp(tween.from, tween.to, e);
      if (t >= 1) tween = null;
      updateHud(shown);
    }
    velocity = dt > 0 ? (shown - prev) / dt : 0;

    const L = layout();
    drawBackground(L, now);
    drawClouds(L, now);
    drawBodies(L, now);
    drawZoneLines(L);
    drawGround(L);
    drawRocket(L, now, dt);
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);

  return {
    jumpTo(score) { shown = score; tween = null; launched = score > 0; },
    flyTo(score) {
      if (score <= shown) return;
      launched = true;
      const dist = score - shown;
      tween = { from: shown, to: score, t0: performance.now(), dur: clamp(1200 + dist * 22, 1400, 3600) };
    },
  };
})();

// ---------- Wire up ----------
$("btn-start").addEventListener("click", nextRound);
$("btn-next").addEventListener("click", nextRound);
$("btn-skip").addEventListener("click", () => { if (!state.pending) finishRound(null, "skip"); });
$("btn-share").addEventListener("click", share);
$("answer-form").addEventListener("submit", submitAnswer);
updateHud(0);
init();
