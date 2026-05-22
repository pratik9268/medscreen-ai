import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/session":     "http://localhost:8000",
      "/report":      "http://localhost:8000",
      "/classify":    "http://localhost:8000",
      "/auth":        "http://localhost:8000",
      "/patient":     "http://localhost:8000",
      "/doctor":      "http://localhost:8000",
      "/admin":       "http://localhost:8000",
      "/appointments":"http://localhost:8000",
      "/screening":   "http://localhost:8000",
      "/health":      "http://localhost:8000",
    },
  },
});