import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  // In local dev the SPA runs on :5173 and the Worker on :8787; proxy the API
  // so the app stays same-origin (no CORS, no VITE_API_BASE needed). In prod
  // Pages and the Worker already share an origin, so no proxy is involved.
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Allsquare",
        short_name: "Allsquare",
        description: "Split anything on a trip. End up all square.",
        // Black Forest, the Stamp theme's cover color.
        theme_color: "#7BA05B",
        background_color: "#7BA05B",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
})
