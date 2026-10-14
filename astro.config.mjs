// @ts-check

import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";
import pagefind from "astro-pagefind";

export default defineConfig({
  site: "https://letsauth.eu",
  trailingSlash: "always",
  // Bunny Storage serves <folder>/index.html for "/folder/" but has nothing to match "/folder"
  // or an extensionless page, so pages are folders and every internal link ends in a slash.
  build: { format: "directory" },
  integrations: [svelte(), sitemap(), pagefind()],
});
