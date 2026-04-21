import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/pwa-register";
import { pruneStaleCache } from "./lib/offline-cache";

// Limpa cache localStorage de versões antigas do engine (evita stale results)
pruneStaleCache();

createRoot(document.getElementById("root")!).render(<App />);

// Register PWA Service Worker for offline support
registerServiceWorker();
