// @ts-check

import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";
import pagefind from "astro-pagefind";

export default defineConfig({
  site: "https://letsauth.eu",
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [svelte(), sitemap(), pagefind()],
});
