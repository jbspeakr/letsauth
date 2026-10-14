import { expect, test } from "@playwright/test";
import { currentCell, currentRevision, matrixFor } from "../../src/lib/atlas";
import { getDataset } from "../../src/lib/data";
import { expectNoSeriousA11yViolations } from "./helpers";

const data = getDataset();
const revision = currentRevision(data);
const matrix = matrixFor(data, revision.id);
const STATUSES = ["supported", "partial", "unsupported", "unknown", "not-applicable"];

// a server whose newest observation on mcp.as.dcr is "unsupported" with evidence
const withUnsupported = matrix.rows.find(
  (s) => matrix.cells.get(`${s.id}|mcp.as.dcr`)?.status === "unsupported",
);
// a server with nothing but unknown cells
const allUnknown = matrix.rows.find((s) =>
  matrix.columns.every((f) => currentCell(data, s, f, revision.id).status === "unknown"),
);

test.describe("matrix page (US1)", () => {
  test("names the revision and renders every server, feature and cell (FR-001)", async ({
    page,
  }) => {
    await page.goto("/atlas/mcp/");
    await expect(page.locator("[data-revision]")).toHaveText(revision.id);
    await expect(page.locator("#matrix tbody tr[data-server]")).toHaveCount(matrix.rows.length);
    await expect(page.locator("#matrix thead th[data-feature]")).toHaveCount(matrix.columns.length);
    const cells = page.locator("#matrix tbody td[data-feature]");
    await expect(cells).toHaveCount(matrix.rows.length * matrix.columns.length);
    const statuses = await cells.evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.status),
    );
    expect(statuses.every((s) => s && STATUSES.includes(s))).toBe(true);
  });

  test("cell detail shows the observation and returns focus on close (FR-002)", async ({
    page,
  }) => {
    test.skip(!withUnsupported, "no server with an unsupported observation in the seed data");
    await page.goto("/atlas/mcp/");
    await expect(page.locator("#matrix[data-enhanced]")).toBeAttached();
    const summary = page.locator(
      `td[data-server="${withUnsupported?.id}"][data-feature="mcp.as.dcr"] summary`,
    );
    await summary.click();
    const dialog = page.locator("dialog.cell-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Unsupported");
    const winning = matrix.cells.get(`${withUnsupported?.id}|mcp.as.dcr`)?.observation;
    await expect(dialog).toContainText(winning?.method ?? "vendor-claim");
    await expect(dialog).toContainText(winning?.observedAt.slice(0, 10) ?? "");
    await expect(dialog).toContainText(winning?.observedBy ?? "");
    await expect(dialog.locator("dd a[href^='https://']")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(summary).toBeFocused();
  });

  test("a server without observations reads unknown everywhere, never unsupported (SC-006)", async ({
    page,
  }) => {
    test.skip(!allUnknown, "no all-unknown server in the seed data");
    await page.goto("/atlas/mcp/");
    const row = page.locator(`#matrix tbody tr[data-server="${allUnknown?.id}"]`);
    await expect(row.locator("td[data-status='unknown']")).toHaveCount(matrix.columns.length);
    await expect(row.locator("td[data-status='unsupported']")).toHaveCount(0);
    await expect(row.locator("td").first().locator("summary .status-unknown")).toBeVisible();
  });

  test("filter state in the URL restores the filtered view (FR-008)", async ({ page }) => {
    await page.goto("/atlas/mcp/?level=MUST&q=stripe");
    await expect(page.locator("#matrix[data-enhanced]")).toBeAttached();
    await expect(page.locator("#matrix-count")).toHaveText(/^1 of \d+ servers/);
    await expect(page.locator("#matrix tbody tr[data-server]:not([hidden])")).toHaveCount(1);
    await expect(page.locator("#matrix tbody tr[data-server]:not([hidden])")).toContainText(
      "Stripe",
    );
    const visibleLevels = await page
      .locator("#matrix thead th[data-feature]:not([hidden])")
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.level));
    expect(visibleLevels.length).toBeGreaterThan(0);
    expect(new Set(visibleLevels)).toEqual(new Set(["MUST"]));
    await expect(page.locator("#f-level")).toHaveValue("MUST");
    await expect(page.locator("#f-q")).toHaveValue("stripe");
  });

  test("rows are alphabetical and nothing sorts or scores servers (FR-014)", async ({ page }) => {
    await page.goto("/atlas/mcp/");
    const names = await page.locator("#matrix tbody th[scope='row'] a").allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    await expect(page.locator("#matrix [aria-sort]")).toHaveCount(0);
    await expect(page.locator("#matrix thead button")).toHaveCount(0);
    await expect(page.locator("#matrix")).not.toContainText(/score|rank|grade/i);
  });

  test("keyboard-only walkthrough opens and closes a cell", async ({ page }) => {
    test.skip(!withUnsupported, "no server with an unsupported observation in the seed data");
    await page.goto("/atlas/mcp/");
    await expect(page.locator("#matrix[data-enhanced]")).toBeAttached();
    const summary = page.locator(
      `td[data-server="${withUnsupported?.id}"][data-feature="mcp.as.dcr"] summary`,
    );
    await summary.focus();
    await page.keyboard.press("Enter");
    const dialog = page.locator("dialog.cell-dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(summary).toBeFocused();
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await page.goto("/atlas/mcp/");
    await expectNoSeriousA11yViolations(page);
  });

  test("looks right", async ({ page }) => {
    await page.goto("/atlas/mcp/");
    await expect(page.locator("#matrix[data-enhanced]")).toBeAttached();
    await expect(page).toHaveScreenshot("matrix.png");
  });
});

test.describe("matrix page without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("renders the full matrix and native cell details", async ({ page }) => {
    test.skip(!withUnsupported, "no server with an unsupported observation in the seed data");
    await page.goto("/atlas/mcp/?level=MUST");
    await expect(page.locator("#matrix tbody tr[data-server]")).toHaveCount(matrix.rows.length);
    await expect(page.locator("#matrix tbody tr[data-server]:not([hidden])")).toHaveCount(
      matrix.rows.length,
    );
    const details = page.locator(
      `td[data-server="${withUnsupported?.id}"][data-feature="mcp.as.dcr"] details`,
    );
    await details.locator("summary").click();
    await expect(details).toHaveAttribute("open", "");
    await expect(details.locator("[data-detail]")).toContainText("vendor-claim");
  });
});
