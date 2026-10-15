import { describe, expect, it } from "vitest";
import type { ResolvedStep } from "@/lib/explorer";
import { HEAD_H, LANE_W, layoutSequence, PAD, ROW_H } from "@/lib/sequence";
import type { Actor } from "@/schema";

const actors: Actor[] = [
  { id: "a", kind: "user", name: "A" },
  { id: "b", kind: "agent", name: "B" },
  { id: "c", kind: "resource", name: "C" },
];
const cite = { spec: "x", revision: "y", section: "z" };
const step = (
  id: string,
  from: string,
  to: string,
  extra: Partial<ResolvedStep> = {},
): ResolvedStep => ({
  id,
  from,
  to,
  message: id,
  cites: cite,
  index: 0,
  toggled: false,
  removed: false,
  ...extra,
});

describe("layoutSequence (research R3)", () => {
  const layout = layoutSequence(actors, [
    step("one", "a", "c"),
    step("two", "c", "b", { toggled: true }),
    step("three", "b", "b", { toggled: true, removed: true }),
  ]);

  it("lays one lane per actor in order and one row per step", () => {
    expect(layout.lanes.map((l) => l.actor.id)).toEqual(["a", "b", "c"]);
    expect(layout.lanes[1]?.x).toBe(PAD + LANE_W / 2 + LANE_W);
    expect(layout.rows).toHaveLength(3);
    expect(layout.rows.map((r) => r.step.id)).toEqual(["one", "two", "three"]);
  });

  it("points rows at the sender's and receiver's lanes, self when they coincide", () => {
    expect(layout.rows[0]).toMatchObject({
      x1: layout.lanes[0]?.x,
      x2: layout.lanes[2]?.x,
      self: false,
    });
    expect(layout.rows[2]).toMatchObject({
      x1: layout.lanes[1]?.x,
      x2: layout.lanes[1]?.x,
      self: true,
    });
    expect(layout.rows[1]?.toggled).toBe(true);
    expect(layout.rows[2]?.removed).toBe(true);
  });

  it("grows with rows and lanes", () => {
    expect(layout.width).toBe(PAD * 2 + 3 * LANE_W);
    expect(layout.height).toBe(HEAD_H + PAD * 2 + 3 * ROW_H);
    expect((layout.rows[1]?.y ?? 0) - (layout.rows[0]?.y ?? 0)).toBe(ROW_H);
  });
});
