(() => {
  "use strict";

  // ---------- Config ----------
  const ROUNDS = 8;
  const ROUND_TIME = 30;            // seconds
  const PX_PER_POINT = 1.6;         // world pixels climbed per point
  const MIN_POINTS = 10;
  const MAX_POINTS = 1000;

  // Milestones the rocket passes. `score` = cumulative points needed.
  const ZONES = [
    { score: 0,    name: "Launchpad",          km: 0 },
    { score: 150,  name: "Cloud deck",          km: 10 },
    { score: 400,  name: "Kármán line",         km: 100 },
    { score: 800,  name: "Low Earth orbit",     km: 400,            body: "station" },
    { score: 1400, name: "The Moon",            km: 384400,         body: "moon" },
    { score: 2100, name: "Mars",                km: 225e6,          body: "mars" },
    { score: 2900, name: "Asteroid belt",       km: 4.0e8,          body: "belt" },
    { score: 3700, name: "Jupiter",             km: 7.78e8,         body: "jupiter" },
    { score: 4500, name: "Saturn",              km: 1.43e9,         body: "saturn" },
    { score: 5300, name: "Uranus",              km: 2.87e9,         body: "uranus" },
    { score: 6100, name: "Neptune",             km: 4.5e9,          body: "neptune" },
    { score: 7000, name: "Kuiper belt",         km: 7.5e9,          body: "kuiper" },
    { score: 8000, name: "Interstellar space",  km: 2.4e10,         body: "galaxy" },
  ];

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  function zoneFor(score) {
    let z = ZONES[0];
    for (const zone of ZONES) if (score >= zone.score) z = zone;
    return z;
  }

  function kmFor(score) {
    for (let i = 0; i < ZONES.length - 1; i++) {
      const a = ZONES[i], b = ZONES[i + 1];
      if (score < b.score) {
        const t = (score - a.score) / (b.score - a.score);
        if (a.km <= 0) return lerp(a.km, b.km, t);
        return a.km * Math.pow(b.km / a.km, t); // geometric — space gets big fast
      }
    }
    const last = ZONES[ZONES.length - 1];
    return last.km * Math.pow(1.6, (score - last.score) / 500);
  }

  function formatKm(km) {
    if (km < 1000) return `${Math.round(km).toLocaleString()} km`;
    if (km < 1e6) return `${Math.round(km).toLocaleString()} km`;
    if (km < 1e9) return `${(km / 1e6).toFixed(1)} million km`;
    return `${(km / 1e9).toFixed(2)} billion km`;
  }

  // ---------- Answer matching ----------
  const STRIP_WORDS = ["space telescope", "telescope", "constellation", "galaxy", "spacecraft", "rocket", "rover", "mission", "probe", "the"];

  function norm(s) {
    return s.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ")
      .replace(/['’`]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function variants(s) {
    const n = norm(s);
    const out = new Set([n.replace(/ /g, "")]);
    let stripped = " " + n + " ";
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

  // Precompute lookup keys for each answer of a question.
  function prepareQuestion(q) {
    const total = q.a.reduce((s, x) => s + x[1], 0);
    const answers = q.a.map(([name, weight, ...aliases]) => {
      const pct = (weight / total) * 100;
      const keys = new Set();
      for (const k of [name, ...aliases]) variants(k).forEach((v) => keys.add(v));
      return { name, pct, points: pointsFor(pct), keys: [...keys] };
    });
    answers.sort((x, y) => y.pct - x.pct);
    return { q: q.q, answers };
  }

  function pointsFor(pct) {
    // Halving popularity adds 100 points. 50% → 100, 1% → ~660, 0.1% → ~1000.
    return Math.round(clamp(100 * Math.log2(100 / pct), MIN_POINTS, MAX_POINTS));
  }

  function matchAnswer(pq, input) {
    const ins = variants(input).filter(Boolean);
    if (!ins.length) return null;
    for (const a of pq.answers) if (a.keys.some((k) => ins.includes(k))) return a;
    let best = null, bestD = 99;
    for (const a of pq.answers) {
      for (const k of a.keys) {
        for (const v of ins) {
          const allowed = k.length >= 9 ? 2 : k.length >= 5 ? 1 : 0;
          if (!allowed) continue;
          const d = levenshtein(v, k);
          if (d <= allowed && d < bestD) { best = a; bestD = d; }
        }
      }
    }
    return best;
  }

  // ---------- Storage (optional) ----------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  // ---------- Game state ----------
  const state = {
    round: 0,
    questions: [],
    score: 0,
    history: [],
    timeLeft: ROUND_TIME,
    timerId: null,
    current: null,
    locked: false,
  };

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
  }

  function updateBest() {
    const best = Number(store.get("cosmillion-best") || 0);
    $("best").textContent = best ? `${best.toLocaleString()} pts · ${zoneFor(best).name}` : "—";
  }

  function startGame() {
    state.round = 0;
    state.score = 0;
    state.history = [];
    state.questions = shuffle(window.QUESTIONS).slice(0, ROUNDS).map(prepareQuestion);
    scene.reset();
    updateHud(0);
    nextRound();
  }

  function nextRound() {
    if (state.round >= ROUNDS) return endGame();
    state.current = state.questions[state.round];
    state.round++;
    state.locked = false;
    state.timeLeft = ROUND_TIME;
    $("round").textContent = `Round ${state.round} / ${ROUNDS}`;
    $("question").textContent = state.current.q;
    $("answer").value = "";
    $("feedback").textContent = "";
    $("feedback").className = "feedback";
    renderTimer();
    showScreen("screen-q");
    setTimeout(() => $("answer").focus(), 50);
    clearInterval(state.timerId);
    state.timerId = setInterval(() => {
      state.timeLeft -= 0.25;
      renderTimer();
      if (state.timeLeft <= 0) finishRound(null, "timeout");
    }, 250);
  }

  function renderTimer() {
    const t = Math.max(0, state.timeLeft);
    $("timer-text").textContent = Math.ceil(t);
    $("timer-bar").style.width = `${(t / ROUND_TIME) * 100}%`;
    $("timer-bar").classList.toggle("low", t <= 8);
  }

  function submitAnswer(e) {
    e.preventDefault();
    if (state.locked) return;
    const text = $("answer").value.trim();
    if (!text) return;
    const hit = matchAnswer(state.current, text);
    if (hit) return finishRound(hit, "answer");
    const fb = $("feedback");
    fb.textContent = `“${text}” isn't on our star charts — try another.`;
    fb.className = "feedback bad";
    const input = $("answer");
    input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
    input.select();
  }

  function finishRound(hit, reason) {
    if (state.locked) return;
    state.locked = true;
    clearInterval(state.timerId);

    const pts = hit ? hit.points : 0;
    const prevScore = state.score;
    state.score += pts;
    state.history.push({ q: state.current.q, answer: hit ? hit.name : null, pts, pct: hit ? hit.pct : null });

    // Reveal screen
    $("reveal-title").innerHTML = hit
      ? `You said <b>${escapeHtml(hit.name)}</b> — ${formatPct(hit.pct)} of crews agreed.`
      : reason === "timeout" ? "Out of time — engines stayed cold." : "Round skipped.";
    const ptsEl = $("reveal-points");
    ptsEl.textContent = `+${pts}`;
    ptsEl.classList.toggle("zero", pts === 0);
    $("reveal-sub").textContent = rarityLabel(hit);
    renderDistribution(state.current, hit);
    $("btn-next").textContent = state.round >= ROUNDS ? "See mission report" : "Next round";
    showScreen("screen-reveal");

    // Fly!
    const fromZone = zoneFor(prevScore);
    const toZone = zoneFor(state.score);
    if (toZone !== fromZone) {
      setTimeout(() => {
        $("reveal-sub").textContent = `${rarityLabel(hit)} Heading for ${toZone.name}!`;
      }, 900);
    }
    scene.flyTo(state.score);
  }

  function rarityLabel(hit) {
    if (!hit) return "";
    const p = hit.pct;
    if (p < 0.5) return "Ultra-rare answer — full thrust.";
    if (p < 2) return "Rare answer — strong burn.";
    if (p < 8) return "Uncommon — a decent boost.";
    if (p < 20) return "Pretty common — a gentle lift.";
    return "Everyone said that — barely off the pad.";
  }

  function formatPct(p) {
    if (p < 0.1) return "<0.1%";
    if (p < 10) return `${p.toFixed(1)}%`;
    return `${Math.round(p)}%`;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderDistribution(pq, hit) {
    const list = $("dist");
    list.innerHTML = "";
    const top = pq.answers.slice(0, 5);
    const maxPct = pq.answers[0].pct;
    const row = (a) => {
      const li = document.createElement("li");
      if (a === hit) li.className = "you";
      li.innerHTML = `<span>${escapeHtml(a.name)}${a === hit ? " (you)" : ""}</span><span class="pct">${formatPct(a.pct)} · ${a.points} pts</span>
        <div class="bar"><span style="width:${Math.max(1.5, (a.pct / maxPct) * 100)}%"></span></div>`;
      return li;
    };
    top.forEach((a) => list.appendChild(row(a)));
    if (hit && !top.includes(hit)) {
      const gap = document.createElement("li");
      gap.className = "gap"; gap.textContent = "· · ·";
      list.appendChild(gap);
      list.appendChild(row(hit));
    }
    const rare = pq.answers.slice(-3).filter((a) => a !== hit).map((a) => `<b>${escapeHtml(a.name)}</b>`);
    $("rare-hint").innerHTML = `${pq.answers.length} answers on the chart. Deep-space picks: ${rare.join(", ")}.`;
  }

  function endGame() {
    showScreen("screen-end");
    const zone = zoneFor(state.score);
    $("end-score").textContent = `${state.score.toLocaleString()} pts`;
    $("end-zone").textContent = `Your rocket reached ${zone.name}.`;
    $("end-alt").textContent = `Final altitude: ${formatKm(kmFor(state.score))}`;
    const list = $("summary");
    list.innerHTML = "";
    for (const h of state.history) {
      const li = document.createElement("li");
      li.innerHTML = `${escapeHtml(h.q)} — <b>${h.answer ? escapeHtml(h.answer) : "no answer"}</b> <span class="pts">+${h.pts}</span>`;
      list.appendChild(li);
    }
    const best = Number(store.get("cosmillion-best") || 0);
    if (state.score > best) store.set("cosmillion-best", String(state.score));
    updateBest();
  }

  function updateHud(score) {
    $("alt").textContent = formatKm(kmFor(score));
    $("score").textContent = Math.round(score).toLocaleString();
    $("zone").textContent = zoneFor(score).name;
  }

  // ---------- Scene (canvas) ----------
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
        [0, [70, 140, 220]], [150, [40, 90, 180]], [400, [14, 24, 70]], [800, [5, 7, 22]], [99999, [4, 5, 15]],
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

      const starAlpha = clamp((shown - 120) / 400, 0.08, 1);
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
      const base = worldToScreenY(150, L);
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
      const thrust = launched ? clamp(0.35 + velocity / 250, 0.35, 1.6) : 0;

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
      reset() { shown = 0; tween = null; launched = false; particles.length = 0; },
      flyTo(score) {
        if (score <= shown) return;
        launched = true;
        const dist = score - shown;
        tween = { from: shown, to: score, t0: performance.now(), dur: clamp(1200 + dist * 2.2, 1400, 3600) };
      },
    };
  })();

  // ---------- Wire up ----------
  $("btn-start").addEventListener("click", startGame);
  $("btn-again").addEventListener("click", startGame);
  $("btn-next").addEventListener("click", nextRound);
  $("btn-skip").addEventListener("click", () => finishRound(null, "skip"));
  $("answer-form").addEventListener("submit", submitAnswer);
  updateBest();
  updateHud(0);
})();
