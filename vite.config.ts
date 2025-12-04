import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import eslint from "vite-plugin-eslint";
import removeConsole from "vite-plugin-remove-console";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";
  return {
    plugins: [
      react(),
      eslint({
        failOnError: false,
        failOnWarning: false,
        cache: false,
        include: ["src/**/*.ts", "src/**/*.tsx"],
      }),
      isProd && removeConsole({ exclude: [] }), // 构建时移除所有 console
    ],

    resolve: {
      alias: {
        buffer: "buffer",
        "@": path.resolve("./src"),
      },
    },
    optimizeDeps: { include: ["buffer"] },
    build: {
      minify: "esbuild",
      esbuild: { drop: isProd ? ["console", "debugger"] : [] },
    },
  };
});
