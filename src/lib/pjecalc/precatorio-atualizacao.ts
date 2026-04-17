// =====================================================
// PRECATÓRIO — Atualização Temporal (EC 136/2025)
// =====================================================
// Regras de juros/correção para precatórios federais conforme transições
// constitucionais:
//   • Pré EC 113/2021   → TR + 6% a.a. (composto anual)
//   • EC 113/2021       → SELIC (soma simples mensal)
//   • EC 136/2025       → IPCA-E + 2% a.a. (composto anual)
//
// Referências:
//   - pjecalc-fonte/.../indices/precatorios/IndicePrecatorioEC1362025.java
//   - pjecalc-fonte/.../juros/precatorios/JurosPrecatorioEC1362025.java
//
// Observação: EC 136/2025 afeta apenas precatórios federais. Para
// estaduais/municipais mantemos a regência anterior (SELIC pós-EC 113).
// =====================================================

import Decimal from 'decimal.js';
import { IPCA_E_ACUMULADO, SELIC_MENSAL, TR_MENSAL } from './indices-fallback';

Decimal.set({ precision: 20 });

export interface PrecatorioInput {
  valor_base: number;
  data_expedicao: string; // ISO YYYY-MM-DD
  data_atualizacao: string; // ISO YYYY-MM-DD
  tipo: 'FEDERAL' | 'ESTADUAL' | 'MUNICIPAL';
}

export type RegimePrecatorio = 'TR_6' | 'SELIC' | 'IPCA_2' | 'SEM_CORRECAO';

export interface PrecatorioSegmento {
  regime: RegimePrecatorio;
  data_inicio: string;
  data_fim: string;
  fator_acumulado: string;
  valor_acumulado: string;
}

export interface PrecatorioResultado {
  segmentos: PrecatorioSegmento[];
  valor_final: string;
  total_correcao: string;
  total_juros: string;
}

// Marcos constitucionais (aprox.)
const EC_113 = '2021-12-01';
const EC_136 = '2025-07-01';

function toYM(iso: string): string {
  return iso.slice(0, 7);
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

/**
 * Lista meses (YYYY-MM) entre dois marcos ISO [inicio, fim).
 * O mês de inicio é incluso; o mês de fim é excluso (meia-aberta).
 */
function mesesNoIntervalo(inicio: string, fim: string): string[] {
  if (inicio >= fim) return [];
  const out: string[] = [];
  let [ano, mes] = [Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7))];
  const ymFim = toYM(fim);
  for (let i = 0; i < 1200; i++) {
    const ym = `${ano.toString().padStart(4, '0')}-${mes.toString().padStart(2, '0')}`;
    if (ym >= ymFim) break;
    out.push(ym);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return out;
}

/**
 * Retorna anos decorridos (fracionários) entre duas datas ISO.
 */
function anosEntre(inicio: string, fim: string): Decimal {
  const d1 = new Date(inicio + 'T00:00:00Z').getTime();
  const d2 = new Date(fim + 'T00:00:00Z').getTime();
  const diasMs = 1000 * 60 * 60 * 24;
  const dias = (d2 - d1) / diasMs;
  return new Decimal(dias).dividedBy(365.25);
}

/**
 * Fator IPCA-E acumulado entre início (inclusivo) e fim (exclusivo).
 * Usa IPCA_E_ACUMULADO (base 100 @ 2014-12).
 * Para datas fora da tabela, faz fallback para 1 (nenhuma correção).
 */
function fatorIPCA(inicio: string, fim: string): Decimal {
  const ymIni = toYM(inicio);
  const ymFim = toYM(fim);
  const base = IPCA_E_ACUMULADO[ymIni];
  const topo = IPCA_E_ACUMULADO[ymFim];
  if (base === undefined || topo === undefined || base === 0) {
    return new Decimal(1);
  }
  return new Decimal(topo).dividedBy(base);
}

/**
 * Soma simples das taxas SELIC mensais % no intervalo [inicio, fim).
 * Retorna o fator (1 + soma/100).
 */
function fatorSELIC(inicio: string, fim: string): Decimal {
  const meses = mesesNoIntervalo(inicio, fim);
  let soma = new Decimal(0);
  for (const ym of meses) {
    const taxa = SELIC_MENSAL[ym];
    if (taxa !== undefined) {
      soma = soma.plus(taxa);
    }
  }
  return new Decimal(1).plus(soma.dividedBy(100));
}

/**
 * Produto dos fatores (1 + TR_mensal) em [inicio, fim).
 */
function fatorTR(inicio: string, fim: string): Decimal {
  const meses = mesesNoIntervalo(inicio, fim);
  let fator = new Decimal(1);
  for (const ym of meses) {
    const taxa = TR_MENSAL[ym];
    if (taxa !== undefined && taxa > 0) {
      fator = fator.times(new Decimal(1).plus(new Decimal(taxa).dividedBy(100)));
    }
  }
  return fator;
}

/**
 * Juros compostos anuais: (1 + taxa) ^ anos.
 */
function jurosCompostoAnual(taxaAnual: Decimal, anos: Decimal): Decimal {
  return new Decimal(1).plus(taxaAnual).pow(anos);
}

