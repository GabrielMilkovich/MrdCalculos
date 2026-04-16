/**
 * Parity Impact Test — Mede o EFEITO numérico das 8 correções aplicadas
 *
 * Cenário sintético "Rescisão Plurianual com SELIC alta":
 * - Empregado admitido 2020-01-01, demitido 2023-12-31 (4 anos completos)
 * - Salário R$ 5.500,00/mês (informado)
 * - Verba: HE 50% (10h/mês) — 48 meses (2020-01 a 2023-12)
 * - Ajuizamento: 2024-01-01, Liquidação: 2026-02-28
 * - Período de juros longo (~26 meses) com SELIC alta (2022-2025)
 *
 * Mede dois cenários:
 *   A. DEFAULTS — opt-ins desligados (apenas correções incondicionais ativas)
 *   B. FULL OPT-IN — todas as 4 flags do roadmap ativadas:
 *      - selic_pro_rata_die
 *      - base_de_juros_das_verbas = VERBA_INSS
 *      - com_correcao_trabalhista
 *      - atualizar_inss_selic
 *
 * Reporta liquido, juros, INSS — e mostra a SOMA SIMPLES SELIC sendo aplicada.
 */
import { describe, it, expect } from 'vitest';
import {
  createEngine, makeVerba, makeHistoricoWithOcorrencias,
} from './helpers';
import { SELIC_MENSAL } from '../indices-fallback';
import { IPCA_E_ACUMULADO } from '../indices-fallback';
import type { PjeIndiceRow } from '../engine-types';

// Constrói indicesDB completo a partir dos fallbacks RFB/IBGE (SELIC + IPCA-E)
function buildIndicesDB(): PjeIndiceRow[] {
  const rows: PjeIndiceRow[] = [];
  // SELIC
  let acum = 100;
  for (const [comp, valor] of Object.entries(SELIC_MENSAL).sort()) {
    acum *= 1 + valor / 100;
    rows.push({ indice: 'SELIC', competencia: comp + '-01', valor, acumulado: acum });
  }
  // IPCA-E
  for (const [comp, ac] of Object.entries(IPCA_E_ACUMULADO).sort()) {
    rows.push({ indice: 'IPCA-E', competencia: comp + '-01', valor: 0, acumulado: ac });
  }
  return rows;
}

const COMPETENCIAS_48: string[] = [];
for (let y = 2020; y <= 2023; y++) {
  for (let m = 1; m <= 12; m++) {
    COMPETENCIAS_48.push(`${y}-${String(m).padStart(2, '0')}`);
  }
}

interface Cenario {
  liquido: number;
  juros: number;
  cs_segurado: number;
  ir: number;
  fgts_total: number;
}

function rodar(opts: {
  selic_pro_rata_die?: boolean;
  base_de_juros_das_verbas?: string;
  com_correcao_trabalhista?: boolean;
  atualizar_inss_selic?: boolean;
}): Cenario {
  const hist = makeHistoricoWithOcorrencias(5500, COMPETENCIAS_48);
  const verba = makeVerba({
    base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
    divisor_informado: 220,
    multiplicador: 1.5,
    quantidade_informada: 10,
    tipo_quantidade: 'informada',
    periodo_inicio: '2020-01-01',
    periodo_fim: '2023-12-31',
    incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
  });

  const indicesDB = buildIndicesDB();

  const engine = createEngine({
    historicos: [hist],
    verbas: [verba],
    params: {
      data_admissao: '2020-01-01',
      data_demissao: '2023-12-31',
      data_ajuizamento: '2024-01-01',
      data_citacao: '2024-02-01',
      modo_calculo: 'independent' as const,
    },
    fgtsConfig: {
      apurar: true, destino: 'pagar_reclamante', compor_principal: false,
      multa_apurar: true, multa_tipo: 'calculada', multa_percentual: 40, multa_base: 'devido',
      saldos_saques: [], deduzir_saldo: false, lc110_10: false, lc110_05: false,
    },
    csConfig: {
      apurar_segurado: true, cobrar_reclamante: true, cs_sobre_salarios_pagos: false,
      aliquota_segurado_tipo: 'empregado', limitar_teto: true,
      apurar_empresa: true, apurar_sat: true, apurar_terceiros: true,
      aliquota_empregador_tipo: 'fixa', aliquota_empresa_fixa: 20,
      aliquota_sat_fixa: 2, aliquota_terceiros_fixa: 5.8,
      periodos_simples: [],
      com_correcao_trabalhista: opts.com_correcao_trabalhista,
      atualizar_inss_selic: opts.atualizar_inss_selic,
    },
    irConfig: {
      apurar: true, incidir_sobre_juros: false, cobrar_reclamado: false,
      tributacao_exclusiva_13: false, tributacao_separada_ferias: false,
      deduzir_cs: true, deduzir_prev_privada: false, deduzir_pensao: false,
      deduzir_honorarios: false, aposentado_65: false, dependentes: 0,
    },
    correcaoConfig: {
      indice: 'IPCA-E',
      epoca: 'mensal',
      juros_tipo: 'simples_mensal',
      juros_percentual: 1,
      juros_inicio: 'ajuizamento',
      multa_523: false,
      multa_523_percentual: 10,
      data_liquidacao: '2026-02-28',
      selic_pro_rata_die: opts.selic_pro_rata_die,
      base_de_juros_das_verbas: opts.base_de_juros_das_verbas,
    },
    indicesDB,
  });

  const r = engine.liquidar();
  return {
    liquido: r.resumo.liquido_reclamante,
    juros: r.resumo.juros_mora,
    cs_segurado: r.resumo.cs_segurado,
    ir: r.resumo.ir_retido,
    fgts_total: r.resumo.fgts_total,
  };
}

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

