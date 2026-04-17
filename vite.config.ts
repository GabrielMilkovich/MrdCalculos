import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Isolar @xmldom/xmldom em chunk separado para evitar colisão de
          // nomes minificados com pjc-analyzer (ambos minificavam para 'Z'
          // no mesmo escopo, causando SyntaxError em strict mode/ES module).
          xmldom: ['@xmldom/xmldom'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom/client",
      "@radix-ui/react-tooltip",
    ],
    force: true,
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
}));
