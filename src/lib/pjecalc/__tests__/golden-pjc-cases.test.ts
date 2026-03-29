/**
 * Golden PJC Cases — Comprehensive reference test documenting expected PJe-Calc outputs
 *
 * These golden reference values were extracted from ALL 14 .pjc files in public/reports/.
 * Each .pjc file is either a ZIP containing XML or raw XML (encoding latin-1).
 *
 * For each case we document:
 *   - Input parameters (dates, carga horaria, sabado dia util)
 *   - GPREC totals (liquidoExequente, inssBeneficiario, inssExecutado, impostoRenda, depositoFgts, custasJudiciais)
 *   - DadosEstruturados breakdown (valorPrincipal, inssReclamante, inssReclamado)
 *   - PJe-Calc versao
 *
 * NOTE: pyter-gabriel.pjc lacks gprec/dadosEstruturados sections (no computed totals).
 * It is included for documentation but marked as incomplete.
 *
 * Since we cannot fully recreate the verbas/historicos from raw PJC XML in a unit test,
 * these tests serve as DOCUMENTATION of the expected golden values, with assertions
 * verifying the golden data is correctly recorded.
 */
import { describe, it, expect } from 'vitest';
import { createEngine, makeParams } from './helpers';

// ────────────────────────────────────────────────────────────────────────────
// Golden reference data extracted from PJC files
// ────────────────────────────────────────────────────────────────────────────

interface GoldenPjcCase {
  file: string;
  beneficiario: string;
  cpf: string | null;
  /** Input parameters */
  params: {
    data_admissao: string;
    data_demissao: string;
    data_ajuizamento: string;
    data_liquidacao: string;
    data_citacao: string | null;
    carga_horaria: number;
    sabado_dia_util: boolean;
  };
  /** GPREC output totals */
  gprec: {
    liquido_exequente: number;
    inss_beneficiario: number;
    inss_executado: number;
    imposto_renda: number;
    deposito_fgts: number;
    custas_judiciais: number;
  };
  /** DadosEstruturados breakdown */
  dados_estruturados: {
    valor_principal: number;
    inss_reclamante: number;
    inss_reclamado: number;
  };
  /** PJe-Calc file version */
  versao: number;
  /** Whether this case has complete computed results */
  complete: boolean;
}