describe('Parity Impact — Efeito numérico das 8 correções', () => {
  it('compara DEFAULTS vs FULL OPT-IN num cenário plurianual com SELIC alta', () => {
    const A = rodar({});
    const B = rodar({
      selic_pro_rata_die: true,
      base_de_juros_das_verbas: 'VERBA_INSS',
      com_correcao_trabalhista: true,
      atualizar_inss_selic: true,
    });

    const linha = (rotulo: string, a: number, b: number) => {
      const delta = b - a;
      const pct = a !== 0 ? (delta / a) * 100 : 0;
      return `  ${rotulo.padEnd(18)} | A: R$ ${fmt(a).padStart(14)} | B: R$ ${fmt(b).padStart(14)} | Δ ${(pct >= 0 ? '+' : '')}${pct.toFixed(2)}%`;
    };

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    console.log('PARITY IMPACT — Cenário: rescisão plurianual 2020-01..2023-12 (HE 50%, R$ 5.500/mês)');
    console.log('              Liquidação 2026-02-28, SELIC alta (juros ~26 meses)');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    console.log(linha('Líquido', A.liquido, B.liquido));
    console.log(linha('Juros mora', A.juros, B.juros));
    console.log(linha('INSS segurado', A.cs_segurado, B.cs_segurado));
    console.log(linha('IR retido', A.ir, B.ir));
    console.log(linha('FGTS total', A.fgts_total, B.fgts_total));
    console.log('───────────────────────────────────────────────────────────────────────────────────────');
    console.log('  A = DEFAULTS  (correções incondicionais: SELIC simples + FGTS TR mensal)');
    console.log('  B = FULL OPT-IN (A + selic_pro_rata_die + VERBA_INSS + com_correcao_trabalhista');
    console.log('                  + atualizar_inss_selic)');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    console.log('');

    // Asserções de sanidade — não fixamos valores absolutos, mas garantimos
    // que as correções produzem efeitos esperados na direção certa:
    // - INSS sobe (correção trabalhista + SELIC update)
    expect(B.cs_segurado).toBeGreaterThan(A.cs_segurado);
    // - Juros caem (VERBA_INSS reduz a base de juros)
    expect(B.juros).toBeLessThan(A.juros);
    // - Líquido também cai (mais INSS retido + menos juros pagos)
    expect(B.liquido).toBeLessThan(A.liquido);
    // - FGTS é igual (não afetado por nenhum dos opt-ins)
    expect(B.fgts_total).toBeCloseTo(A.fgts_total, 2);
  });

  it('valida que SELIC simples produz juros DIFERENTE de SELIC composta (ratio acumulado)', () => {
    // Cenário direto: 1 ocorrência R$ 1.000 em 2022-01, juros SELIC até 2025-12 (4 anos).
    // Soma simples (RFB) das taxas mensais 2022-01..2025-11 = ~50%
    // Composta (ratio de acumulados) = ~60% → diferença real e mensurável.

    const hist = makeHistoricoWithOcorrencias(1000, ['2022-01']);
    const verba = makeVerba({
      base_calculo: { historicos: ['hist-001'], verbas: [], tabelas: [], proporcionalizar: false, integralizar: false },
      divisor_informado: 1, multiplicador: 1, quantidade_informada: 1,
      tipo_quantidade: 'informada',
      periodo_inicio: '2022-01-01', periodo_fim: '2022-01-31',
      incidencias: { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false },
    });

    const indicesDB = buildIndicesDB();

    const engine = createEngine({
      historicos: [hist], verbas: [verba],
      params: { data_ajuizamento: '2022-01-01', data_citacao: '2022-01-01' },
      fgtsConfig: { apurar: false, destino: 'pagar_reclamante', compor_principal: false, multa_apurar: false, multa_tipo: 'calculada', multa_percentual: 0, multa_base: 'devido', saldos_saques: [], deduzir_saldo: false, lc110_10: false, lc110_05: false },
      csConfig: { apurar_segurado: false, cobrar_reclamante: false, cs_sobre_salarios_pagos: false, aliquota_segurado_tipo: 'empregado', limitar_teto: true, apurar_empresa: false, apurar_sat: false, apurar_terceiros: false, aliquota_empregador_tipo: 'fixa', aliquota_empresa_fixa: 20, periodos_simples: [] },
      irConfig: { apurar: false, incidir_sobre_juros: false, cobrar_reclamado: false, tributacao_exclusiva_13: false, tributacao_separada_ferias: false, deduzir_cs: true, deduzir_prev_privada: false, deduzir_pensao: false, deduzir_honorarios: false, aposentado_65: false, dependentes: 0 },
      correcaoConfig: {
        indice: 'COMBINACAO',
        combinacoes_indice: [{ de: '2010-01-01', ate: '2099-12-31', indice: 'SEM_CORRECAO' }],
        combinacoes_juros: [{ de: '2010-01-01', ate: '2099-12-31', tipo: 'SELIC' }],
        juros_tipo: 'simples_mensal', juros_percentual: 1, juros_inicio: 'ajuizamento',
        data_liquidacao: '2025-12-31',
      },
      indicesDB,
    });

    // Soma simples manual — Súmula 381 TST: juros começam no mês SUBSEQUENTE
    // ao da prestação. Ocorrência 2022-01 → juros desde 2022-02.
    // Combinação por data: realStart = max(jurosStart=2022-01-01, segInicio=2022-02-01) = 2022-02
    // segFim = dataLiq = 2025-12-31 → competências < 2025-12 = até 2025-11.
    let somaSimples = 0;
    for (const [k, v] of Object.entries(SELIC_MENSAL)) {
      if (k >= '2022-02' && k <= '2025-11') somaSimples += v;
    }
    const jurosEsperadoSimples = 1000 * somaSimples / 100;

    // Soma COMPOSTA (o que o algoritmo antigo de razão de acumulados produziria)
    let somaComposta = 1;
    for (const [k, v] of Object.entries(SELIC_MENSAL)) {
      if (k >= '2022-02' && k <= '2025-11') somaComposta *= 1 + v / 100;
    }
    const jurosEsperadoComposta = 1000 * (somaComposta - 1);

    const r = engine.liquidar();
    const jurosObtidos = r.resumo.juros_mora;

    console.log('');
    console.log('  ═══ Validação SELIC SIMPLES (Súmula 121 STF + Súmula 381 TST) ═══');
    console.log(`  SELIC simples 2022-02→2025-11: ${somaSimples.toFixed(4)}%`);
    console.log(`  Juros esperado (SIMPLES RFB):  R$ ${fmt(jurosEsperadoSimples)}`);
    console.log(`  Juros se fosse COMPOSTA:       R$ ${fmt(jurosEsperadoComposta)}`);
    console.log(`  Juros obtidos pelo engine:     R$ ${fmt(jurosObtidos)}`);
    console.log(`  Delta vs simples:              R$ ${fmt(Math.abs(jurosObtidos - jurosEsperadoSimples))} (${((jurosObtidos - jurosEsperadoSimples) / jurosEsperadoSimples * 100).toFixed(4)}%)`);
    console.log(`  Delta vs composta:             R$ ${fmt(Math.abs(jurosObtidos - jurosEsperadoComposta))} (${((jurosObtidos - jurosEsperadoComposta) / jurosEsperadoComposta * 100).toFixed(4)}%)`);
    console.log('');

    // O engine deve estar dentro de 0.01% do valor esperado pela soma simples
    expect(Math.abs(jurosObtidos - jurosEsperadoSimples) / jurosEsperadoSimples).toBeLessThan(0.0001);
    // E deve estar SIGNIFICATIVAMENTE distante da composta (prova que aplicamos simples)
    expect(Math.abs(jurosObtidos - jurosEsperadoComposta) / jurosEsperadoComposta).toBeGreaterThan(0.05);
  });
});
