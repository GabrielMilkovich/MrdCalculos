/**
 * BetaParityBanner — banner persistente "BETA 98% paridade"
 * exibido no topo da aplicacao durante fase piloto (opcao D PLANO-PARA-99).
 */
import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';

const STORAGE_KEY = 'mrdcalc:beta-banner-dismissed:v98';

export function BetaParityBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === '1';
  });

  if (dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="truncate">
            <strong>BETA — 98% paridade calibrate</strong> contra PJe-Calc Java v2.15.1.
            Encontrou divergência? Use o botão "Reportar" no caso. Cada feedback
            ajuda a chegarmos a 99%+.
          </span>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, '1');
            setDismissed(true);
          }}
          className="shrink-0 p-1 hover:bg-white/20 rounded transition"
          aria-label="Fechar banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
