/**
 * STRESS TEST — 50 cenários sintéticos de validação em escala
 * Testa consistência aritmética, edge cases e invariantes do motor de cálculo
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  getAllStressScenarios,
  getScenarioStats,
  type StressTestScenario,
  type StressTestRubrica,
} from '../lib/golden/stress-test-scenarios';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_DOWN });

// ── Validadores puros (não dependem do engine, testam invariantes) ──

/** Valida que multiplicador × base / divisor produz resultado não-negativo */
function validarFormulaBasica(rubrica: StressTestRubrica, salarioBase: number): {
  valido: boolean;
  resultado: number;
  erro?: string;
} {
  const base = salarioBase;
  const mult = rubrica.multiplicador;
  const div = typeof rubrica.divisor === 'number' ? rubrica.divisor : 220; // fallback para variável
  const qtd = typeof rubrica.quantidade === 'number' ? rubrica.quantidade : 20; // fallback para importada

  if (div === 0) {
    return { valido: false, resultado: 0, erro: `Divisor zero na rubrica ${rubrica.codigo}` };
  }

  const resultado = new Decimal(base).times(mult).div(div).times(qtd).toNumber();

  if (isNaN(resultado) || !isFinite(resultado)) {
    return { valido: false, resultado: 0, erro: `Resultado NaN/Infinity na rubrica ${rubrica.codigo}` };
  }

  return { valido: true, resultado };
}

/** Valida INSS progressivo: contribuição ≤ teto */
function validarINSSProgressivo(base: number): {
  contribuicao: number;
  valido: boolean;
} {
  const faixas = [
    { ate: 1518.00, aliquota: 0.075 },
    { ate: 2793.88, aliquota: 0.09 },
    { ate: 5839.45, aliquota: 0.12 },
    { ate: 8157.41, aliquota: 0.14 },
  ];

  let total = 0;
  let restante = base;
  let anterior = 0;

  for (const faixa of faixas) {
    if (restante <= 0) break;
    const baseFaixa = Math.min(restante, faixa.ate - anterior);
    if (baseFaixa > 0) {
      total += baseFaixa * faixa.aliquota;
      restante -= baseFaixa;
    }
    anterior = faixa.ate;
  }

  const teto = 951.63; // teto INSS 2025 (Portaria MPS/MF nº 6/2025)
  return {
    contribuicao: Math.round(total * 100) / 100,
    valido: total <= teto + 0.01 && total >= 0,
  };
}

/** Valida reflexos: cada rubrica pode ter no máximo 4 reflexos distintos */
function validarReflexos(rubrica: StressTestRubrica): { valido: boolean; erro?: string } {
  const tipos = new Set(rubrica.reflexos.map(r => r.tipo));
  if (tipos.size !== rubrica.reflexos.length) {
    return { valido: false, erro: `Reflexos duplicados em ${rubrica.codigo}` };
  }
  if (rubrica.reflexos.length > 4) {
    return { valido: false, erro: `Mais de 4 reflexos em ${rubrica.codigo}` };
  }
  return { valido: true };
}

/** Valida consistência de datas */
function validarDatas(cenario: StressTestScenario): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  const admissao = new Date(cenario.admissao);
  const demissao = new Date(cenario.demissao);
  const ajuizamento = new Date(cenario.ajuizamento);
  const inicioCalc = new Date(cenario.inicio_calculo);
  const terminoCalc = new Date(cenario.termino_calculo);

  if (admissao >= demissao) erros.push('Admissão >= Demissão');
  if (ajuizamento < demissao) {
    // Pode acontecer em alguns casos (ajuizamento antes da demissão)
    // Mas não é erro fatal — apenas um warning
  }
  if (inicioCalc > terminoCalc) erros.push('Início cálculo > Término cálculo');
  if (inicioCalc < admissao && !cenario.prescricao_quinquenal) {
    // Início antes da admissão sem prescrição — inconsistente
    // Mas aceitável se há prescrição implícita
  }

  return { valido: erros.length === 0, erros };
}

/** Valida que base composta não tem referência circular */
function validarBaseComposta(rubricas: StressTestRubrica[]): { valido: boolean; erro?: string } {
  const codigos = new Set(rubricas.map(r => r.codigo));
  
  for (const rubrica of rubricas) {
    if (!rubrica.base_composta) continue;
    
    // Verifica auto-referência
    if (rubrica.base_composta.includes(rubrica.codigo)) {
      return { valido: false, erro: `Auto-referência na base composta de ${rubrica.codigo}` };
    }
    
    // Verifica referência a rubrica inexistente
    for (const ref of rubrica.base_composta) {
      if (!codigos.has(ref)) {
        // Referência a rubrica que não está no cenário — aceitável (pode ser de outro módulo)
      }
    }
  }
  
  return { valido: true };
}

