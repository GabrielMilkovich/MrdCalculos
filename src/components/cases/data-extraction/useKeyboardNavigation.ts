/**
 * Hook de navegação por teclado entre linhas problemáticas em listas de
 * revisão. Compartilhado entre os 3 review dialogs principais.
 *
 * `J` / `K` (lowercase ou shift): próxima/anterior linha duvidosa.
 * Atalho ignora foco em INPUT/TEXTAREA/contentEditable.
 *
 * Uso:
 *   useKeyboardNavigation({
 *     enabled: open,
 *     selector: 'tr[data-row-key]',
 *     isProblema: (idx) => problemSet.has(rows[idx].key),
 *   });
 */
import { useEffect } from "react";

interface Options {
  /** Quando false, o handler é desligado. */
  enabled: boolean;
  /** Seletor CSS para encontrar todas as linhas navegáveis em ordem. */
  selector: string;
  /** Função que recebe o índice e devolve true se a linha é "duvidosa". */
  isProblema: (idx: number) => boolean;
}

export function useKeyboardNavigation({
  enabled,
  selector,
  isProblema,
}: Options): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "j" && e.key !== "k" && e.key !== "J" && e.key !== "K") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      const rows = Array.from(document.querySelectorAll<HTMLElement>(selector));
      if (rows.length === 0) return;
      const indicesProblemas: number[] = [];
      rows.forEach((_, i) => {
        if (isProblema(i)) indicesProblemas.push(i);
      });
      if (indicesProblemas.length === 0) return;
      const ativo = document.activeElement as HTMLElement | null;
      const linhaAtiva = ativo?.closest(selector);
      const idxAtual = linhaAtiva ? rows.indexOf(linhaAtiva as HTMLElement) : -1;
      let proximo: number;
      if (e.key === "j" || e.key === "J") {
        proximo =
          indicesProblemas.find((i) => i > idxAtual) ?? indicesProblemas[0];
      } else {
        const anteriores = indicesProblemas.filter((i) => i < idxAtual);
        proximo =
          anteriores.length > 0
            ? anteriores[anteriores.length - 1]
            : indicesProblemas[indicesProblemas.length - 1];
      }
      const tr = rows[proximo];
      if (tr) {
        tr.scrollIntoView({ block: "center", behavior: "smooth" });
        const firstInput = tr.querySelector("input") as HTMLInputElement | null;
        firstInput?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, selector, isProblema]);
}
