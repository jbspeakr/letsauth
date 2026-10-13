<script lang="ts">
/**
 * Progressive enhancement over the server-rendered matrix table. The table in the DOM is the
 * source of truth: this island only hides rows and columns, syncs the query string and shows a
 * cell's <details> content in a dialog with focus return. Without JS, the page is complete.
 */
import { onMount } from "svelte";

let dialog: HTMLDialogElement;
let detailHost: HTMLDivElement;
let opener: HTMLElement | null = null;

const PARAMS = ["level", "category", "party", "q"] as const;
type Param = (typeof PARAMS)[number];

onMount(() => {
  const table = document.getElementById("matrix");
  const count = document.getElementById("matrix-count");
  const form = document.getElementById("matrix-filters") as HTMLFormElement | null;
  if (!table || !form) return;

  const controls: Record<Param, HTMLInputElement | HTMLSelectElement | null> = {
    level: form.querySelector("#f-level"),
    category: form.querySelector("#f-category"),
    party: form.querySelector("#f-party"),
    q: form.querySelector("#f-q"),
  };
  const heads = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th[data-feature]"));
  const groupHeads = Array.from(
    table.querySelectorAll<HTMLTableCellElement>("thead tr.groups th[data-category]"),
  );
  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr[data-server]"));
  const total = rows.length;

  const state = (): Record<Param, string> => ({
    level: controls.level?.value ?? "",
    category: controls.category?.value ?? "",
    party: controls.party?.value ?? "",
    q: (controls.q?.value ?? "").trim().toLowerCase(),
  });

  function apply(pushUrl = true) {
    const s = state();
    const visibleFeatures = new Set<string>();
    const perCategory = new Map<string, number>();
    for (const th of heads) {
      const show =
        (!s.level || th.dataset.level === s.level) &&
        (!s.category || th.dataset.category === s.category) &&
        (!s.party || th.dataset.party === s.party);
      th.hidden = !show;
      const id = th.dataset.feature ?? "";
      if (show) {
        visibleFeatures.add(id);
        const c = th.dataset.category ?? "";
        perCategory.set(c, (perCategory.get(c) ?? 0) + 1);
      }
    }
    for (const gh of groupHeads) {
      const n = perCategory.get(gh.dataset.category ?? "") ?? 0;
      gh.hidden = n === 0;
      if (n > 0) gh.colSpan = n;
    }
    let shown = 0;
    for (const tr of rows) {
      const match = !s.q || (tr.dataset.name ?? "").includes(s.q);
      tr.hidden = !match;
      if (match) shown += 1;
      for (const td of tr.querySelectorAll<HTMLTableCellElement>("td[data-feature]")) {
        td.hidden = !visibleFeatures.has(td.dataset.feature ?? "");
      }
    }
    if (count) {
      count.textContent = `${shown} of ${total} servers, ${visibleFeatures.size} of ${heads.length} features`;
    }
    if (pushUrl) {
      const params = new URLSearchParams();
      for (const key of PARAMS)
        if (s[key]) params.set(key, key === "q" ? (controls.q?.value ?? "").trim() : s[key]);
      const qs = params.toString();
      history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
    }
  }

  // restore from the URL
  const initial = new URLSearchParams(location.search);
  for (const key of PARAMS) {
    const v = initial.get(key);
    const el = controls[key];
    if (v && el) el.value = v;
  }
  apply(false);

  let timer: ReturnType<typeof setTimeout> | undefined;
  controls.q?.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => apply(), 150);
  });
  for (const key of ["level", "category", "party"] as const) {
    controls[key]?.addEventListener("change", () => apply());
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    apply();
  });
  form.addEventListener("reset", () => {
    // let the browser clear the fields first
    setTimeout(() => apply(), 0);
  });

  // cell detail in a dialog, with focus return
  table.addEventListener("click", (e) => {
    const summary = (e.target as HTMLElement).closest<HTMLElement>("details.cell > summary");
    if (!summary) return;
    e.preventDefault();
    const details = summary.parentElement as HTMLDetailsElement;
    const content = details.querySelector("[data-detail]");
    if (!content) return;
    opener = summary;
    detailHost.replaceChildren(content.cloneNode(true));
    dialog.showModal();
  });
  dialog.addEventListener("close", () => {
    opener?.focus();
    opener = null;
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
});
</script>

<dialog bind:this={dialog} class="cell-dialog" aria-labelledby="cell-dialog-title">
  <div class="cell-dialog__inner">
    <div class="cell-dialog__bar">
      <h2 id="cell-dialog-title">Observation</h2>
      <form method="dialog">
        <button type="submit" class="button" aria-label="Close">Close</button>
      </form>
    </div>
    <div bind:this={detailHost}></div>
  </div>
</dialog>

<style>
  .cell-dialog {
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-lg);
    background: var(--bg-elevated);
    color: var(--ink);
    padding: 0;
    width: min(32rem, calc(100vw - 2rem));
    box-shadow: var(--shadow);
  }
  .cell-dialog::backdrop {
    background: rgb(0 0 0 / 35%);
  }
  .cell-dialog__inner {
    padding: var(--space-4) var(--space-5) var(--space-5);
  }
  .cell-dialog__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }
  .cell-dialog__bar h2 {
    font-size: var(--text-lg);
    margin: 0;
  }
  .cell-dialog__bar form {
    margin: 0;
  }
</style>
