import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { stringify } from "yaml";
import { currentCell } from "../lib/atlas";
import type { Dataset } from "../lib/data";
import type { Observation } from "../schema";
import type { Report } from "./report";
import { OBSERVER } from "./version";

/**
 * The append rule (data-model.md): an observation is appended when the cell has none, when the
 * current one was not written by this scanner version, or when status or evidence differ.
 * Nothing is ever edited or removed; the file is only ever extended at its end.
 */

/** The observations of a report that the append rule says to write. */
export function toAppend(report: Report, data: Dataset): Observation[] {
  const serverId = report.target.server;
  if (!serverId) return [];
  const server = data.servers.find((s) => s.id === serverId);
  if (!server) throw new Error(`server "${serverId}" not found`);
  const out: Observation[] = [];
  for (const obs of report.observations) {
    const feature = data.features.find((f) => f.id === obs.feature);
    if (!feature) throw new Error(`feature "${obs.feature}" not found`);
    const cell = currentCell(data, server, feature, obs.revision.revision, obs.revision.spec);
    const current = cell.observation;
    if (
      !current ||
      current.observedBy !== OBSERVER ||
      current.status !== obs.status ||
      current.evidence !== obs.evidence
    ) {
      out.push(obs);
    }
  }
  return out;
}

/** Appends entries to a `data/observations/<server>.yaml` list; creates the file when missing. */
export function appendObservations(filePath: string, entries: Observation[]): void {
  if (entries.length === 0) return;
  const existing = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const text = stringify(entries, { lineWidth: 0 });
  const prefix = existing === "" || existing.endsWith("\n") ? existing : `${existing}\n`;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${prefix}${text}`);
}

export interface RunResult {
  server: { id: string; name: string; url: string };
  report?: Report;
  appended: Observation[];
  /** Set when the scan threw or was refused; the server is reported, not skipped silently. */
  error?: string;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** The pull request description for one run. */
export function summarise(results: RunResult[], startedAt: string, revisionId: string): string {
  const appended = results.reduce((n, r) => n + r.appended.length, 0);
  const lines: string[] = [];
  lines.push(
    `Passive scan of ${plural(results.length, "listed server")} against MCP Authorization ${revisionId}, started ${startedAt}.`,
  );
  lines.push("");
  lines.push(
    `${plural(appended, "observation")} appended by \`${OBSERVER}\`. Only public metadata was read: the well-known documents, and the challenge the endpoint returns to an unauthenticated request without a JSON-RPC message (a GET, then an empty POST when the GET was routed elsewhere; status and headers only, no body read); every evidence field starts with the URL that decided the status. Cells that could not be judged are recorded as \`unknown\`, never as \`unsupported\`. A note names a listed URL that looks stale; fix the server file, not the observations.`,
  );
  lines.push("");
  lines.push("| Server | Grade | Appended | Could not judge | Notes |");
  lines.push("|---|---|---|---|---|");
  for (const r of results) {
    const unknown = r.report ? r.report.checks.filter((c) => c.status === "unknown").length : 0;
    const gradeText = r.report ? r.report.grade.label : "–";
    const changed = r.appended.map((o) => `\`${o.feature}\` ${o.status}`).join(", ");
    const note = r.error ? `error: ${r.error}` : (r.report?.discovered?.endpointNote ?? "");
    lines.push(
      `| ${r.server.name} (\`${r.server.id}\`) | ${gradeText} | ${r.appended.length}${changed ? `: ${changed}` : ""} | ${unknown} | ${note} |`,
    );
  }
  lines.push("");
  lines.push("Review: open each evidence URL; see `docs/scanner.md` for what each status means.");
  return `${lines.join("\n")}\n`;
}
