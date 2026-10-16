import type { ObservationStatus } from "../schema";
import type { Probe } from "./probe";

/**
 * Composable judgement (010). A check is an ordered list of strategies. Each strategy looks at one
 * source the probe discovered (a metadata document, the endpoint's challenge, the authorization
 * server's metadata) and either decides the cell or passes (`undefined`). `firstOf` runs them in
 * order and takes the first decision; the last strategy of every list is a fallback that always
 * decides, so a check can never end without an outcome. The strategy that decided is named in
 * the report (`via`), so a reader can see which source a status rests on.
 *
 * Adding a way to judge a requirement is adding a strategy to its list in `checks.ts`; the probe
 * (`probe.ts`) owns how each source is discovered, in `discovery.ts`'s order.
 */

export interface CheckOutcome {
  status: ObservationStatus;
  evidence: string;
  /** The id of the strategy that decided; set by `firstOf`. */
  via?: string;
}

export interface Strategy {
  /** Short, stable, for the report: `prm.scopes`, `challenge.scope`, `as.scopes`… */
  id: string;
  /** One line for the documentation and the report's tooltip. */
  title: string;
  /** A decision, or `undefined` to pass to the next strategy. */
  judge: (probe: Probe) => CheckOutcome | undefined;
}

export type Check = (probe: Probe) => CheckOutcome;

export function strategy(
  id: string,
  title: string,
  judge: (probe: Probe) => CheckOutcome | undefined,
): Strategy {
  return { id, title, judge };
}

/** The first strategy that decides, in order. Throws when none does: every list ends in a fallback. */
export function firstOf(strategies: readonly Strategy[]): Check {
  if (strategies.length === 0) throw new Error("a check needs at least one strategy");
  return (probe) => {
    for (const s of strategies) {
      const outcome = s.judge(probe);
      if (outcome) return { ...outcome, via: s.id };
    }
    throw new Error(
      `no strategy decided (${strategies.map((s) => s.id).join(" → ")}); the last one must always decide`,
    );
  };
}
