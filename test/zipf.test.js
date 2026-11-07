import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sanitize, tokenize, gradePercentile, createFrequencyIndex, scoreAnswer, RARITY_TIERS, shardOf } from "../public/shared/zipf.js";

const index = createFrequencyIndex(async (path) => {
  try { return readFileSync(new URL(`../public/freq/${path}`, import.meta.url), "utf8"); } catch { return null; }
});

test("step A sanitization trims and lowercases", () => {
  assert.equal(sanitize("  Burkina FASO \n"), "burkina faso");
  assert.deepEqual(tokenize("Barnard’s Star"), ["barnard's", "star"]);
  assert.deepEqual(tokenize("Apollo 11"), ["apollo", "00"]);
  assert.equal(shardOf("é"), "__");
});

test("tier bands and 4–100 linear points", () => {
  const cases = [
    [0, 1, 4], [5, 1, 10], [5.01, 2, 11], [15, 2, 20], [15.01, 3, 21], [40, 3, 40],
    [57.5, 4, 53], [75, 4, 65], [85, 5, 76], [95, 5, 85], [97.5, 6, 93], [100, 6, 100],
  ];
  for (const [p, tier, points] of cases) assert.deepEqual([gradePercentile(p).tier, gradePercentile(p).points], [tier, points], `p=${p}`);
  assert.deepEqual(RARITY_TIERS.map((t) => [t.min, t.max]), [[4, 10], [11, 20], [21, 40], [41, 65], [66, 85], [86, 100]]);
});

test("common words score low, obscure words high", async () => {
  const s = async (a) => scoreAnswer(index, a);
  assert.equal((await s("France")).tier, 1);
  assert.equal((await s("Bhutan")).tier, 2);
  assert.equal((await s("Kerberos")).tier, 3);
  assert.equal((await s("sackbut")).tier, 4);
  const oov = await s("ophicleide");
  assert.equal(oov.inVocabulary, false);
  assert.equal(oov.points, 100);
  assert.ok((await s("France")).zipf > (await s("Bhutan")).zipf);
});

test("phrases are never more common than their rarest word", async () => {
  const phrase = await index.rate("burkina faso");
  const faso = await index.rate("faso");
  assert.ok(phrase.zipf <= faso.zipf);
});