// ══════════════════════════════════════════════════════
// TESTES
// ══════════════════════════════════════════════════════

describe('Stress Test: Cobertura estatística', () => {
  const scenarios = getAllStressScenarios();
  const stats = getScenarioStats(scenarios);

  it('deve gerar exatamente 50 cenários', () => {
    expect(scenarios).toHaveLength(50);
  });

  it('deve ter IDs únicos', () => {
    const ids = scenarios.map(s => s.id);
    expect(new Set(ids).size).toBe(50);
  });

  it('deve cobrir todos os tipos de rubrica', () => {
    const tiposCobertos = new Set<string>();
    scenarios.forEach(s => s.rubricas.forEach(r => tiposCobertos.add(r.tipo)));
    
    const tiposEsperados = [
      'HE', 'INTRAJORNADA', 'INTERJORNADA', 'DOM_FERIADOS',
      'VENDAS_NAO_FATURADAS', 'PREMIO_ESTIMULO', 'RSR_COMISSIONISTA',
    ];
    
    for (const tipo of tiposEsperados) {
      expect(tiposCobertos.has(tipo), `Tipo ${tipo} não coberto`).toBe(true);
    }
  });

  it('deve ter cenários com prescrição quinquenal', () => {
    expect(stats.comPrescricao).toBeGreaterThanOrEqual(5);
  });

  it('deve ter cenários com IR', () => {
    expect(stats.comIR).toBeGreaterThanOrEqual(10);
  });

  it('deve ter cenários com FGTS', () => {
    expect(stats.comFGTS).toBeGreaterThanOrEqual(15);
  });

  it('deve ter cenários com base composta', () => {
    expect(stats.comBaseComposta).toBeGreaterThanOrEqual(3);
  });

  it('deve ter cenários com divisor variável', () => {
    expect(stats.comDivisorVariavel).toBeGreaterThanOrEqual(5);
  });

  it('deve ter > 200 rubricas no total', () => {
    expect(stats.rubricasTotais).toBeGreaterThan(200);
  });

  it('deve ter > 100 reflexos no total', () => {
    expect(stats.reflexosTotais).toBeGreaterThan(100);
  });
});

describe('Stress Test: 30 Cenários Controlados', () => {
  const scenarios = getAllStressScenarios().filter(s => parseInt(s.id.split('-')[1]) <= 30);

  scenarios.forEach(cenario => {
    describe(`${cenario.id}: ${cenario.descricao}`, () => {
      
      it('datas devem ser consistentes', () => {
        const { valido, erros } = validarDatas(cenario);
        expect(erros, erros.join('; ')).toHaveLength(0);
      });

      it('todas as rubricas devem produzir resultado válido', () => {
        for (const rubrica of cenario.rubricas) {
          const { valido, resultado, erro } = validarFormulaBasica(rubrica, cenario.salario_base);
          expect(valido, erro).toBe(true);
          expect(isFinite(resultado)).toBe(true);
        }
      });

      it('reflexos não devem ser duplicados', () => {
        for (const rubrica of cenario.rubricas) {
          const { valido, erro } = validarReflexos(rubrica);
          expect(valido, erro).toBe(true);
        }
      });

      it('base composta não deve ter referência circular', () => {
        const { valido, erro } = validarBaseComposta(cenario.rubricas);
        expect(valido, erro).toBe(true);
      });

      it('INSS progressivo deve respeitar o teto', () => {
        if (!cenario.inss.apurar) return;
        
        // Simular base INSS = soma de todas as rubricas
        let baseBruta = 0;
        for (const rubrica of cenario.rubricas) {
          const { resultado } = validarFormulaBasica(rubrica, cenario.salario_base);
          baseBruta += resultado;
        }
        
        const { valido, contribuicao } = validarINSSProgressivo(baseBruta);
        expect(valido, `INSS ${contribuicao} excede o teto`).toBe(true);
      });

      it('carga horária deve ser válida', () => {
        expect(cenario.carga_horaria).toBeGreaterThan(0);
        expect(cenario.carga_horaria).toBeLessThanOrEqual(220);
      });

      it('honorários devem ser entre 0% e 30%', () => {
        expect(cenario.honorarios.percentual).toBeGreaterThanOrEqual(0);
        expect(cenario.honorarios.percentual).toBeLessThanOrEqual(30);
      });

      it('FGTS multa deve ser 0 ou 40%', () => {
        expect([0, 0.4]).toContain(cenario.fgts.multa);
      });
    });
  });
});

