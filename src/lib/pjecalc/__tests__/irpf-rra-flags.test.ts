/**
 * irpf-rra-flags — Sprint 4.2-A1
 *
 * Testa as 4 flags RRA do IrpfModuloAdapter:
 *   1. apurar_rra ON com 1 mês → método art_12a_rra (forçado)
 *   2. apurar_rra OFF com 60 meses → método tabela_mensal (forçado, IR maior)
 *   3. aplicar_regime_caixa ON → IR maior (sem divisão RRA, tudo na liquidação)
 *   4. incidir_sobre_principal_tributavel=false → IR menor (exclui verbas com IRPF=true)
 *
 * Legais:
 *   - Art. 12-A Lei 7.713/88: RRA aplica-se a rendimentos recebidos acumuladamente
 *   - IN RFB 1.500/2014 art. 36: regime de caixa — tributação no momento do pagamento
 *   - Lei 7.713/88 art. 43: incidência sobre rendimentos tributáveis apenas
 */
import { describe, it, expect } from 'vitest';
import { createEngine, makeVerba, makeParams, makeIrConfig } from './helpers';

// Verbas com 1 única competência → NM = 1
const verbas1Mes = () => [
  makeVerba({
    id: 'v1',
    nome: 'Hora Extra 50%',
    caracteristica: 'comum',
    periodo_inicio: '2024-01-01',
    periodo_fim: '2024-01-31',
    incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false },
    ocorrencias_precomputadas: [{
      competencia: '2024-01',
      base: 8000, divisor: 1, multiplicador: 1, quantidade: 1, dobra: false,
      devido: 8000, pago: 0,
    }],
  }),
];

// Verbas com 60 competências → NM = 60 (auto-detecção RRA)
const verbas60Meses = () => {
  const ocs = Array.from({ length: 60 }, (_, i) => {
    const year = 2019 + Math.floor(i / 12);
    const month = (i % 12) + 1;
    return {
      competencia: `${year}-${String(month).padStart(2, '0')}`,
      base: 3000, divisor: 1, multiplicador: 1, quantidade: 1, dobra: false,
      devido: 3000, pago: 0,
    };
  });
  return [
    makeVerba({
      id: 'v1',
      nome: 'Hora Extra 50%',
      caracteristica: 'comum',
      periodo_inicio: '2019-01-01',
      periodo_fim: '2023-12-31',
      incidencias: { fgts: false, irpf: true, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false },
      ocorrencias_precomputadas: ocs,
    }),
  ];
};

// Parâmetros base para teste com período longo (60 meses)
const params60 = () => makeParams({
  data_admissao: '2019-01-01',
  data_demissao: '2023-12-31',
  data_ajuizamento: '2024-01-10',
  data_citacao: '2024-02-01',
});

// Parâmetros base para teste com período curto (1 mês)
const params1 = () => makeParams({
  data_admissao: '2024-01-01',
  data_demissao: '2024-01-31',
  data_ajuizamento: '2024-02-01',
  data_citacao: '2024-02-15',
});

