import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/pwa-register";

createRoot(document.getElementById("root")!).render(<App />);

// Register PWA Service Worker for offline support
registerServiceWorker();
