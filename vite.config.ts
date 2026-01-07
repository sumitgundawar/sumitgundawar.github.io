import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/', // Crucial for GH Pages routing
  build: {
    outDir: 'dist', // Explicit output directory
    emptyOutDir: true // Ensure clean builds
  },
  server: {
    port: 8080,
    strictPort: true,
    // Reduce risk of exposing the dev server to the network.
    host: "localhost",
    // Harden file serving during local development.
    fs: {
      strict: true,
      deny: [".env", ".env.*", "**/.git/**", "**/node_modules/**"],
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