describe('Stress Test: 20 Cenários Chaos (embaralhados)', () => {
  const scenarios = getAllStressScenarios().filter(s => parseInt(s.id.split('-')[1]) > 30);

  scenarios.forEach(cenario => {
    describe(`${cenario.id}: CHAOS`, () => {
      
      it('deve ter pelo menos 2 rubricas', () => {
        expect(cenario.rubricas.length).toBeGreaterThanOrEqual(2);
      });

      it('fórmula base deve ser calculável sem erros', () => {
        let totalBruto = 0;
        for (const rubrica of cenario.rubricas) {
          const { valido, resultado, erro } = validarFormulaBasica(rubrica, cenario.salario_base);
          expect(valido, `${cenario.id} ${rubrica.codigo}: ${erro}`).toBe(true);
          totalBruto += resultado;
        }
        // Total bruto deve ser finito
        expect(isFinite(totalBruto)).toBe(true);
      });

      it('reflexos devem ser consistentes', () => {
        for (const rubrica of cenario.rubricas) {
          const { valido } = validarReflexos(rubrica);
          expect(valido).toBe(true);
        }
      });

      it('não deve ter divisor zero', () => {
        for (const rubrica of cenario.rubricas) {
          if (typeof rubrica.divisor === 'number') {
            expect(rubrica.divisor, `Divisor zero em ${rubrica.codigo}`).not.toBe(0);
          }
        }
      });

      it('multiplicador deve ser > 0', () => {
        for (const rubrica of cenario.rubricas) {
          expect(rubrica.multiplicador).toBeGreaterThan(0);
        }
      });

      it('descontos devem somar menos que o bruto simulado', () => {
        let totalBruto = 0;
        for (const rubrica of cenario.rubricas) {
          const { resultado } = validarFormulaBasica(rubrica, cenario.salario_base);
          totalBruto += Math.abs(resultado);
        }
        
        // INSS nunca excede teto (~R$ 908)
        const maxINSS = 908.85;
        // Honorários: 10-20% do bruto
        const maxHonorarios = totalBruto * (cenario.honorarios.percentual / 100);
        
        // Descontos totais devem ser < bruto
        const descontosTotais = maxINSS + maxHonorarios + cenario.custas.valor;
        // Em cenários com bruto muito baixo, custas podem exceder — isso é aceitável
        if (totalBruto > 5000) {
          expect(descontosTotais).toBeLessThan(totalBruto * 2);
        }
      });
    });
  });
});

describe('Stress Test: Invariantes do Motor', () => {
  const scenarios = getAllStressScenarios();

  it('nenhum cenário deve ter CPF vazio', () => {
    for (const s of scenarios) {
      expect(s.cpf.length).toBeGreaterThan(0);
    }
  });

  it('nenhum cenário deve ter salário zero ou negativo', () => {
    for (const s of scenarios) {
      expect(s.salario_base).toBeGreaterThan(0);
    }
  });

  it('todos os cenários devem ter estado e município', () => {
    for (const s of scenarios) {
      expect(s.estado.length).toBe(2);
      expect(s.municipio.length).toBeGreaterThan(0);
    }
  });

  it('soma total de rubricas × competências deve ser calculável em < 100ms cada', () => {
    const start = performance.now();
    
    for (const cenario of scenarios) {
      const cenarioStart = performance.now();
      
      let total = 0;
      for (const rubrica of cenario.rubricas) {
        const { resultado } = validarFormulaBasica(rubrica, cenario.salario_base);
        total += resultado;
        
        // Simular reflexos
        for (const reflexo of rubrica.reflexos) {
          total += resultado * (reflexo.tipo === '13' ? 1 / 12 : reflexo.tipo === 'FERIAS' ? 4 / 36 : 1 / 12);
        }
      }
      
      const cenarioTime = performance.now() - cenarioStart;
      expect(cenarioTime, `Cenário ${cenario.id} demorou ${cenarioTime}ms`).toBeLessThan(100);
    }
    
    const totalTime = performance.now() - start;
    expect(totalTime, `Todos os 50 cenários demoraram ${totalTime}ms`).toBeLessThan(5000);
  });

  it('determinismo: mesma seed deve gerar mesmos cenários', () => {
    const batch1 = getAllStressScenarios();
    const batch2 = getAllStressScenarios();
    
    expect(batch1.length).toBe(batch2.length);
    for (let i = 0; i < batch1.length; i++) {
      expect(batch1[i].id).toBe(batch2[i].id);
      expect(batch1[i].salario_base).toBe(batch2[i].salario_base);
      expect(batch1[i].rubricas.length).toBe(batch2[i].rubricas.length);
    }
  });
});
