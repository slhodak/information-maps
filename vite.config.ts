import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Each drill in src/content/** is a large, self-contained module (some carry
// hundreds of KB of embedded map geometry). Route-level code splitting keeps
// all of that out of the initial catalog load — a drill's chunk is fetched
// only when its route is visited. See src/content/registry.ts.
export default defineConfig({
  plugins: [react()],
  server: { open: true },
  build: { chunkSizeWarningLimit: 1200 },
});