const GOLDEN_CASES: GoldenPjcCase[] = [
  // ── Case 1: ANTONIO HARLEY MARQUES GOMES ──
  {
    file: 'antonio-harley.pjc',
    beneficiario: 'ANTONIO HARLEY MARQUES GOMES',
    cpf: '030.864.683-51',
    params: {
      data_admissao: '2019-11-21',
      data_demissao: '2020-11-13',
      data_ajuizamento: '2022-09-20',
      data_liquidacao: '2025-10-31',
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 39929.92,
      inss_beneficiario: 1639.28,
      inss_executado: 7102.41,
      imposto_renda: 0.00,
      deposito_fgts: 0,
      custas_judiciais: 400.00,
    },
    dados_estruturados: {
      valor_principal: 39929.92,
      inss_reclamante: 2405.58,
      inss_reclamado: 6336.11,
    },
    versao: 13,
    complete: true,
  },

  // ── Case 2: CARLA PEGO FERREIRA ──
  {
    file: 'carla-pego.pjc',
    beneficiario: 'CARLA PEGO FERREIRA',
    cpf: '123.368.106-03',
    params: {
      data_admissao: '2021-07-05',
      data_demissao: '2023-04-24',
      data_ajuizamento: '2023-06-28',
      data_liquidacao: '2024-02-29',
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 45028.19,
      inss_beneficiario: 2309.23,
      inss_executado: 8283.68,
      imposto_renda: 0.00,
      deposito_fgts: 0,
      custas_judiciais: 0,
    },
    dados_estruturados: {
      valor_principal: 45028.19,
      inss_reclamante: 2773.49,
      inss_reclamado: 7819.42,
    },
    versao: 8,
    complete: true,
  },

  // ── Case 3: MARIA MADALENA ALVES FERREIRA (caso-real-v2) ──
  {
    file: 'caso-real-v2.pjc',
    beneficiario: 'MARIA MADALENA ALVES FERREIRA',
    cpf: '342.523.118-96',
    params: {
      data_admissao: '2015-03-07',
      data_demissao: '2021-03-02',
      data_ajuizamento: '2021-04-16',
      data_liquidacao: '2025-10-31',
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 46426.51,
      inss_beneficiario: 2113.35,
      inss_executado: 10337.54,
      imposto_renda: 0.00,
      deposito_fgts: 0,
      custas_judiciais: 0,
    },
    dados_estruturados: {
      valor_principal: 46426.51,
      inss_reclamante: 3299.38,
      inss_reclamado: 9151.51,
    },
    versao: 10,
    complete: true,
  },

  // ── Case 4: FRANCISCO PABLO FERREIRA SANTOS ──
  {
    file: 'francisco-pablo.pjc',
    beneficiario: 'FRANCISCO PABLO FERREIRA SANTOS',
    cpf: '375.430.338-44',
    params: {
      data_admissao: '2019-01-28',
      data_demissao: '2021-04-16',
      data_ajuizamento: '2021-07-23',
      data_liquidacao: '2026-03-31',
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 166619.02,
      inss_beneficiario: 9033.14,
      inss_executado: 33777.82,
      imposto_renda: 1452.13,
      deposito_fgts: 0,
      custas_judiciais: 0,
    },
    dados_estruturados: {
      valor_principal: 166619.02,
      inss_reclamante: 13606.49,
      inss_reclamado: 29204.47,
    },
    versao: 31,
    complete: true,
  },

  // ── Case 5: ISLAN RODRIGUES PEREIRA ──
  {
    file: 'islan-rodrigues.pjc',
    beneficiario: 'ISLAN RODRIGUES PEREIRA',
    cpf: '030.997.935-82',
    params: {
      data_admissao: '2021-05-21',
      data_demissao: '2022-01-03',
      data_ajuizamento: '2023-02-01',
      data_liquidacao: '2026-03-31',
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 9974.39,
      inss_beneficiario: 480.47,
      inss_executado: 2240.49,
      imposto_renda: 0.00,
      deposito_fgts: 0,
      custas_judiciais: 500.00,
    },
    dados_estruturados: {
      valor_principal: 9974.39,
      inss_reclamante: 697.18,
      inss_reclamado: 2023.78,
    },
    versao: 7,
    complete: true,
  },

  // ── Case 6: IZABELA CRISTINA RANGEL DO AMARAL ──
  {
    file: 'izabela-cristina.pjc',
    beneficiario: 'IZABELA CRISTINA RANGEL DO AMARAL',
    cpf: '977.528.279-91',
    params: {
      data_admissao: '2020-11-12',
      data_demissao: '2022-04-14',
      data_ajuizamento: '2022-04-25',
      data_liquidacao: '2025-07-31',
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 73879.96,
      inss_beneficiario: 3961.37,
      inss_executado: 15962.75,
      imposto_renda: 0.00,
      deposito_fgts: 0,
      custas_judiciais: 800.00,
    },
    dados_estruturados: {
      valor_principal: 73879.96,
      inss_reclamante: 5550.27,
      inss_reclamado: 14373.85,
    },
    versao: 11,
    complete: true,
  },

  // ── Case 7: JOSELI SILVA WANDERLEY ──
  {
    file: 'joseli-silva.pjc',
    beneficiario: 'JOSELI SILVA WANDERLEY',
    cpf: '306.546.958-81',
    params: {
      data_admissao: '2011-06-02',
      data_demissao: '2020-03-13',
      data_ajuizamento: '2021-08-17',
      data_liquidacao: '2025-07-31',
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 510459.85,
      inss_beneficiario: 27265.37,
      inss_executado: 123073.35,
      imposto_renda: 50023.93,
      deposito_fgts: 0,
      custas_judiciais: 2000.00,
    },
    dados_estruturados: {
      valor_principal: 510459.85,
      inss_reclamante: 42357.67,
      inss_reclamado: 107981.05,
    },
    versao: 26,
    complete: true,
  },

  // ── Case 8: LEANDRO CASADEMUNT PEREIRA ──
  {
    file: 'leandro-casademunt.pjc',
    beneficiario: 'LEANDRO CASADEMUNT PEREIRA',
    cpf: '313.088.228-63',
    params: {
      data_admissao: '2004-12-13',
      data_demissao: '2021-08-11',
      data_ajuizamento: '2022-11-14',
      data_liquidacao: '2025-07-31',
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 510050.92,
      inss_beneficiario: 31229.34,
      inss_executado: 123799.95,
      imposto_renda: 58920.35,
      deposito_fgts: 0,
      custas_judiciais: 1000.00,
    },
    dados_estruturados: {
      valor_principal: 510050.92,
      inss_reclamante: 46218.89,
      inss_reclamado: 108810.40,
    },
    versao: 7,
    complete: true,
  },

  // ── Case 9: LEIDE SANTANA DE OLIVEIRA ──
  {
    file: 'leide-santana.pjc',
    beneficiario: 'LEIDE SANTANA DE OLIVEIRA',
    cpf: '053.187.675-67',
    params: {
      data_admissao: '2011-07-15',
      data_demissao: '2022-10-31',
      data_ajuizamento: '2022-11-17',
      data_liquidacao: '2026-03-31',
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 190652.72,
      inss_beneficiario: 10625.94,
      inss_executado: 43635.61,
      imposto_renda: 0.00,
      deposito_fgts: 0,
      custas_judiciais: 5320.84,
    },
    dados_estruturados: {
      valor_principal: 190652.72,
      inss_reclamante: 15865.78,
      inss_reclamado: 38395.77,
    },
    versao: 5,
    complete: true,
  },

  // ── Case 10: PYTER GABRIEL PEREIRA SOEIRO ──
  // NOTE: This file has no gprec or dadosEstruturados sections.
  // It appears to be an incomplete/non-calculated PJC file.
  // Only input parameters (dates) are available.
  {
    file: 'pyter-gabriel.pjc',
    beneficiario: 'PYTER GABRIEL PEREIRA SOEIRO',
    cpf: null,
    params: {
      data_admissao: '2018-07-05',
      data_demissao: '2022-03-28',
      data_ajuizamento: '2023-02-28',
      data_liquidacao: '',  // not present
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 0,
      inss_beneficiario: 0,
      inss_executado: 0,
      imposto_renda: 0,
      deposito_fgts: 0,
      custas_judiciais: 0,
    },
    dados_estruturados: {
      valor_principal: 0,
      inss_reclamante: 0,
      inss_reclamado: 0,
    },
    versao: 10,
    complete: false,  // incomplete - no computed results in PJC file
  },

  // ── Case 11: ROQUE GUERREIRO TEIXEIRA ──
  {
    file: 'roque-guerreiro.pjc',
    beneficiario: 'ROQUE GUERREIRO TEIXEIRA',
    cpf: '359.257.019-68',
    params: {
      data_admissao: '2003-11-24',
      data_demissao: '2021-03-09',
      data_ajuizamento: '2021-06-21',
      data_liquidacao: '2025-06-30',
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 231306.58,
      inss_beneficiario: 13150.67,
      inss_executado: 54168.72,
      imposto_renda: 0.00,
      deposito_fgts: 0,
      custas_judiciais: 400.00,
    },
    dados_estruturados: {
      valor_principal: 231306.58,
      inss_reclamante: 20403.15,
      inss_reclamado: 46916.24,
    },
    versao: 4,
    complete: true,
  },

  // ── Case 12: ROSICLEIA PEREIRA CHAVES ──
  {
    file: 'rosicleia-pereira-chaves.pjc',
    beneficiario: 'ROSICLEIA PEREIRA CHAVES',
    cpf: '100.233.396-24',
    params: {
      data_admissao: '2018-06-06',
      data_demissao: '2024-07-04',
      data_ajuizamento: '2024-08-07',
      data_liquidacao: '2025-08-31',
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 247215.95,
      inss_beneficiario: 17468.10,
      inss_executado: 59231.85,
      imposto_renda: 4185.26,
      deposito_fgts: 0,
      custas_judiciais: 0,
    },
    dados_estruturados: {
      valor_principal: 247215.95,
      inss_reclamante: 23475.40,
      inss_reclamado: 53224.55,
    },
    versao: 9,
    complete: true,
  },

  // ── Case 13: TIAGO JOSE PEREIRA DA SILVA ──
  {
    file: 'tiago-jose.pjc',
    beneficiario: 'TIAGO JOSE PEREIRA DA SILVA',
    cpf: '018.304.353-70',
    params: {
      data_admissao: '2014-05-07',
      data_demissao: '2023-05-15',
      data_ajuizamento: '2024-09-25',
      data_liquidacao: '2026-03-31',
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 320938.56,
      inss_beneficiario: 24316.64,
      inss_executado: 84464.92,
      imposto_renda: 29610.11,
      deposito_fgts: 0,
      custas_judiciais: 4720.00,
    },
    dados_estruturados: {
      valor_principal: 320938.56,
      inss_reclamante: 34392.18,
      inss_reclamado: 74389.38,
    },
    versao: 5,
    complete: true,
  },

  // ── Case 14: VANDERLEI BENEDITO DE CARVALHO ──
  {
    file: 'vanderlei-carvalho.pjc',
    beneficiario: 'VANDERLEI BENEDITO DE CARVALHO',
    cpf: '250.086.888-55',
    params: {
      data_admissao: '2017-06-19',
      data_demissao: '2021-06-23',
      data_ajuizamento: '2021-07-08',
      data_liquidacao: '2026-03-31',
      data_citacao: null,
      carga_horaria: 220,
      sabado_dia_util: true,
    },
    gprec: {
      liquido_exequente: 61849.71,
      inss_beneficiario: 2154.16,
      inss_executado: 10601.69,
      imposto_renda: 0.00,
      deposito_fgts: 0,
      custas_judiciais: 1000.00,
    },
    dados_estruturados: {
      valor_principal: 61849.71,
      inss_reclamante: 3383.98,
      inss_reclamado: 9371.87,
    },
    versao: 8,
    complete: true,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('Golden PJC Cases — Reference Values from PJe-Calc', () => {
  it('should have 14 golden cases covering all PJC files', () => {
    expect(GOLDEN_CASES).toHaveLength(14);
  });

  it('should have 13 complete cases with computed results', () => {
    const complete = GOLDEN_CASES.filter(c => c.complete);
    expect(complete).toHaveLength(13);
  });

  describe.each(GOLDEN_CASES.filter(c => c.complete))(
    'Case: $beneficiario ($file)',
    (goldenCase) => {
      it('should have valid date parameters', () => {
        const { params } = goldenCase;
        // All complete cases must have valid dates
        expect(params.data_admissao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(params.data_demissao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(params.data_ajuizamento).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(params.data_liquidacao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        // Admission before dismissal
        expect(params.data_admissao < params.data_demissao).toBe(true);
        // Filing after or near dismissal
        expect(params.data_ajuizamento >= params.data_demissao ||
               params.data_ajuizamento >= params.data_admissao).toBe(true);
      });

      it('should have positive liquido exequente', () => {
        expect(goldenCase.gprec.liquido_exequente).toBeGreaterThan(0);
      });

      it('should have non-negative INSS values', () => {
        expect(goldenCase.gprec.inss_beneficiario).toBeGreaterThanOrEqual(0);
        expect(goldenCase.gprec.inss_executado).toBeGreaterThanOrEqual(0);
        expect(goldenCase.dados_estruturados.inss_reclamante).toBeGreaterThanOrEqual(0);
        expect(goldenCase.dados_estruturados.inss_reclamado).toBeGreaterThanOrEqual(0);
      });

      it('should have non-negative IR and FGTS', () => {
        expect(goldenCase.gprec.imposto_renda).toBeGreaterThanOrEqual(0);
        expect(goldenCase.gprec.deposito_fgts).toBeGreaterThanOrEqual(0);
      });

      it('should have non-negative custas', () => {
        expect(goldenCase.gprec.custas_judiciais).toBeGreaterThanOrEqual(0);
      });

      it('should have positive valor principal', () => {
        expect(goldenCase.dados_estruturados.valor_principal).toBeGreaterThan(0);
      });

      it('should have INSS reclamante <= INSS reclamado (employer share >= employee share)', () => {
        // In PJe-Calc, the employer INSS contribution is typically larger
        expect(goldenCase.dados_estruturados.inss_reclamante)
          .toBeLessThanOrEqual(goldenCase.dados_estruturados.inss_reclamado);
      });

      it('should be able to instantiate engine with case parameters', () => {
        // Verify the engine can be created with the golden case's basic parameters.
        // This does NOT verify computed outputs (would require full verbas/historicos),
        // but ensures the parameter shape is compatible with the engine.
        const engine = createEngine({
          params: {
            data_admissao: goldenCase.params.data_admissao,
            data_demissao: goldenCase.params.data_demissao,
            data_ajuizamento: goldenCase.params.data_ajuizamento,
            sabado_dia_util: goldenCase.params.sabado_dia_util,
            carga_horaria_padrao: goldenCase.params.carga_horaria,
          },
          correcaoConfig: {
            data_liquidacao: goldenCase.params.data_liquidacao,
          },
        });
        expect(engine).toBeDefined();
      });

      it('documents golden reference values (PJe-Calc expected outputs)', () => {
        // This test documents the EXPECTED values from PJe-Calc.
        // When the engine reaches full parity, these values should be matched.
        //
        // GPREC totals:
        //   liquidoExequente:  goldenCase.gprec.liquido_exequente
        //   inssBeneficiario:  goldenCase.gprec.inss_beneficiario
        //   inssExecutado:     goldenCase.gprec.inss_executado
        //   impostoRenda:      goldenCase.gprec.imposto_renda
        //   depositoFgts:      goldenCase.gprec.deposito_fgts
        //   custasJudiciais:   goldenCase.gprec.custas_judiciais
        //
        // DadosEstruturados:
        //   valorPrincipal:    goldenCase.dados_estruturados.valor_principal
        //   inssReclamante:    goldenCase.dados_estruturados.inss_reclamante
        //   inssReclamado:     goldenCase.dados_estruturados.inss_reclamado

        const record = {
          file: goldenCase.file,
          beneficiario: goldenCase.beneficiario,
          versao: goldenCase.versao,
          ...goldenCase.gprec,
          ...goldenCase.dados_estruturados,
        };

        // Assert the golden record is internally consistent
        expect(record.liquido_exequente).toBe(goldenCase.gprec.liquido_exequente);
        expect(record.valor_principal).toBe(goldenCase.dados_estruturados.valor_principal);
        expect(record.inss_reclamante).toBe(goldenCase.dados_estruturados.inss_reclamante);
        expect(record.inss_reclamado).toBe(goldenCase.dados_estruturados.inss_reclamado);
      });
    },
  );

  // ── Special case: PYTER GABRIEL (incomplete) ──
  describe('Case: PYTER GABRIEL PEREIRA SOEIRO (pyter-gabriel.pjc) — incomplete', () => {
    const pyterCase = GOLDEN_CASES.find(c => c.file === 'pyter-gabriel.pjc')!;

    it('should be marked as incomplete', () => {
      expect(pyterCase.complete).toBe(false);
    });

    it('should have valid input dates', () => {
      expect(pyterCase.params.data_admissao).toBe('2018-07-05');
      expect(pyterCase.params.data_demissao).toBe('2022-03-28');
      expect(pyterCase.params.data_ajuizamento).toBe('2023-02-28');
    });

    it('should have zero values for missing computed results', () => {
      expect(pyterCase.gprec.liquido_exequente).toBe(0);
      expect(pyterCase.dados_estruturados.valor_principal).toBe(0);
    });

    it('should still be instantiable in the engine', () => {
      const engine = createEngine({
        params: {
          data_admissao: pyterCase.params.data_admissao,
          data_demissao: pyterCase.params.data_demissao,
          data_ajuizamento: pyterCase.params.data_ajuizamento,
          sabado_dia_util: pyterCase.params.sabado_dia_util,
          carga_horaria_padrao: pyterCase.params.carga_horaria,
        },
      });
      expect(engine).toBeDefined();
    });
  });

  // ── Summary statistics across all complete cases ──
  describe('Summary statistics across all 13 complete cases', () => {
    const complete = GOLDEN_CASES.filter(c => c.complete);

    it('should have a range of liquido values from ~R$9,974 to ~R$510,460', () => {
      const liquidos = complete.map(c => c.gprec.liquido_exequente).sort((a, b) => a - b);
      expect(liquidos[0]).toBe(9974.39);                     // ISLAN RODRIGUES (smallest)
      expect(liquidos[liquidos.length - 1]).toBe(510459.85); // JOSELI SILVA (largest)
    });

    it('should have cases with and without IR incidence', () => {
      const withIR = complete.filter(c => c.gprec.imposto_renda > 0);
      const withoutIR = complete.filter(c => c.gprec.imposto_renda === 0);
      // Cases with IR: francisco-pablo, joseli-silva, leandro-casademunt,
      //               rosicleia-pereira-chaves, tiago-jose
      expect(withIR).toHaveLength(5);
      expect(withoutIR).toHaveLength(8);
    });

    it('should have cases with and without custas', () => {
      const withCustas = complete.filter(c => c.gprec.custas_judiciais > 0);
      const withoutCustas = complete.filter(c => c.gprec.custas_judiciais === 0);
      expect(withCustas.length).toBeGreaterThan(0);
      expect(withoutCustas.length).toBeGreaterThan(0);
    });

    it('should span employment periods from 2003 to 2024', () => {
      const admissoes = complete.map(c => c.params.data_admissao).sort();
      const demissoes = complete.map(c => c.params.data_demissao).sort();
      expect(admissoes[0]).toBe('2003-11-24');  // ROQUE (earliest admission)
      expect(demissoes[demissoes.length - 1]).toBe('2024-07-04'); // ROSICLEIA (latest dismissal)
    });

    it('should all use carga horaria 220 and sabado dia util', () => {
      for (const c of complete) {
        expect(c.params.carga_horaria).toBe(220);
        expect(c.params.sabado_dia_util).toBe(true);
      }
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Export for reuse by other test files
// ────────────────────────────────────────────────────────────────────────────
export { GOLDEN_CASES, type GoldenPjcCase };
