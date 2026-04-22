/**
 * Version Checker — detecta que nova versão do app foi deployed e força reload.
 *
 * Problema sem isso:
 *   - User abre a página. SW cacheia JS hasheado.
 *   - User fica com aba aberta.
 *   - Deploy acontece. HTML novo é servido com referência a NOVO hash de JS.
 *   - User navega por Link client-side (react-router) — nunca solicita HTML novo.
 *   - User continua vendo versão antiga até recarregar manualmente.
 *
 * Esta rotina:
 *   1. Faz polling do `/index.html` (network-first no SW) a cada 60s.
 *   2. Extrai o hash do bundle principal (<script src="/assets/index-XXXX.js">).
 *   3. Se hash mudou desde o carregamento → dispara reload.
 *
 * Execução: chamar startVersionChecker() no main.tsx após app montar.
 */

import { logger } from "@/lib/logger";

const POLL_INTERVAL_MS = 60_000; // 1 minuto
const INDEX_URL = "/index.html";
const SCRIPT_RE = /src="(\/assets\/index-[^"]+\.js)"/;

let initialHash: string | null = null;
let timerId: number | null = null;

async function fetchCurrentHash(): Promise<string | null> {
  try {
    // Cache-bust via query string; SW já é network-first em HTML
    const resp = await fetch(`${INDEX_URL}?_v=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const m = html.match(SCRIPT_RE);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

async function checkVersion(): Promise<void> {
  const current = await fetchCurrentHash();
  if (!current) return;

  if (initialHash === null) {
    initialHash = current;
    logger.info("[version-checker] initial hash", { hash: current });
    return;
  }

  if (current !== initialHash) {
    logger.info("[version-checker] new version detected, reloading", {
      from: initialHash,
      to: current,
    });
    // Avisa o user por 3s antes de reload, caso esteja editando algo
    window.dispatchEvent(new CustomEvent("sw-update-available"));
    setTimeout(() => {
      // Hard reload: força cache bypass
      window.location.reload();
    }, 3000);
  }
}

export function startVersionChecker(): void {
  if (timerId !== null) return;
  if (typeof window === "undefined") return;
  if (!import.meta.env.PROD) return; // só em produção

  // Primeira checagem imediata (captura hash inicial)
  void checkVersion();

  // Poll periódico
  timerId = window.setInterval(() => {
    void checkVersion();
  }, POLL_INTERVAL_MS);

  // Re-check ao voltar à aba (muito comum: user volta depois de horas)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkVersion();
  });
}

export function stopVersionChecker(): void {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

/**
 * Retorna o BUILD_ID injetado em build time (vite.config.ts).
 * Útil para mostrar versão na UI ou debug.
 */
export function getBuildId(): string {
  return (import.meta.env.VITE_BUILD_ID as string | undefined) ?? "dev";
}
