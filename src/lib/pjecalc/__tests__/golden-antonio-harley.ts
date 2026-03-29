/**
 * PJC GOLDEN TEST — ANTONIO HARLEY MARQUES GOMES
 *
 * Golden reference values extracted from REAL PJe-Calc v2.13.2 output:
 *   public/reports/antonio-harley.pjc
 *
 * Process: 0001240-61.2024.5.07.0002
 * Reclamante: ANTONIO HARLEY MARQUES GOMES (CPF: 030.864.683-51)
 * Reclamado: MAGAZINE LUIZA S/A (CNPJ: 47.960.950/0809-90)
 *
 * Dates:
 *   Admissão: 2019-11-21
 *   Demissão: 2020-11-13
 *   Ajuizamento: 2022-09-20
 *   Liquidação: 2025-10-31
 *
 * PJe-Calc Golden Results:
 *   Líquido Exequente: R$ 39.929,92
 *   INSS Reclamante: R$ 2.405,58 (estruturado) / R$ 1.639,28 (gprec)
 *   INSS Reclamado: R$ 6.336,11 (estruturado) / R$ 7.102,41 (gprec)
 *   Imposto de Renda: R$ 0,00
 *   FGTS Depósito: R$ 0,00
 *   Custas: R$ 400,00
 *   Honorários: R$ 6.235,38
 *   Valor Principal: R$ 39.929,92
 */

export const GOLDEN_ANTONIO_HARLEY = {
  // Identification
  processo: '0001240-61.2024.5.07.0002',
  beneficiario: 'ANTONIO HARLEY MARQUES GOMES',
  cpf: '030.864.683-51',
  reclamado: 'MAGAZINE LUIZA S/A',
  cnpj: '47.960.950/0809-90',

  // Dates
  data_admissao: '2019-11-21',
  data_demissao: '2020-11-13',
  data_ajuizamento: '2022-09-20',
  data_liquidacao: '2025-10-31',

  // PJe-Calc Result (from <dadosEstruturados>)
  resultado: {
    valor_principal: 39929.92,
    liquido_exequente: 39929.92,
    inss_reclamante: 2405.58,
    inss_reclamado: 6336.11,
    imposto_renda: 0.00,
    fgts_deposito: 0,
    custas_reclamado: 400.00,
    custas_reclamante: 0,
    honorarios: 6235.38,
  },

  // PJe-Calc GPREC (summary — may differ from estruturado)
  gprec: {
    liquido_exequente: 39929.92,
    inss_beneficiario: 1639.28,
    inss_executado: 7102.41,
    imposto_renda: 0.00,
    custas_judiciais: 400.00,
  },

  // PJe-Calc version
  versao_pjecalc: '2.13.2',
  hash_liquidacao: '4F8884F33484D0648B93268DD3FA50B5',
};
