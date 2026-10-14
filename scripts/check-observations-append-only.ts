/**
 * Fails when an existing observation entry was changed or removed between a base ref and the
 * working tree. Observations are append-only (constitution, Development Workflow).
 *
 * Usage: tsx scripts/check-observations-append-only.ts [baseRef]   (default: origin/main)
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const base = process.argv[2] ?? "origin/main";
const dir = "data/observations";

function entriesOf(text: string): string[] {
  const list = parse(text);
  if (!Array.isArray(list)) return [];
  return list.map((e) => createHash("sha256").update(JSON.stringify(e)).digest("hex"));
}

function git(cmd: string): string {
  return execSync(`git ${cmd}`, { encoding: "utf8" });
}

const baseFiles = git(`ls-tree -r --name-only ${base} -- ${dir}`)
  .split("\n")
  .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

const problems: string[] = [];
for (const file of baseFiles) {
  const before = entriesOf(git(`show ${base}:${file}`));
  let after: string[];
  try {
    after = entriesOf(readFileSync(file, "utf8"));
  } catch {
    problems.push(`${file}: file removed; observations are append-only`);
    continue;
  }
  const remaining = new Set(after);
  before.forEach((hash, i) => {
    if (!remaining.has(hash)) {
      problems.push(
        `${file}[${i}]: existing observation changed or removed; append a new entry instead`,
      );
    }
  });
}

if (problems.length > 0) {
  console.error(`append-only check failed against ${base}:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`append-only ok: ${baseFiles.length} observation file(s) checked against ${base}`);
