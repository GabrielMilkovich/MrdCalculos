/**
 * Feature flags do port PJe-Calc — Fase 0 (setup).
 *
 * Cada módulo portado ganha uma flag `VITE_USE_PORTED_<MODULO>`. Quando a
 * flag está ativa, o engine delega ao código portado em `core/`; quando off,
 * mantém o engine atual em `src/lib/pjecalc/engine-v3.ts`. Isso permite
 * rollback instantâneo (flag off + redeploy) durante as fases 1-8.
 *
 * Todas as flags são removidas na Fase 9, quando o engine portado é
 * oficialmente o único em uso.
 *
 * Ver: docs/PORT-PJECALC-PLAN.md §6.1.
 */

import { __setPortedEnabledHook } from '../../__golden__/runner';

/**
 * Lista canônica de módulos com flag de ativação. Expandir conforme fases avançam.
 */
export const PORTED_MODULES = [
  'IRPF',
  'INSS',
  'FGTS',
  'CARTAO',
  'ATUALIZACAO',
  'PAGAMENTO',
  'CALCULO',
  // Fase 1 (fundação) — não tem flag porque é puro support
  // Fase 2 (índices) — não tem flag porque é data estática
  'VERBA',
  'HONORARIO',
  'CUSTAS',
  'FERIAS',
  'MULTA',
  'SALARIO_FAMILIA',
  'SEGURO_DESEMPREGO',
  'PENSAO_ALIMENTICIA',
  'PREVIDENCIA_PRIVADA',
] as const;

export type PortedModule = (typeof PORTED_MODULES)[number];

/**
 * Lê uma variável de ambiente de forma compatível com browser (Vite import.meta.env)
 * e Node (process.env). Retorna string vazia se não definida.
 */
function readEnv(name: string): string {
  // Vite browser runtime
  try {
    const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    if (viteEnv && typeof viteEnv[name] === 'string') {
      return viteEnv[name] ?? '';
    }
  } catch {
    // `import.meta.env` pode não existir em contexto Node puro
  }
  // Node runtime (scripts, testes)
  if (typeof process !== 'undefined' && process.env && typeof process.env[name] === 'string') {
    return process.env[name] ?? '';
  }
  return '';
}

/**
 * Parseia uma string de env em boolean. Trata "true", "1", "on", "yes" como verdadeiro
 * (case-insensitive). Qualquer outro valor (inclusive string vazia) é falso.
 */
function parseBool(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'on' || v === 'yes';
}

/**
 * Nome da variável de ambiente correspondente a um módulo portado.
 */
export function envVarForModule(module: string): string {
  return `VITE_USE_PORTED_${module.toUpperCase()}`;
}

/**
 * true se a flag do módulo está ativa no ambiente atual. Default: false
 * (todos os módulos desligados enquanto não chegam a 100% de paridade).
 *
 * Aceita tanto nomes canônicos (`PortedModule`) quanto strings arbitrárias —
 * durante o port incremental é comum ligar flags de módulos ainda não
 * listados em `PORTED_MODULES`.
 */
export function isPortedEnabled(module: string): boolean {
  return parseBool(readEnv(envVarForModule(module)));
}

/**
 * Diagnóstico: retorna o estado atual de todas as flags canônicas.
 * Útil para logs de startup e para o script de auditoria em CI.
 */
export function snapshotPortedFlags(): Record<PortedModule, boolean> {
  const out = {} as Record<PortedModule, boolean>;
  for (const m of PORTED_MODULES) {
    out[m] = isPortedEnabled(m);
  }
  return out;
}

/**
 * Conveniência: true se ao menos uma flag está ativa (ou seja, se o engine
 * portado está sendo exercitado em qualquer ponto).
 */
export function isAnyPortedEnabled(): boolean {
  return PORTED_MODULES.some((m) => isPortedEnabled(m));
}

// Conecta o hook do harness de golden tests à implementação real desta função.
// Antes deste módulo ser importado, o harness usava um stub que sempre retorna
// true. Qualquer import indireto de `core/index.ts` (ou deste arquivo)
// propaga o wiring correto.
__setPortedEnabledHook(isPortedEnabled);
