<script lang="ts">
/**
 * Progressive enhancement over the server-rendered chain (research R6). The step list and the
 * diagram in the DOM are the source of truth: this island adds a control bar, marks one step as
 * current in both, scrolls to it and keeps the URL fragment in sync. Without JS the page is complete.
 */
import { onMount } from "svelte";

onMount(() => {
  const list = document.getElementById("chain-steps");
  const diagram = document.getElementById("chain-diagram");
  if (!list || !diagram) return;
  const entries = Array.from(list.querySelectorAll<HTMLElement>("li[data-step]"));
  const rows = Array.from(diagram.querySelectorAll<SVGElement>("g[data-step]"));
  if (entries.length === 0) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const bar = document.createElement("div");
  bar.className = "stepper";
  bar.dataset.enhanced = "";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Step through the chain");
  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "button small";
  prev.textContent = "Previous";
  const next = document.createElement("button");
  next.type = "button";
  next.className = "button small primary";
  next.textContent = "Next step";
  const status = document.createElement("p");
  status.className = "stepper__status";
  status.setAttribute("aria-live", "polite");
  const hint = document.createElement("span");
  hint.className = "stepper__hint";
  hint.textContent = "Arrow keys work too.";
  bar.append(prev, next, status, hint);
  diagram.before(bar);

  let current = -1;
  // future steps are dimmed only once the reader starts stepping; the first paint shows all
  let stepping = false;

  function show(i: number, scroll: boolean, push = true) {
    current = Math.max(0, Math.min(entries.length - 1, i));
    entries.forEach((entry, j) => {
      if (j === current) entry.setAttribute("aria-current", "step");
      else entry.removeAttribute("aria-current");
    });
    rows.forEach((row, j) => {
      row.classList.toggle("is-current", j === current);
      row.classList.toggle("is-future", stepping && j > current);
    });
    const entry = entries[current];
    const n = entry?.dataset.index ?? String(current + 1);
    status.textContent = `Step ${n} of ${entries.length}`;
    prev.disabled = current === 0;
    next.disabled = current === entries.length - 1;
    next.textContent = current === entries.length - 1 ? "Last step" : "Next step";
    if (scroll && entry) {
      entry.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    }
    if (push && entry) history.replaceState(null, "", `#${entry.id}`);
  }

  const step = (to: number) => {
    stepping = true;
    show(to, true);
  };
  prev.addEventListener("click", () => step(current - 1));
  next.addEventListener("click", () => step(current + 1));
  document.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement | null;
    if (
      t &&
      (t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable)
    )
      return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      step(current + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      step(current - 1);
    }
  });
  for (const [j, row] of rows.entries()) {
    row.addEventListener("click", () => step(j));
  }

  const fromHash = entries.findIndex((e) => `#${e.id}` === location.hash);
  stepping = fromHash > 0;
  show(fromHash >= 0 ? fromHash : 0, fromHash >= 0, false);
});
</script>

<style>
  :global(.stepper) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2) var(--space-3);
    margin-bottom: var(--space-3);
  }
  :global(.stepper__status) {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--ink);
    max-width: none;
  }
  :global(.stepper__hint) {
    font-size: var(--text-xs);
    color: var(--ink-faint);
  }
  :global(#chain-diagram g[data-step]) {
    cursor: pointer;
  }
</style>
