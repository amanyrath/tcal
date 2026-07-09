import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Pin the timezone so local-calendar date logic is tested deterministically,
// regardless of the runner's timezone (CI runs in UTC). Only set a default so
// an explicit TZ in the environment still wins.
process.env.TZ ??= "America/Los_Angeles";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      "/calendar.ics": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});
