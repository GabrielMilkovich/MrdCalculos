/**
 * PJC GOLDEN BENCHMARK — Real PJe-Calc values for parity comparison
 *
 * These values were extracted from REAL PJe-Calc .pjc files.
 * They serve as the BENCHMARK against which the MRD CALC engine
 * should be validated for autonomous parity.
 *
 * IMPORTANT: These are NOT input parameters — they are EXPECTED OUTPUTS.
 * The engine should produce these values (or very close) when given
 * the same inputs (verbas, historicos, configs) from each case.
 */

export interface PJCGoldenCase {
  file: string;
  beneficiario: string;
  admissao: string;
  demissao: string;
  ajuizamento: string;
  liquidacao: string;
  /** PJe-Calc expected outputs */
  expected: {
    liquido_exequente: number;
    inss_reclamante: number;
    inss_reclamado: number;
    imposto_renda: number;
    custas: number;
  };
}

export const PJC_GOLDEN_CASES: PJCGoldenCase[] = [
  {
    file: 'antonio-harley.pjc',
    beneficiario: 'ANTONIO HARLEY MARQUES GOMES',
    admissao: '2019-11-21',
    demissao: '2020-11-13',
    ajuizamento: '2022-09-20',
    liquidacao: '2025-10-31',
    expected: {
      liquido_exequente: 39929.92,
      inss_reclamante: 2405.58,
      inss_reclamado: 6336.11,
      imposto_renda: 0.00,
      custas: 400.00,
    },
  },
  {
    file: 'izabela-cristina.pjc',
    beneficiario: 'IZABELA CRISTINA RANGEL DO AMARAL',
    admissao: '2020-11-12',
    demissao: '2022-04-14',
    ajuizamento: '2022-04-25',
    liquidacao: '2025-07-31',
    expected: {
      liquido_exequente: 73879.96,
      inss_reclamante: 5550.27,
      inss_reclamado: 14373.85,
      imposto_renda: 0.00,
      custas: 800.00,
    },
  },
  {
    file: 'joseli-silva.pjc',
    beneficiario: 'JOSELI SILVA WANDERLEY',
    admissao: '2011-06-02',
    demissao: '2020-03-13',
    ajuizamento: '2021-08-17',
    liquidacao: '2025-07-31',
    expected: {
      liquido_exequente: 510459.85,
      inss_reclamante: 42357.67,
      inss_reclamado: 107981.05,
      imposto_renda: 50023.93,
      custas: 2000.00,
    },
  },
  {
    file: 'roque-guerreiro.pjc',
    beneficiario: 'ROQUE GUERREIRO TEIXEIRA',
    admissao: '2003-11-24',
    demissao: '2021-03-09',
    ajuizamento: '2021-06-21',
    liquidacao: '2025-06-30',
    expected: {
      liquido_exequente: 231306.58,
      inss_reclamante: 20403.15,
      inss_reclamado: 46916.24,
      imposto_renda: 0.00,
      custas: 400.00,
    },
  },
  {
    file: 'rosicleia-pereira-chaves.pjc',
    beneficiario: 'ROSICLEIA PEREIRA CHAVES',
    admissao: '2018-06-06',
    demissao: '2024-07-04',
    ajuizamento: '2024-08-07',
    liquidacao: '2025-08-31',
    expected: {
      liquido_exequente: 247215.95,
      inss_reclamante: 23475.40,
      inss_reclamado: 53224.55,
      imposto_renda: 4185.26,
      custas: 0,
    },
  },
];

/**
 * Benchmark summary: 5 real PJe-Calc cases covering:
 * - Contract durations: 1 year to 17+ years
 * - Values: R$ 39K to R$ 510K
 * - With and without IR
 * - With and without custas
 * - Different TRTs and periods
 *
 * To prove autonomous parity:
 * 1. Import each .pjc file into MRD CALC
 * 2. Switch to mode=independent
 * 3. Run liquidação with the SAME parameters
 * 4. Compare each component against expected values
 * 5. Delta should be <= R$ 0.01 per component
 */