describe('IrpfModuloAdapter — flags RRA (Sprint 4.2-A1)', () => {
  /**
   * Teste 1: apurar_rra=true com NM=1 → força método art_12a_rra
   * Ref: Lei 7.713/88 art. 12-A — UI pode forçar RRA mesmo em 1 mês
   */
  it('apurar_rra=true com 1 mês → metodo=art_12a_rra (forçado)', () => {
    const engineOn = createEngine({
      params: params1(),
      verbas: verbas1Mes(),
      irConfig: makeIrConfig({
        apurar: true,
        deduzir_cs: false,
        dependentes: 0,
        apurar_rra: true,  // forçar RRA
      }),
    });
    const resultOn = engineOn.liquidar();
    expect(resultOn.imposto_renda.metodo).toBe('art_12a_rra');
    expect(resultOn.imposto_renda.meses_rra).toBeGreaterThanOrEqual(1);
  });

  /**
   * Teste 2: apurar_rra=false com 60 meses → força tabela_mensal + IR maior
   * Sem RRA, toda a base é tributada de uma vez → alíquota efetiva maior.
   * Ref: Lei 7.713/88 art. 12-A (a contrario) — sem RRA, tabela progressiva direta
   */
  it('apurar_rra=false com 60 meses → metodo=tabela_mensal e IR maior do que com RRA', () => {
    // Auto-detect: deve usar RRA (NM=60 > 1)
    const engineAuto = createEngine({
      params: params60(),
      verbas: verbas60Meses(),
      irConfig: makeIrConfig({
        apurar: true,
        deduzir_cs: false,
        dependentes: 0,
        apurar_rra: undefined, // auto → art_12a_rra (NM=60)
      }),
    });
    const resultAuto = engineAuto.liquidar();

    // Com apurar_rra=false: tabela_mensal → IR maior (sem spread por meses)
    const engineOff = createEngine({
      params: params60(),
      verbas: verbas60Meses(),
      irConfig: makeIrConfig({
        apurar: true,
        deduzir_cs: false,
        dependentes: 0,
        apurar_rra: false, // forçar tabela mensal
      }),
    });
    const resultOff = engineOff.liquidar();

    expect(resultAuto.imposto_renda.metodo).toBe('art_12a_rra');
    expect(resultOff.imposto_renda.metodo).toBe('tabela_mensal');
    // Sem RRA (tabela direta), IR deve ser maior porque toda base numa faixa alta
    expect(resultOff.imposto_renda.imposto_devido).toBeGreaterThan(resultAuto.imposto_renda.imposto_devido);
  });

  /**
   * Teste 3: aplicar_regime_caixa=true → IR maior (tabela_mensal, sem spread)
   * Ref: IN RFB 1.500/2014 art. 36 — regime de caixa tributa tudo no pagamento
   */
  it('aplicar_regime_caixa=true → metodo=tabela_mensal e IR maior (sem divisão RRA)', () => {
    // Regime de competência (default): RRA ativo → IR menor
    const engineComp = createEngine({
      params: params60(),
      verbas: verbas60Meses(),
      irConfig: makeIrConfig({
        apurar: true,
        deduzir_cs: false,
        dependentes: 0,
        regime_caixa: false, // regime de competência
      }),
    });
    const resultComp = engineComp.liquidar();

    // Regime de caixa: NM=1 → tabela simples → IR maior
    const engineCaixa = createEngine({
      params: params60(),
      verbas: verbas60Meses(),
      irConfig: makeIrConfig({
        apurar: true,
        deduzir_cs: false,
        dependentes: 0,
        regime_caixa: true, // tributar tudo na liquidação
      }),
    });
    const resultCaixa = engineCaixa.liquidar();

    expect(resultComp.imposto_renda.metodo).toBe('art_12a_rra');
    expect(resultCaixa.imposto_renda.metodo).toBe('tabela_mensal');
    expect(resultCaixa.imposto_renda.imposto_devido).toBeGreaterThan(resultComp.imposto_renda.imposto_devido);
  });

  /**
   * Teste 4: incidir_sobre_principal_tributavel=false → IR menor (exclui verbas IRPF=true)
   * Ref: Lei 7.713/88 art. 43 — IR incide apenas sobre rendimentos tributáveis
   * Quando flag=false, verbas marcadas como tributáveis são excluídas da base.
   */
  it('incidir_sobre_principal_tributavel=false → base IR = 0 (verbas irpf=true excluídas)', () => {
    // Normal: verbas com irpf=true incluídas na base → IR > 0
    // apurar_rra=true força NM=cardinalidade dos sets (não span+stretch),
    // garantindo que NM=1 com 1 mês de verba e IR > 0.
    const engineOn = createEngine({
      params: params1(),
      verbas: verbas1Mes(), // irpf=true
      irConfig: makeIrConfig({
        apurar: true,
        apurar_rra: true,
        deduzir_cs: false,
        dependentes: 0,
        incidir_sobre_principal_tributavel: true, // default
        incidir_sobre_principal_nao_tributavel: false,
      }),
    });
    const resultOn = engineOn.liquidar();

    // Com flag=false: verbas irpf=true são excluídas → base IR = 0, IR = 0
    const engineOff = createEngine({
      params: params1(),
      verbas: verbas1Mes(), // irpf=true, mas será excluída
      irConfig: makeIrConfig({
        apurar: true,
        apurar_rra: true,
        deduzir_cs: false,
        dependentes: 0,
        incidir_sobre_principal_tributavel: false, // excluir tributáveis
        incidir_sobre_principal_nao_tributavel: false,
      }),
    });
    const resultOff = engineOff.liquidar();

    expect(resultOn.imposto_renda.imposto_devido).toBeGreaterThan(0);
    expect(resultOff.imposto_renda.imposto_devido).toBe(0);
    expect(resultOff.imposto_renda.base_calculo).toBe(0);
  });
});
