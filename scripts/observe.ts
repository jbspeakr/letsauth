/**
 * Record a manual or documentation observation (docs/atlas-maintenance.md › Record an observation).
 *
 *   pnpm observe <server-id> <feature-id> <status> --by <handle> --evidence <url or note>
 *                [--method manual|vendor-claim] [--revision <id>] [--at <ISO 8601 UTC>]
 *
 * Validates the entry against the schema and the dataset (the server, the feature, the revision
 * the feature cites), then appends it to data/observations/<server-id>.yaml. Nothing is edited.
 * `passive-scan` and `active-scan` are the scanner's methods and cannot be written here.
 * Exit 0 on success, 1 on a validation problem (nothing written).
 */

import { join, resolve } from "node:path";
import { currentRevision } from "../src/lib/atlas";
import { crossCheck, loadDataset } from "../src/lib/data";
import { appendObservations } from "../src/scanner/observations";
import { stamp } from "../src/scanner/report";
import { type Observation, observationSchema, observationStatus } from "../src/schema";

interface Args {
  server: string;
  feature: string;
  status: string;
  by?: string;
  evidence?: string;
  method: "manual" | "vendor-claim";
  revision?: string;
  at?: string;
}

const USAGE =
  "usage: pnpm observe <server-id> <feature-id> <status> --by <handle> --evidence <url or note> [--method manual|vendor-claim] [--revision <id>] [--at <ISO 8601 UTC>]";

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  const args: Partial<Args> & { method: Args["method"] } = { method: "manual" };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] as string;
    if (a === "--by") args.by = argv[++i];
    else if (a === "--evidence") args.evidence = argv[++i];
    else if (a === "--revision") args.revision = argv[++i];
    else if (a === "--at") args.at = argv[++i];
    else if (a === "--method") {
      const m = argv[++i];
      if (m !== "manual" && m !== "vendor-claim") {
        throw new Error(`--method must be manual or vendor-claim (the scanner writes the others)`);
      }
      args.method = m;
    } else if (a.startsWith("--")) throw new Error(`unknown flag ${a}\n${USAGE}`);
    else positional.push(a);
  }
  const [server, feature, status] = positional;
  if (!server || !feature || !status || !args.by || !args.evidence) throw new Error(USAGE);
  return { ...args, server, feature, status };
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  const root = resolve("data");
  const { data, issues } = loadDataset(root);
  if (issues.length > 0) {
    console.error("the dataset does not validate; fix it before adding to it:");
    for (const issue of issues) console.error(`  ${issue.path}: ${issue.message}`);
    return 1;
  }

  const server = data.servers.find((s) => s.id === args.server);
  if (!server) throw new Error(`unknown server "${args.server}" (data/servers/<id>.yaml)`);
  const feature = data.features.find((f) => f.id === args.feature);
  if (!feature) throw new Error(`unknown feature "${args.feature}" (data/features/<id>.yaml)`);
  const status = observationStatus.safeParse(args.status);
  if (!status.success) {
    throw new Error(`status must be one of ${observationStatus.options.join(", ")}`);
  }
  const revisionId = args.revision ?? currentRevision(data).id;
  const cited = feature.revisions.find((r) => r.revision === revisionId);
  if (!cited) {
    throw new Error(
      `feature "${feature.id}" does not cite revision "${revisionId}" (it cites ${feature.revisions.map((r) => r.revision).join(", ")})`,
    );
  }

  const entry: Observation = observationSchema.parse({
    server: server.id,
    feature: feature.id,
    revision: { spec: cited.spec, revision: cited.revision },
    status: status.data,
    method: args.method,
    observedAt: args.at ?? stamp(),
    observedBy: args.by,
    evidence: args.evidence,
  });

  const problems = crossCheck({ ...data, observations: [...data.observations, entry] });
  if (problems.length > 0) {
    console.error("the entry would not validate; nothing written:");
    for (const issue of problems) console.error(`  ${issue.path}: ${issue.message}`);
    return 1;
  }

  const file = join(root, "observations", `${server.id}.yaml`);
  appendObservations(file, [entry]);
  console.log(`appended to data/observations/${server.id}.yaml:`);
  console.log(
    `  ${entry.feature} ${entry.status} (${entry.method}, ${entry.observedBy}, ${entry.observedAt})`,
  );
  console.log(`  ${entry.evidence}`);
  console.log("next: pnpm validate:data, then open a pull request");
  return 0;
}

try {
  process.exit(main());
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
