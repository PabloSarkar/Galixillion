// Mechanical rarity scoring from corpus word frequency (Zipf scale).
//
// Zipf value = log10(occurrences per billion words). "the" ≈ 7.7, "France" ≈ 4.9, "sackbut" ≈ 1.4.
// Every word in the vocabulary has a rank percentile (0 = most common, 100 = rarest).
// The percentile picks one of six tiers, and points scale linearly inside the tier's band.
// Data: wordfreq's English list (CC-BY-SA 4.0), re-sharded by scripts/build-freq.py.

/** Six depth tiers. `from`/`to` are rank-percentile bands; `min`/`max` the point range. */
export const RARITY_TIERS = [
  { id: 1, name: "Stardust",            label: "Stardust Choice!",     from: 0,  to: 5,   min: 4,  max: 10,  band: "Most common 5% of words" },
  { id: 2, name: "Too Clever",          label: "Crowd Trap!",          from: 5,  to: 15,  min: 11, max: 20,  band: "Top 5–15%" },
  { id: 3, name: "Orbiter",             label: "Orbiter Tier",         from: 15, to: 40,  min: 21, max: 40,  band: "15–40% rank" },
  { id: 4, name: "Rare",                label: "Rare Find!",           from: 40, to: 75,  min: 41, max: 65,  band: "40–75% rank" },
  { id: 5, name: "Deep Space",          label: "Deep Space!",          from: 75, to: 95,  min: 66, max: 85,  band: "75–95% rank" },
  { id: 6, name: "One in a Cosmillion", label: "ONE IN A COSMILLION!", from: 95, to: 100, min: 86, max: 100, band: "Rarest 5%, or not in the corpus at all" },
];

/** Step A of validation: trim whitespace and lowercase. */
export function sanitize(input) {
  return String(input ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().toLowerCase();
}

/** Split an answer into corpus tokens the way the frequency list is keyed. */
export function tokenize(text) {
  return sanitize(text)
    .normalize("NFC")
    .replace(/[’‘`]/g, "'")
    .replace(/\d/g, "0") // the corpus stores digit sequences with every digit replaced by 0
    .split(/[^\p{L}\p{N}']+/u)
    .map((t) => t.replace(/^'+|'+$/g, ""))
    .filter(Boolean);
}

/** Shard file a token lives in. Must match shard_of() in scripts/build-freq.py. */
export function shardOf(token) {
  return [...(token + "__").slice(0, 2)].map((c) => (/[a-z0-9]/.test(c) ? c : "_")).join("");
}

function parseShard(text) {
  const map = new Map();
  for (const line of text.split("\n")) {
    if (!line) continue;
    const parts = line.split(" ");
    const bucket = Number(parts[0]);
    for (let i = 1; i < parts.length; i++) map.set(parts[i], bucket);
  }
  return map;
}

/**
 * Frequency index over the sharded word list.
 * @param {(path: string) => Promise<string|null>} loadText  fetches "index.json" or "<shard>.txt"; null if missing
 */
export function createFrequencyIndex(loadText) {
  const shards = new Map();
  let percentileTable = null;

  async function table() {
    if (!percentileTable) percentileTable = JSON.parse(await loadText("index.json")).percentile;
    return percentileTable;
  }

  async function bucketOf(token) {
    const name = shardOf(token);
    if (!shards.has(name)) {
      const text = await loadText(`${name}.txt`);
      shards.set(name, text ? parseShard(text) : new Map());
    }
    return shards.get(name).get(token);
  }

  /** Rank percentile (0 = most common) for a Zipf value, interpolated between corpus buckets. */
  async function percentileFor(zipf) {
    const t = await table();
    const pos = (9 - zipf) * 100; // bucket index, fractional
    if (pos <= 0) return t[0];
    if (pos >= t.length - 1) {
      // Rarer than the rarest listed bucket: interpolate toward 100.
      const last = t[t.length - 1];
      return Math.min(100, last + (100 - last) * Math.min(1, (pos - (t.length - 1)) / 100));
    }
    const lo = Math.floor(pos), frac = pos - lo;
    return t[lo] + (t[lo + 1] - t[lo]) * frac;
  }

  return {
    /**
     * Frequency rating for an answer. Multi-word answers combine their words the way wordfreq does:
     * 1/f = Σ 1/f_i, so the phrase is never more common than its rarest word.
     */
    async rate(answer) {
      const tokens = tokenize(answer);
      if (!tokens.length) return { zipf: 0, percentile: 100, inVocabulary: false, tokens: [] };
      const rated = [];
      let inverse = 0;
      let missing = false;
      for (const token of tokens) {
        const bucket = await bucketOf(token);
        if (bucket === undefined) { missing = true; rated.push({ token, zipf: null }); continue; }
        const zipf = 9 - bucket / 100;
        rated.push({ token, zipf: +zipf.toFixed(2) });
        inverse += 1 / Math.pow(10, zipf - 9);
      }
      if (missing) return { zipf: 0, percentile: 100, inVocabulary: false, tokens: rated };
      const zipf = Math.log10(1 / inverse) + 9;
      return { zipf: +zipf.toFixed(2), percentile: +(await percentileFor(zipf)).toFixed(2), inVocabulary: true, tokens: rated };
    },
  };
}

/** Map a rank percentile to its tier and to points, linear within the tier's band. */
export function gradePercentile(percentile) {
  const p = Math.max(0, Math.min(100, percentile));
  const tier = RARITY_TIERS.find((t) => p <= t.to) || RARITY_TIERS[RARITY_TIERS.length - 1];
  const t = (p - tier.from) / (tier.to - tier.from);
  const points = Math.round(tier.min + (tier.max - tier.min) * Math.max(0, Math.min(1, t)));
  return { tier: tier.id, tierName: tier.name, label: tier.label, points };
}

/** Full scoring pipeline: frequency rating → percentile → tier badge and 4–100 points. */
export async function scoreAnswer(index, answer) {
  const rating = await index.rate(answer);
  return { ...gradePercentile(rating.percentile), ...rating };
}
