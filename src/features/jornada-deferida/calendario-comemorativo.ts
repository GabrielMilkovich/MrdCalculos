/**
 * Calendário comemorativo — datas com jornada fixa diferente da regra base
 * (típico no varejo: Dia das Mães, Pais, Black Friday, vésperas etc.).
 *
 * Funções puras, sem dependência de DB. A `case_jornada_override.regra_recorrente`
 * persiste o tipo da regra no banco (jsonb); o gerador aqui materializa as
 * datas concretas dentro de uma janela.
 *
 * Datas usam UTC midnight (alinhado com o parser de cartão de ponto).
 */

export type RegraRecorrente =
  | { tipo: 'dia_das_maes' }
  | { tipo: 'dia_dos_pais' }
  | { tipo: 'black_friday' }
  | { tipo: 'cyber_monday' }
  | { tipo: 'vespera_natal' }
  | { tipo: 'vespera_ano_novo' }
  | { tipo: 'dia_dos_namorados' }
  | { tipo: 'dia_das_criancas' }
  | { tipo: 'dia_fixo'; mes: number; dia: number };

/** Cria UTC midnight de (ano, mês 1-12, dia 1-31). */
function utc(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Última sexta-feira do mês (1-12) num ano. */
function ultimaSextaDoMes(ano: number, mes: number): Date {
  // Dia 1 do mês seguinte → volta até cair na sexta (5).
  const proximoMesD1 = new Date(Date.UTC(ano, mes, 1));
  const d = new Date(proximoMesD1);
  // 1 dia atrás
  d.setUTCDate(d.getUTCDate() - 1);
  while (d.getUTCDay() !== 5) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d;
}

/** N-ésimo domingo do mês (n=1..5). Retorna null se não existir (n=5 raramente). */
function nthDomingoDoMes(ano: number, mes: number, n: number): Date | null {
  // Dia 1
  let d = utc(ano, mes, 1);
  // Avança até o primeiro domingo (0).
  while (d.getUTCDay() !== 0) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  // Avança (n-1) semanas.
  d.setUTCDate(d.getUTCDate() + 7 * (n - 1));
  if (d.getUTCMonth() !== mes - 1) return null;
  return d;
}

/**
 * Para um ano específico, devolve a Date concreta da regra recorrente.
 * Retorna null quando a regra não se materializa naquele ano (raro).
 */
export function dataDoAno(regra: RegraRecorrente, ano: number): Date | null {
  switch (regra.tipo) {
    case 'dia_das_maes':
      return nthDomingoDoMes(ano, 5, 2); // 2º domingo de maio
    case 'dia_dos_pais':
      return nthDomingoDoMes(ano, 8, 2); // 2º domingo de agosto
    case 'black_friday':
      return ultimaSextaDoMes(ano, 11);
    case 'cyber_monday': {
      const bf = ultimaSextaDoMes(ano, 11);
      const seg = new Date(bf);
      seg.setUTCDate(seg.getUTCDate() + 3);
      return seg;
    }
    case 'vespera_natal':
      return utc(ano, 12, 24);
    case 'vespera_ano_novo':
      return utc(ano, 12, 31);
    case 'dia_dos_namorados':
      return utc(ano, 6, 12);
    case 'dia_das_criancas':
      return utc(ano, 10, 12);
    case 'dia_fixo':
      return utc(ano, regra.mes, regra.dia);
  }
}

/**
 * Gera todas as datas que a regra produz no intervalo [inicio, fim] inclusivo.
 * Itera sobre os anos cobertos.
 */
export function gerarDatasNoIntervalo(
  regra: RegraRecorrente,
  inicio: Date,
  fim: Date,
): Date[] {
  if (fim < inicio) return [];
  const out: Date[] = [];
  const anoIni = inicio.getUTCFullYear();
  const anoFim = fim.getUTCFullYear();
  for (let ano = anoIni; ano <= anoFim; ano++) {
    const d = dataDoAno(regra, ano);
    if (d && d >= inicio && d <= fim) out.push(d);
  }
  return out;
}

/**
 * Conjunto de regras default do varejo (operador adiciona/remove no UI).
 */
export const REGRAS_DEFAULT_VAREJO: RegraRecorrente[] = [
  { tipo: 'dia_das_maes' },
  { tipo: 'dia_dos_pais' },
  { tipo: 'black_friday' },
  { tipo: 'vespera_natal' },
  { tipo: 'vespera_ano_novo' },
];

export function descreverRegra(regra: RegraRecorrente): string {
  switch (regra.tipo) {
    case 'dia_das_maes':
      return 'Dia das Mães (2º domingo de maio)';
    case 'dia_dos_pais':
      return 'Dia dos Pais (2º domingo de agosto)';
    case 'black_friday':
      return 'Black Friday (última sexta de novembro)';
    case 'cyber_monday':
      return 'Cyber Monday (segunda após Black Friday)';
    case 'vespera_natal':
      return 'Véspera de Natal (24/12)';
    case 'vespera_ano_novo':
      return 'Véspera de Ano Novo (31/12)';
    case 'dia_dos_namorados':
      return 'Dia dos Namorados (12/06)';
    case 'dia_das_criancas':
      return 'Dia das Crianças (12/10)';
    case 'dia_fixo':
      return `Dia fixo ${String(regra.dia).padStart(2, '0')}/${String(regra.mes).padStart(2, '0')}`;
  }
}
