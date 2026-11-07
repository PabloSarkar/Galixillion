# Cosmillion

A daily rare-answer space trivia game. Everyone gets the same 7 prompts per day and has 25 seconds to type one
answer to each. **The fewer players who would give your answer, the more points you get**, and your points fly
your rocket from the launchpad toward interstellar space.

Runs on **Cloudflare Workers** (static assets + KV + Cron Triggers), with **Claude** writing prompts, building
answer sheets and judging answers that aren't on the sheet.

## How it works

The workflow follows how rare-answer games like this are run: answers are scored against a pre-built answer sheet,
not against a live count of what other players typed.

1. **Prompts (daily cron, 00:05 UTC).** Claude writes 7 prompts for each of the next two days, avoiding recent ones.
2. **Answer sheets.** For each prompt, Claude lists 80–200 valid answers with aliases, an estimated share of players
   who would type each one, a "too clever" flag, and one curated **gem**.
3. **Tiers.** The share is turned into a fixed tier in code, so scoring stays consistent:

   | Tier | Points | Rule |
   |---|---|---|
   | One in a Cosmillion | 100 | the curated gem |
   | Deep Space | 85 | under 0.2% of players |
   | Rare | 60 | 0.2–1% |
   | Orbiter | 30 | 1–5% |
   | Too Clever | 15 | sounds rare, but many people pick it to be clever |
   | Stardust | 10 | 5% or more |

   A perfect run is 700 points.
4. **Scoring is server-side.** Answer sheets stay in KV and never reach the browser before you answer. The Worker
   matches answers by alias, ignoring case, punctuation and "the", and tolerates small typos.
5. **Answers missing from the sheet** go to Claude as a judge, which checks validity and estimates rarity. A judged
   answer can reach Deep Space (85) but never the gem tier. Verdicts are cached in KV, so everyone who types the
   same answer gets the same score. Calls are rate-limited per IP.
6. **Human review (optional).** Puzzles are generated two days ahead. Set `REQUIRE_REVIEW` to `"true"` to hold them
   as drafts until you publish them through the admin API.
7. **No API key?** The game falls back to the built-in puzzles in `public/shared/seed-bank.js`. If the API can't be
   reached at all (for example on plain static hosting), the browser scores locally against those same puzzles.

## Deploy to Cloudflare

```bash
npm install
```

```bash
npx wrangler login
```

```bash
npx wrangler kv namespace create PUZZLES
```

Paste the printed `id` into `wrangler.jsonc` in place of `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`. Then set the secrets:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

```bash
npx wrangler secret put ADMIN_TOKEN
```

```bash
npm run deploy
```

Generate today's puzzle right away, instead of waiting for the cron:

```bash
curl -X POST "https://cosmillion.<your-subdomain>.workers.dev/api/admin/generate?date=$(date -u +%F)&force=true" -H "Authorization: Bearer $ADMIN_TOKEN"
```

To use your own domain, add it under the Worker's **Settings → Domains & Routes** in the Cloudflare dashboard.

### Local development

```bash
cp .dev.vars.example .dev.vars
```

```bash
npm run dev
```

Without an API key in `.dev.vars`, the dev server plays the built-in puzzles.

```bash
npm test
```

## Admin API

All admin calls need `Authorization: Bearer <ADMIN_TOKEN>`.

| Method | Path | What it does |
|---|---|---|
| `POST` | `/api/admin/generate?date=YYYY-MM-DD[&force=true]` | Generate a puzzle with Claude |
| `GET` | `/api/admin/puzzle?date=YYYY-MM-DD` | Full puzzle, including answer sheets, for review |
| `PUT` | `/api/admin/puzzle?date=YYYY-MM-DD` | Replace a puzzle after hand edits; a missing `tier` is recomputed from `share` |
| `POST` | `/api/admin/publish?date=YYYY-MM-DD` | Publish a draft |

## Public API

| Method | Path | Returns |
|---|---|---|
| `GET` | `/api/daily?date=YYYY-MM-DD` | Prompt texts only. Players can request UTC yesterday through tomorrow, to cover every time zone |
| `POST` | `/api/answer` `{date, index, answer}` | `{accepted, answer, tier, tierName, points, source}` or `{accepted: false, reason}` |
| `GET` | `/api/reveal?date=&index=` | The gem plus example answers for each tier |

## Configuration (`wrangler.jsonc` → `vars`)

- `MODEL` writes prompts and sheets; `JUDGE_MODEL` judges answers. Both default to `claude-opus-5-5`.
- `THEME` overrides the prompt theme.
- `REQUIRE_REVIEW` holds generated puzzles as drafts when set to `"true"`.
- `LAUNCH_DATE` is day #1 for puzzle numbering.

Requests use `fallbacks: "default"`, so if a safety classifier declines a request, it is retried on Anthropic's
recommended fallback model.

**Cost.** Each day is about 8 Claude calls (1 for prompts, 7 for answer sheets), mostly output tokens, plus one
short judge call per unique off-sheet answer. Judge verdicts are cached, so repeated answers are free. KV's free plan
allows 1,000 writes a day. Each new judge verdict is one write, so a busy game will need the Workers Paid plan.

## Files

- `src/worker.js`: API routes, KV storage, daily cron, admin endpoints
- `src/llm.js`: Claude calls (prompt writer, answer-sheet builder, judge) with structured JSON output
- `public/`: the game (`index.html`, `app.js`, `style.css`)
- `public/shared/game-core.js`: tiers, answer matching and altitude zones, shared by the Worker and the browser
- `public/shared/seed-bank.js`: hand-written fallback prompts
