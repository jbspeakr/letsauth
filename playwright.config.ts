import { defineConfig, devices } from "@playwright/test";

const port = 4321;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  webServer: {
    command: `pnpm astro preview --port ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "light", use: { ...devices["Desktop Chrome"], colorScheme: "light" } },
    { name: "dark", use: { ...devices["Desktop Chrome"], colorScheme: "dark" } },
    { name: "phone", use: { ...devices["Pixel 7"], colorScheme: "light" } },
  ],
});
