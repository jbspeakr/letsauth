<script lang="ts">
/**
 * The on-demand form: the only interaction on the scanner page. Posts a URL to the service and
 * renders the result with the same component the static report pages use. Without JavaScript
 * the server-rendered form stays visible with its note; this island replaces it when mounted.
 */
import type { Report } from "../scanner/report";
import ScanReport from "./ScanReport.svelte";

interface Props {
  endpoint: string;
}

const { endpoint }: Props = $props();

let url = $state("");
let busy = $state(false);
let error = $state<string | undefined>();
let report = $state<Report | undefined>();

async function submit(event: SubmitEvent) {
  event.preventDefault();
  if (busy) return;
  busy = true;
  error = undefined;
  report = undefined;
  try {
    const res = await fetch(`${endpoint}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const body = (await res.json()) as Report | { error?: string };
    if (!res.ok || "error" in body) {
      error = ("error" in body && body.error) || `the scanner answered ${res.status}`;
    } else {
      report = body as Report;
    }
  } catch {
    error = "the scanner could not be reached";
  } finally {
    busy = false;
  }
}
</script>

<form class="scan-form card" onsubmit={submit} data-enhanced>
  <div class="row">
    <div class="field grow">
      <label for="scan-url">MCP server URL</label>
      <input
        id="scan-url"
        name="url"
        type="url"
        inputmode="url"
        placeholder="https://mcp.example.com/mcp"
        required
        bind:value={url}
        disabled={busy}
      />
    </div>
    <button class="button primary" type="submit" disabled={busy} aria-busy={busy}>
      {busy ? "Scanning…" : "Scan"}
    </button>
  </div>
  <p class="note">
    Reads only the well-known metadata, sends no credentials, stores nothing. The result is not
    added to the atlas.
  </p>
  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}
</form>

{#if report}
  <div class="result" aria-live="polite">
    <ScanReport {report} />
  </div>
{/if}

<style>
  .scan-form {
    margin-bottom: var(--space-4);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: end;
  }
  .grow {
    flex: 1 1 18rem;
  }
  .field input {
    width: 100%;
  }
  .note {
    font-size: var(--text-sm);
    color: var(--ink-muted);
    margin: var(--space-3) 0 0;
    max-width: none;
  }
  .error {
    margin: var(--space-3) 0 0;
    font-size: var(--text-sm);
    color: var(--status-unsupported);
  }
  .result {
    margin-bottom: var(--space-6);
  }
  @media (prefers-reduced-motion: no-preference) {
    .result {
      animation: fade var(--dur) var(--ease);
    }
    @keyframes fade {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
    }
  }
</style>
