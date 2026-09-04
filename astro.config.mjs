import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://p1tl0rd.github.io",
  base: "/retrogame-port-tracker",
  output: "static",
  trailingSlash: "always",
  prerenderConflictBehavior: "error",
  integrations: [sitemap()],
});
