import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  base: "./",
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: ["@novnc/novnc", "@novnc/novnc/lib/rfb"], // ← 追加
    },
  },
});
