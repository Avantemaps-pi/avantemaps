import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Pre-compress static assets at build time. Hosts that support
    // pre-compressed files (e.g. Lovable's CDN, Netlify, Vercel) will
    // serve the .br / .gz variants automatically when the client sends
    // the matching Accept-Encoding header.
    mode !== "development" &&
      viteCompression({
        algorithm: "gzip",
        ext: ".gz",
        threshold: 1024,
        deleteOriginFile: false,
      }),
    mode !== "development" &&
      viteCompression({
        algorithm: "brotliCompress",
        ext: ".br",
        threshold: 1024,
        deleteOriginFile: false,
      }),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },

  // ✅ Add build configuration here
  build: {
    chunkSizeWarningLimit: 2000, // Raise warning limit to 2MB
    sourcemap: mode === "development", // Optional: keep sourcemaps only in dev
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
          leaflet: ["leaflet"],
          recharts: ["recharts"],
          icons: ["lucide-react"],
        },
      },
    },
  },
}));
