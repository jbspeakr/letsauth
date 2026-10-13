import { readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parse } from "yaml";
import { type ZodType, z } from "zod";
import {
  type Feature,
  featureSchema,
  type Observation,
  observationSchema,
  type Server,
  type Spec,
  serverSchema,
  specSchema,
} from "../schema";

export interface Dataset {
  specs: Spec[];
  features: Feature[];
  servers: Server[];
  observations: Observation[];
  /** Where each loaded observation came from (`data/observations/<id>.yaml[i]`), for messages. */
  locations?: WeakMap<Observation, string>;
}

export interface DataIssue {
  /** `data/observations/stripe.yaml[3].evidence` style location. */
  path: string;
  message: string;
}

export const DATA_ROOT = resolve(process.cwd(), "data");

function listYaml(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
      .sort()
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

function relPath(file: string, root: string): string {
  return `data/${file.slice(root.length + 1)}`;
}

function formatPath(file: string, root: string, issuePath: PropertyKey[]): string {
  let out = relPath(file, root);
  for (const seg of issuePath) {
    out += typeof seg === "number" ? `[${seg}]` : `.${String(seg)}`;
  }
  return out;
}

function loadFile<T>(
  file: string,
  root: string,
  schema: ZodType<T>,
  issues: DataIssue[],
): T | undefined {
  let raw: unknown;
  try {
    raw = parse(readFileSync(file, "utf8"));
  } catch (err) {
    issues.push({ path: relPath(file, root), message: `invalid YAML: ${(err as Error).message}` });
    return undefined;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({ path: formatPath(file, root, issue.path), message: issue.message });
    }
    return undefined;
  }
  return result.data;
}

/**
 * Loads and validates everything under `data/`. Schema errors are collected, not thrown, so a
 * validator can print all of them at once. Cross-reference checks are in `crossCheck`.
 */
export function loadDataset(root = DATA_ROOT): { data: Dataset; issues: DataIssue[] } {
  const issues: DataIssue[] = [];
  const locations = new WeakMap<Observation, string>();
  const specs: Spec[] = [];
  const features: Feature[] = [];
  const servers: Server[] = [];
  const observations: Observation[] = [];

  for (const f of listYaml(join(root, "specs"))) {
    const spec = loadFile(f, root, specSchema, issues);
    if (spec) specs.push(spec);
  }
  for (const f of listYaml(join(root, "features"))) {
    const feature = loadFile(f, root, featureSchema, issues);
    if (feature) features.push(feature);
  }
  for (const f of listYaml(join(root, "servers"))) {
    const server = loadFile(f, root, serverSchema, issues);
    if (server) servers.push(server);
  }
  for (const f of listYaml(join(root, "observations"))) {
    // entries are validated one by one so a bad entry does not hide the others from crossCheck
    const list = loadFile(f, root, z.array(z.unknown()), issues);
    if (!list) continue;
    const fileServer = basename(f).replace(/\.ya?ml$/, "");
    for (const [i, raw] of list.entries()) {
      const parsed = observationSchema.safeParse(raw);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          issues.push({ path: formatPath(f, root, [i, ...issue.path]), message: issue.message });
        }
        continue;
      }
      const obs = parsed.data;
      if (obs.server !== fileServer) {
        issues.push({
          path: formatPath(f, root, [i, "server"]),
          message: `must equal the file's server id "${fileServer}", got "${obs.server}"`,
        });
        continue;
      }
      locations.set(obs, formatPath(f, root, [i]));
      observations.push(obs);
    }
  }
  return { data: { specs, features, servers, observations, locations }, issues };
}

/** Cross-reference checks from the data model that a per-file schema cannot express. */
export function crossCheck(data: Dataset): DataIssue[] {
  const issues: DataIssue[] = [];
  const revisionKeys = new Set<string>();
  for (const spec of data.specs) {
    for (const rev of spec.revisions) revisionKeys.add(`${spec.id}@${rev.id}`);
  }
  const featureById = new Map(data.features.map((f) => [f.id, f]));
  const serverIds = new Set(data.servers.map((s) => s.id));

  for (const feature of data.features) {
    for (const [i, rev] of feature.revisions.entries()) {
      if (!revisionKeys.has(`${rev.spec}@${rev.revision}`)) {
        issues.push({
          path: `data/features/${feature.id}.yaml.revisions[${i}]`,
          message: `revision "${rev.revision}" of spec "${rev.spec}" does not exist in data/specs`,
        });
      }
    }
    if (feature.supersedes && !featureById.has(feature.supersedes)) {
      issues.push({
        path: `data/features/${feature.id}.yaml.supersedes`,
        message: `feature "${feature.supersedes}" does not exist`,
      });
    }
  }

  const perFile = new Map<string, number>();
  for (const obs of data.observations) {
    const index = perFile.get(obs.server) ?? 0;
    perFile.set(obs.server, index + 1);
    const at = data.locations?.get(obs) ?? `data/observations/${obs.server}.yaml[${index}]`;
    if (!serverIds.has(obs.server)) {
      issues.push({ path: `${at}.server`, message: `server "${obs.server}" does not exist` });
    }
    const feature = featureById.get(obs.feature);
    if (!feature) {
      issues.push({ path: `${at}.feature`, message: `feature "${obs.feature}" does not exist` });
      continue;
    }
    if (feature.party === "client") {
      issues.push({
        path: `${at}.feature`,
        message: `feature "${obs.feature}" is a client-party feature and cannot be observed on a server`,
      });
    }
    const revKey = `${obs.revision.spec}@${obs.revision.revision}`;
    if (!revisionKeys.has(revKey)) {
      issues.push({ path: `${at}.revision`, message: `revision "${revKey}" does not exist` });
    } else if (
      !feature.revisions.some(
        (r) => r.spec === obs.revision.spec && r.revision === obs.revision.revision,
      )
    ) {
      issues.push({
        path: `${at}.revision`,
        message: `feature "${obs.feature}" is not defined in revision "${revKey}"`,
      });
    }
  }
  return issues;
}

let cached: Dataset | undefined;

/** Validated dataset for build-time use. Throws on any issue so a broken dataset never ships. */
export function getDataset(root = DATA_ROOT): Dataset {
  if (cached) return cached;
  const { data, issues } = loadDataset(root);
  const all = [...issues, ...crossCheck(data)];
  if (all.length > 0) {
    throw new Error(
      `data/ has ${all.length} problem(s):\n${all.map((i) => `  ${i.path}: ${i.message}`).join("\n")}`,
    );
  }
  cached = data;
  return data;
}
