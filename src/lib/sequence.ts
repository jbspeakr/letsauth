import type { Actor } from "../schema";
import type { ResolvedStep } from "./explorer";

export const LANE_W = 168;
export const ROW_H = 52;
export const HEAD_H = 56;
export const PAD = 16;
export const SELF_W = 36;

export interface Lane {
  actor: Actor;
  x: number;
}

export interface Row {
  step: ResolvedStep;
  y: number;
  x1: number;
  x2: number;
  self: boolean;
  toggled: boolean;
  removed: boolean;
}

export interface SequenceLayout {
  width: number;
  height: number;
  lanes: Lane[];
  rows: Row[];
}

/** Lanes in the scenario's actor order, one row per resolved step (research R3). */
export function layoutSequence(actors: Actor[], steps: ResolvedStep[]): SequenceLayout {
  const lanes = actors.map((actor, i) => ({ actor, x: PAD + LANE_W / 2 + i * LANE_W }));
  const xOf = new Map(lanes.map((l) => [l.actor.id, l.x]));
  const rows = steps.map((step, i) => {
    const x1 = xOf.get(step.from) ?? 0;
    const x2 = xOf.get(step.to) ?? 0;
    return {
      step,
      y: HEAD_H + PAD + i * ROW_H + ROW_H / 2,
      x1,
      x2,
      self: step.from === step.to,
      toggled: step.toggled,
      removed: step.removed,
    };
  });
  return {
    width: PAD * 2 + actors.length * LANE_W,
    height: HEAD_H + PAD * 2 + steps.length * ROW_H,
    lanes,
    rows,
  };
}
