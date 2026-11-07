# Cosmillion

A daily rare-answer space trivia game. Everyone gets the same 7 prompts per day and has 25 seconds to type one
answer to each. **The fewer players who would give your answer, the more points you get**, and your points fly
your rocket from the launchpad toward interstellar space.

Runs on **Cloudflare Workers** (static assets + KV + Cron Triggers). **Claude** writes the daily prompts and
validates answers, and a **word-frequency corpus** scores how rare each answer is.

## How it works

### 1. Question generation: the Daily Dive

A daily cron (00:05 UTC) asks Claude Opus for the next two days' dives: exactly 7 unique prompts, each stored in KV as

```json
{
  "id": "uuid",
  "prompt": "Name a fabric or textile",
  "category": "Textiles",
  "strict_criteria": "The answer must be a raw material, weave, or fabric type recognized in linguistic text corpora. Do not accept brand names unless requested."
}
```

Prompts are open-ended but deterministic: every answer is objectively right or wrong. Players never see
`strict_criteria`; it is only for the validator.

### 2. Validation engine (synchronous, per guess)

- **A. Sanitize:** trim whitespace and lowercase.
- **B. Validate with an LLM:** the answer, the prompt and `strict_criteria` go to Claude Haiku, a fast,
  low-cost model acting as a strict binary evaluator. It returns `{ "valid": true }` or
  `{ "valid": false, "reason": "..." }`. Misspellings count as invalid; otherwise a typo would look
  "rare" to the frequency scorer.
- **C. Acceptance loop:** an invalid answer returns at once with `retry: true`, so the player can guess again
  before the 25-second clock runs out. A valid answer goes on to scoring.

Verdicts are cached per prompt and answer, so the same guess always gets the same result.

### 3. Grading: Zipf-law mechanical scoring

No live player counts are used. Each valid answer gets a frequency rating from the
[wordfreq](https://github.com/rspeer/wordfreq) English list: 321,180 words, built from Wikipedia, subtitles,
Google Books, news and web text.

- **Zipf value:** log10 of occurrences per billion words. For example, "the" is 7.7, "France" 4.9, "sackbut" 1.4.
- **Multi-word answers** combine as `1/f = Σ 1/f_i`, so a phrase is never more common than its rarest word.
- **Rank percentile:** the Zipf value converts to a rank percentile across the vocabulary (0 = most common).
  The percentile picks a tier, and points scale linearly within the tier's band:

| Tier | Rank percentile | Points | Badge |
|---|---|---|---|
| Stardust | most common 5% | 4–10 | "Stardust Choice!" |
| Too Clever | 5–15% | 11–20 | "Crowd Trap!" |
| Orbiter | 15–40% | 21–40 | "Orbiter Tier" |
| Rare | 40–75% | 41–65 | "Rare Find!" |
| Deep Space | 75–95% | 66–85 | "Deep Space!" |
| One in a Cosmillion | rarest 5%, or not in the corpus | 86–100 | "ONE IN A COSMILLION!" |

Examples: France 4 pts, Bhutan 14, Burkina Faso 17, Kerberos 29, sousaphone 45, sackbut 55, ophicleide 100.
The tier table lives in `public/shared/zipf.js` (`RARITY_TIERS`).

The frequency list ships as about 1,260 small static files in `public/freq/`, split by each word's first two
letters. The Worker loads only the files an answer needs, so lookups are cheap and there's no database. To
rebuild the files from wordfreq, run `pip install wordfreq msgpack` and then `python3 scripts/build-freq.py`.

### Fallbacks

- **No `ANTHROPIC_API_KEY`:** the game serves built-in dives (`public/shared/seed-bank.js`) and validates against
  their answer lists.
- **No API at all** (plain static hosting): the browser does the same and scores with the same frequency files.

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
| `POST` | `/api/admin/generate?date=YYYY-MM-DD[&force=true]` | Generate a Daily Dive with Claude |
| `GET` | `/api/admin/dive?date=YYYY-MM-DD` | Full dive, including `strict_criteria`, for review |
| `PUT` | `/api/admin/dive?date=YYYY-MM-DD` | Replace a dive (7 unique prompts; a missing `id` is assigned automatically) |
| `POST` | `/api/admin/publish?date=YYYY-MM-DD` | Publish a draft |

## Public API

| Method | Path | Returns |
|---|---|---|
| `GET` | `/api/daily?date=YYYY-MM-DD` | `{date, number, tiers, prompts: [{index, id, prompt, category}]}` |
| `POST` | `/api/answer` `{date, index, answer}` | Invalid: `{valid: false, reason, retry: true}`. Valid: `{valid: true, answer, tier, tierName, label, points, zipf, percentile, inVocabulary, tokens}` |

## Configuration (`wrangler.jsonc` → `vars`)

- `GENERATOR_MODEL` writes the daily prompts. Default `claude-opus-5-5`.
- `VALIDATOR_MODEL` checks every guess. Default `claude-haiku-5-5`.
- `THEME` overrides the prompt theme. The default is space.
- `REQUIRE_REVIEW` holds generated dives as drafts until published, when set to `"true"`.
- `LAUNCH_DATE` is day #1 for numbering.

**Cost:** one Opus call per day for prompts, plus one short Haiku call per unique guess. Repeated guesses come
from the KV cache. KV's free plan allows 1,000 writes a day, and each new verdict is one write, so a busy game
needs the Workers Paid plan.

## Files

- `src/worker.js`: API routes, Daily Dive storage, the validate → score pipeline, cron and admin
- `src/llm.js`: Claude calls (Daily Dive generator, binary validator) with structured JSON output
- `public/shared/zipf.js`: sanitization, tokenizing, Zipf rating, percentile → tier and points
- `public/shared/game-core.js`: dive constants, built-in dives, offline validator, altitude zones
- `public/freq/`: word-frequency data (CC-BY-SA 4.0, see `public/freq/NOTICE.txt`)
- `scripts/build-freq.py`: rebuilds `public/freq/` from wordfreq
- `public/`: the game (`index.html`, `app.js`, `style.css`)
