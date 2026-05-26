import type { AlertaApuracao, MarcacaoDominio } from "../tipos-dominio.ts";

export const PADROES_RELOGIO_PROBLEMA: ReadonlyArray<{ re: RegExp; rotulo: string }> = [
  { re: /problemas?\s+rel[oó]gio/i, rotulo: 'Problemas Relógio' },
  { re: /rel[oó]gio\s+quebrad[oa]/i, rotulo: 'Relógio Quebrado' },
  { re: /rel[oó]gio\s+(com\s+)?defeito/i, rotulo: 'Relógio com Defeito' },
  { re: /rel[oó]gio\s+fora\s+(de\s+)?ar/i, rotulo: 'Relógio Fora do Ar' },
  { re: /rel\.?\s*quebrad[oa]/i, rotulo: 'Rel. Quebrado' },
  { re: /sem\s+marca[çc][ãa]o\s+(do\s+)?rel/i, rotulo: 'Sem Marcação no Relógio' },
  { re: /lan[çc]amento\s+manual\s+(de\s+)?ponto/i, rotulo: 'Lançamento Manual de Ponto' },
];

export function contarBatidas(marcacoes: MarcacaoDominio[]): number {
  let n = 0;
  for (const m of marcacoes) {
    if (m.e && m.e.trim().length > 0) n++;
    if (m.s && m.s.trim().length > 0) n++;
  }
  return n;
}

export function detectarBatidasImpares(
  marcacoes: MarcacaoDominio[],
): AlertaApuracao | null {
  const n = contarBatidas(marcacoes);
  if (n === 0 || n % 2 === 0) return null;
  return {
    tipo: 'BATIDAS_IMPARES',
    severidade: 'warning',
    mensagem: `${n} batida(s) registrada(s) — número ímpar sugere batida faltante. Revisão manual necessária.`,
    detalhes: { batidas_count: n },
  };
}

export function detectarProblemaRelogio(
  textos: ReadonlyArray<string | null | undefined>,
): AlertaApuracao | null {
  for (const txt of textos) {
    if (!txt) continue;
    for (const { re, rotulo } of PADROES_RELOGIO_PROBLEMA) {
      const m = txt.match(re);
      if (m) {
        return {
          tipo: 'RELOGIO_QUEBRADO',
          severidade: 'warning',
          mensagem: `Anotação no PDF indica problema com o relógio (${rotulo}). Verifique manualmente as batidas deste dia.`,
          detalhes: { padrao: rotulo, trecho: m[0] },
        };
      }
    }
  }
  return null;
}

export function detectarAlertas(
  marcacoes: MarcacaoDominio[],
  textos: ReadonlyArray<string | null | undefined>,
): AlertaApuracao[] {
  const out: AlertaApuracao[] = [];
  const a1 = detectarBatidasImpares(marcacoes);
  if (a1) out.push(a1);
  const a2 = detectarProblemaRelogio(textos);
  if (a2) out.push(a2);
  return out;
}
