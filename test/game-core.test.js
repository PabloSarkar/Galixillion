import { test } from "node:test";
import assert from "node:assert/strict";
import { tierFor, matchAnswer, seedPuzzle, TIERS, MAX_SCORE, PROMPTS_PER_DAY } from "../public/shared/game-core.js";

test("tiers map share to points", () => {
  assert.equal(tierFor({ share: 30 }), 1);
  assert.equal(tierFor({ share: 3, too_clever: true }), 2);
  assert.equal(tierFor({ share: 3 }), 3);
  assert.equal(tierFor({ share: 0.5 }), 4);
  assert.equal(tierFor({ share: 0.05 }), 5);
  assert.equal(tierFor({ share: 0.05, gem: true }), 6);
  assert.equal(MAX_SCORE, 700);
  assert.deepEqual(TIERS.slice(1).map((t) => t.points), [10, 15, 30, 60, 85, 100]);
});

const sheet = { answers: [
  { answer: "Neil Armstrong", aliases: ["armstrong"], tier: 1 },
  { answer: "Valentina Tereshkova", aliases: ["tereshkova"], tier: 4 },
  { answer: "Io", aliases: [], tier: 3 },
] };

test("matches aliases, case, punctuation and small typos", () => {
  assert.equal(matchAnswer(sheet, "ARMSTRONG!")?.answer, "Neil Armstrong");
  assert.equal(matchAnswer(sheet, "valentina tereshkva")?.answer, "Valentina Tereshkova");
  assert.equal(matchAnswer(sheet, "the io")?.answer, "Io");
  assert.equal(matchAnswer(sheet, "Ia"), null); // no typo tolerance on short answers
  assert.equal(matchAnswer(sheet, "Buzz Aldrin"), null);
});

test("seed puzzle is deterministic per date", () => {
  const a = seedPuzzle("2026-11-07"), b = seedPuzzle("2026-11-07");
  assert.equal(a.prompts.length, PROMPTS_PER_DAY);
  assert.deepEqual(a.prompts.map((p) => p.text), b.prompts.map((p) => p.text));
  for (const p of a.prompts) assert.equal(p.answers.filter((x) => x.tier === 6).length, 1);
});