function calcularFatorSegmento(
  regime: RegimePrecatorio,
  inicio: string,
  fim: string,
): Decimal {
  if (inicio >= fim) return new Decimal(1);
  const anos = anosEntre(inicio, fim);
  switch (regime) {
    case 'TR_6': {
      const tr = fatorTR(inicio, fim);
      const j6 = jurosCompostoAnual(new Decimal('0.06'), anos);
      return tr.times(j6);
    }
    case 'SELIC':
      return fatorSELIC(inicio, fim);
    case 'IPCA_2': {
      const ipca = fatorIPCA(inicio, fim);
      const j2 = jurosCompostoAnual(new Decimal('0.02'), anos);
      return ipca.times(j2);
    }
    case 'SEM_CORRECAO':
    default:
      return new Decimal(1);
  }
}

/**
 * Monta a lista de segmentos temporais dada expedição/atualização/tipo.
 *
 * Para FEDERAL aplica-se a transição completa TR_6 → SELIC → IPCA_2.
 * Para ESTADUAL/MUNICIPAL a EC 136 não se aplica; SELIC prossegue após EC 136.
 */
function montarSegmentos(
  expedicao: string,
  atualizacao: string,
  tipo: PrecatorioInput['tipo'],
): Array<{ regime: RegimePrecatorio; inicio: string; fim: string }> {
  const segs: Array<{ regime: RegimePrecatorio; inicio: string; fim: string }> = [];
  if (atualizacao <= expedicao) return segs;

  const cutEC113 = maxDate(expedicao, EC_113);
  const cutEC136 = maxDate(expedicao, EC_136);

  // Segmento 1: TR_6 — de expedição até min(EC_113, atualização)
  if (expedicao < EC_113) {
    const fim = minDate(EC_113, atualizacao);
    if (fim > expedicao) {
      segs.push({ regime: 'TR_6', inicio: expedicao, fim });
    }
  }

  // Segmento 2: SELIC — de cutEC113 até:
  //   - FEDERAL: min(EC_136, atualização)
  //   - ESTADUAL/MUNICIPAL: atualização (EC 136 não se aplica)
  const inicioSelic = maxDate(expedicao, EC_113);
  if (inicioSelic < atualizacao) {
    const fimSelic =
      tipo === 'FEDERAL' ? minDate(EC_136, atualizacao) : atualizacao;
    if (fimSelic > inicioSelic) {
      segs.push({ regime: 'SELIC', inicio: inicioSelic, fim: fimSelic });
    }
  }

  // Segmento 3: IPCA_2 — apenas FEDERAL, de cutEC136 até atualização
  if (tipo === 'FEDERAL') {
    const inicioIpca = maxDate(expedicao, EC_136);
    if (inicioIpca < atualizacao) {
      segs.push({ regime: 'IPCA_2', inicio: inicioIpca, fim: atualizacao });
    }
  }

  // Silence unused-var warning
  void cutEC113;
  void cutEC136;

  return segs;
}

/**
 * Atualiza um precatório aplicando a regência temporal correta.
 */
export function atualizarPrecatorio(input: PrecatorioInput): PrecatorioResultado {
  const { valor_base, data_expedicao, data_atualizacao, tipo } = input;

  if (!Number.isFinite(valor_base)) {
    throw new Error('valor_base deve ser finito');
  }
  if (data_atualizacao < data_expedicao) {
    throw new Error('data_atualizacao não pode ser anterior a data_expedicao');
  }

  const valorBaseDec = new Decimal(valor_base);
  const segmentosDef = montarSegmentos(data_expedicao, data_atualizacao, tipo);

  // Caso degenerado: expedição == atualização → único segmento fator=1
  if (segmentosDef.length === 0) {
    const seg: PrecatorioSegmento = {
      regime: 'SEM_CORRECAO',
      data_inicio: data_expedicao,
      data_fim: data_atualizacao,
      fator_acumulado: '1',
      valor_acumulado: valorBaseDec.toFixed(2),
    };
    return {
      segmentos: [seg],
      valor_final: valorBaseDec.toFixed(2),
      total_correcao: '0.00',
      total_juros: '0.00',
    };
  }

  const segmentos: PrecatorioSegmento[] = [];
  let valorCorrente = valorBaseDec;
  let totalCorrecao = new Decimal(0);
  let totalJuros = new Decimal(0);

  for (const def of segmentosDef) {
    const fator = calcularFatorSegmento(def.regime, def.inicio, def.fim);
    const valorAntes = valorCorrente;
    const valorDepois = valorAntes.times(fator);
    const delta = valorDepois.minus(valorAntes);

    // Separação aproximada correção vs juros por regime
    if (def.regime === 'TR_6') {
      const fatorTr = fatorTR(def.inicio, def.fim);
      const correcao = valorAntes.times(fatorTr).minus(valorAntes);
      totalCorrecao = totalCorrecao.plus(correcao);
      totalJuros = totalJuros.plus(delta.minus(correcao));
    } else if (def.regime === 'IPCA_2') {
      const fatorIp = fatorIPCA(def.inicio, def.fim);
      const correcao = valorAntes.times(fatorIp).minus(valorAntes);
      totalCorrecao = totalCorrecao.plus(correcao);
      totalJuros = totalJuros.plus(delta.minus(correcao));
    } else if (def.regime === 'SELIC') {
      // SELIC engloba correção e juros — classifica como juros (padrão PJe-Calc)
      totalJuros = totalJuros.plus(delta);
    }

    segmentos.push({
      regime: def.regime,
      data_inicio: def.inicio,
      data_fim: def.fim,
      fator_acumulado: fator.toFixed(10),
      valor_acumulado: valorDepois.toFixed(2),
    });

    valorCorrente = valorDepois;
  }

  return {
    segmentos,
    valor_final: valorCorrente.toFixed(2),
    total_correcao: totalCorrecao.toFixed(2),
    total_juros: totalJuros.toFixed(2),
  };
}
