import test from "node:test";
import assert from "node:assert/strict";
import { pickVisemeAtTime } from "./viseme.js";

test("pickVisemeAtTime returns active mouth cue by current time", () => {
  const cues = [
    { start: 0, end: 0.2, value: "A" },
    { start: 0.2, end: 0.4, value: "C" },
  ];
  assert.equal(pickVisemeAtTime(cues, 0.25), "C");
});

test("pickVisemeAtTime returns X when no cue matches (silence / paused)", () => {
  assert.equal(pickVisemeAtTime([], 1.2), "X");
});

test("pickVisemeAtTime returns X when time is past all cues", () => {
  const cues = [{ start: 0, end: 0.5, value: "B" }];
  assert.equal(pickVisemeAtTime(cues, 1.0), "X");
});

test("pickVisemeAtTime returns correct cue at exact start boundary", () => {
  const cues = [{ start: 0.5, end: 1.0, value: "D" }];
  assert.equal(pickVisemeAtTime(cues, 0.5), "D");
});

test("pickVisemeAtTime returns X at exact end boundary (end is exclusive)", () => {
  const cues = [{ start: 0.5, end: 1.0, value: "D" }];
  assert.equal(pickVisemeAtTime(cues, 1.0), "X");
});
