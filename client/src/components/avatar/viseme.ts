/**
 * Viseme mapping utilities for the AvatarNarrator component.
 *
 * Rhubarb outputs one of the following mouth shapes (visemes):
 *   A  –  MBP (closed lips)
 *   B  –  EE / small mouth
 *   C  –  E
 *   D  –  AI
 *   E  –  O
 *   F  –  WQ
 *   G  –  FV
 *   H  –  L
 *   X  –  rest / silence (also used as fallback)
 */

export type MouthCue = { start: number; end: number; value: string };

/**
 * Return the viseme value active at time `t`.
 * `t` must be >= cue.start and < cue.end (end boundary is exclusive).
 * Returns "X" (rest) if no cue spans the current time.
 */
export function pickVisemeAtTime(cues: MouthCue[], t: number): string {
  const cue = cues.find((c) => t >= c.start && t < c.end);
  return cue?.value ?? "X";
}
