/**
 * MÓDULO AUTÔNOMO — Não integrado ao PjeCalcEngine.
 *
 * Expurgos inflacionários do FGTS — diferenças de correção monetária
 * dos planos econômicos que não foram repassadas aos saldos do FGTS.
 *
 * Os expurgos afetam apenas contratos com saldo FGTS nos períodos de 1989-1991.
 * Em liquidações atuais raramente são pleiteados (prescrição e baixa frequência
 * de contratos ativos nesses períodos ainda em litígio).
 *
 * Para usar: importar calcularExpurgosFGTS() separadamente e adicionar o valor
 * ao resultado do calcularFGTS() quando aplicável ao caso.
 *
 * Fundamento: STF ARE 709.212 (2014) — prescrição trintenária extinta.
 *
 * Planos: Verão (jan/1989), Collor I (mar/1990), Collor II (fev/1991)
 *
 * Os percentuais são fixos e já foram definidos pela jurisprudência:
 * - Plano Verão (jan/1989): 42.72%
 * - Plano Collor I (abr/1990): 44.80%
 * - Plano Collor II (fev/1991): 21.87%
 *
 * O cálculo incide sobre o saldo do FGTS na data de cada plano.
 * Raramente usado em processos novos, mas necessário para completude.
 */

export interface ExpurgoFGTS {
  plano: string;
  data: string;
  percentual: number;
  descricao: string;
}

export const EXPURGOS: ExpurgoFGTS[] = [
  { plano: 'Plano Verão', data: '1989-01', percentual: 42.72, descricao: 'IPC jan/1989 — 42.72% (Lei 7.730/89)' },
  { plano: 'Collor I', data: '1990-04', percentual: 44.80, descricao: 'IPC abr/1990 — 44.80% (Lei 8.024/90)' },
  { plano: 'Collor II', data: '1991-02', percentual: 21.87, descricao: 'IPC fev/1991 — 21.87% (Lei 8.177/91)' },
];

export function calcularExpurgosFGTS(saldoNaData: number, expurgos: ExpurgoFGTS[] = EXPURGOS): { plano: string; saldo: number; percentual: number; valor: number }[] {
  return expurgos.map(e => ({
    plano: e.plano,
    saldo: saldoNaData,
    percentual: e.percentual,
    valor: Number((saldoNaData * e.percentual / 100).toFixed(2)),
  }));
}
