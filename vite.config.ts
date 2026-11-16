import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // enregistrement manuel dans src/pwa.ts
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "icons/*.png"],
      manifest: {
        id: "/",
        name: "AlgLab — Entraînement OLL & PLL",
        short_name: "AlgLab",
        description:
          "Apprends, révise et entraîne les 57 OLL et 21 PLL du Rubik's Cube 3x3. 100 % hors-ligne, compatible smart cubes Bluetooth.",
        lang: "fr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#0b1020",
        theme_color: "#0b1020",
        categories: ["games", "education", "utilities"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          { name: "S'entraîner", url: "/train", icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
          { name: "Reconnaissance", url: "/recognition", icons: [{ src: "icons/icon-192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest,woff,woff2,json,wasm,txt}"],
        // Le moteur 3D (cubing/twisty + three) est volumineux : on le précache quand même
        // pour garantir un fonctionnement 100 % hors-ligne.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 2500,
  },
});
