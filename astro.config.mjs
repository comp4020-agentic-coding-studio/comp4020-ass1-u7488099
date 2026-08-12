import { defineConfig } from "astro/config";

// Deployed under github.io/<repo>/, so the base path has to be the repo name
// or every asset 404s on the live URL while working fine locally.
export default defineConfig({
  base: "/comp4020-ass1-u7488099",
});
