import { test } from "node:test";
import assert from "node:assert/strict";
import { matchAnswer, seedPuzzle, MAX_SCORE, PROMPTS_PER_DAY } from "../public/shared/game-core.js";

test("seed Daily Dive: 7 unique prompts with id, prompt, category, strict_criteria", () => {
  const a = seedPuzzle("2026-11-07"), b = seedPuzzle("2026-11-07");
  assert.equal(a.prompts.length, PROMPTS_PER_DAY);
  assert.equal(MAX_SCORE, 700);
  assert.deepEqual(a.prompts.map((p) => p.id), b.prompts.map((p) => p.id));
  assert.equal(new Set(a.prompts.map((p) => p.prompt)).size, PROMPTS_PER_DAY);
  for (const p of a.prompts) {
    assert.match(p.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
    for (const k of ["prompt", "category", "strict_criteria"]) assert.ok(p[k]?.length > 1, k);
  }
});

test("offline validator matches aliases and small typos", () => {
  const item = { answers: [{ answer: "Neil Armstrong", aliases: ["armstrong"] }, { answer: "Io", aliases: [] }] };
  assert.ok(matchAnswer(item, "armstrong"));
  assert.ok(matchAnswer(item, "neil armstrng"));
  assert.ok(matchAnswer(item, "io"));
  assert.equal(matchAnswer(item, "ia"), null);
});
