/**
 * =====================================================
 * TRT TEMPLATES — Regional Labor Court configurations
 * =====================================================
 *
 * Configuration templates for all 24 TRTs (Tribunais Regionais do Trabalho)
 * with their specific rules, default indices, fee percentages, and jurisprudence.
 *
 * Key differences:
 * - Saturday as working day varies by TRT (TRT2/SP has "Sabadao")
 * - Preferred correction index (IPCA-E vs INPC vs TR)
 * - Fee/costs percentages
 * - Regional sumulas and precedents
 */

// --- Types ---

export interface TRTRegraEspecifica {
  codigo: string;
  descricao: string;
  tipo: "sumula" | "oj" | "precedente";
  referencia: string;
}

export interface TRTConfig {
  trt_id: number; // 1-24
  nome: string;
  sigla: string;
  estados: string[];
  // Regional rules
  sabado_dia_util_default: boolean;
  indice_correcao_preferencial: string;
  tabela_unica_url?: string;
  // Specific jurisprudence
  regras_especificas: TRTRegraEspecifica[];
  // Fee defaults
  honorarios_default_pct: number;
  custas_default_pct: number;
  // Additional configuration hints
  juros_tipo_default?: string;
  juros_percentual_default?: number;
  multa_523_default?: boolean;
}

// --- All 24 TRTs ---

export const TRT_CONFIGS: TRTConfig[] = [
  {
    trt_id: 1,
    nome: "Tribunal Regional do Trabalho da 1a Regiao",
    sigla: "TRT1",
    estados: ["RJ"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    tabela_unica_url: "https://www.trt1.jus.br/tabela-unica",
    regras_especificas: [
      {
        codigo: "SUM-TRT1-19",
        descricao:
          "A base de calculo das horas extras e o salario-hora normal do empregado, acrescido do adicional previsto em lei, contrato, acordo, convencao coletiva ou sentenca normativa.",
        tipo: "sumula",
        referencia: "Sumula 19 TRT1",
      },
      {
        codigo: "SUM-TRT1-75",
        descricao:
          "FGTS. Diferenca de depositos. Natureza juridica: a parcela referente a diferenca de depositos do FGTS tem natureza salarial.",
        tipo: "sumula",
        referencia: "Sumula 75 TRT1",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 2,
    nome: "Tribunal Regional do Trabalho da 2a Regiao",
    sigla: "TRT2",
    estados: ["SP"],
    sabado_dia_util_default: false, // "Sabadao" - Saturday is NOT a working day
    indice_correcao_preferencial: "IPCA-E",
    tabela_unica_url: "https://www.trt2.jus.br/servicos/tabela-pratica",
    regras_especificas: [
      {
        codigo: "SUM-TRT2-1",
        descricao:
          "Honorarios advocaticios na Justica do Trabalho. Cabimento. Aplicacao do art. 791-A da CLT.",
        tipo: "sumula",
        referencia: "Sumula 1 TRT2",
      },
      {
        codigo: "SUM-TRT2-4",
        descricao:
          "Adicional de insalubridade. Base de calculo. Salario minimo. Aplicacao da Sumula Vinculante 4 do STF.",
        tipo: "sumula",
        referencia: "Sumula 4 TRT2",
      },
      {
        codigo: "PREC-TRT2-SABADAO",
        descricao:
          "Sabado nao e considerado dia util para fins de contagem de prazo no TRT da 2a Regiao (Sabadao).",
        tipo: "precedente",
        referencia: "Provimento GP/CR 13/2014",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 3,
    nome: "Tribunal Regional do Trabalho da 3a Regiao",
    sigla: "TRT3",
    estados: ["MG"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    tabela_unica_url: "https://www.trt3.jus.br/tabela-de-atualizacao",
    regras_especificas: [
      {
        codigo: "SUM-TRT3-25",
        descricao:
          "Horas extras. Reflexos sobre aviso previo indenizado. O valor das horas extras habitualmente prestadas integra o calculo do aviso previo indenizado.",
        tipo: "sumula",
        referencia: "Sumula 25 TRT3",
      },
      {
        codigo: "SUM-TRT3-36",
        descricao:
          "FGTS. Incidencia sobre parcelas deferidas em juizo.",
        tipo: "sumula",
        referencia: "Sumula 36 TRT3",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 4,
    nome: "Tribunal Regional do Trabalho da 4a Regiao",
    sigla: "TRT4",
    estados: ["RS"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    tabela_unica_url: "https://www.trt4.jus.br/portais/trt4/tabela-de-atualizacao",
    regras_especificas: [
      {
        codigo: "SUM-TRT4-13",
        descricao:
          "Contribuicao previdenciaria. Fato gerador. A contribuicao previdenciaria tem como fato gerador a prestacao de servicos.",
        tipo: "sumula",
        referencia: "Sumula 13 TRT4",
      },
      {
        codigo: "SUM-TRT4-18",
        descricao:
          "Juros de mora. Contribuicao previdenciaria. Os juros de mora incidem sobre as contribuicoes previdenciarias a partir do transito em julgado da sentenca.",
        tipo: "sumula",
        referencia: "Sumula 18 TRT4",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 5,
    nome: "Tribunal Regional do Trabalho da 5a Regiao",
    sigla: "TRT5",
    estados: ["BA"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    tabela_unica_url: "https://www.trt5.jus.br/tabela-de-atualizacao-monetaria",
    regras_especificas: [
      {
        codigo: "SUM-TRT5-29",
        descricao:
          "Horas extras. Divisor. Jornada de 40 horas semanais. Empregados do comercio. Divisor 200.",
        tipo: "sumula",
        referencia: "Sumula 29 TRT5",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 6,
    nome: "Tribunal Regional do Trabalho da 6a Regiao",
    sigla: "TRT6",
    estados: ["PE"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    regras_especificas: [
      {
        codigo: "SUM-TRT6-12",
        descricao:
          "Adicional noturno. Hora noturna reduzida. O adicional noturno, pago com habitualidade, integra a remuneracao para todos os efeitos.",
        tipo: "sumula",
        referencia: "Sumula 12 TRT6",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 7,
    nome: "Tribunal Regional do Trabalho da 7a Regiao",
    sigla: "TRT7",
    estados: ["CE"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    regras_especificas: [
      {
        codigo: "SUM-TRT7-5",
        descricao:
          "Horas extras. Acordo de compensacao. A prestacao habitual de horas extras descaracteriza o acordo de compensacao.",
        tipo: "sumula",
        referencia: "Sumula 5 TRT7",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 8,
    nome: "Tribunal Regional do Trabalho da 8a Regiao",
    sigla: "TRT8",
    estados: ["PA", "AP"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "INPC",
    regras_especificas: [
      {
        codigo: "SUM-TRT8-3",
        descricao:
          "Adicional de transferencia. Devido quando a transferencia e provisoria.",
        tipo: "sumula",
        referencia: "Sumula 3 TRT8",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 9,
    nome: "Tribunal Regional do Trabalho da 9a Regiao",
    sigla: "TRT9",
    estados: ["PR"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    tabela_unica_url: "https://www.trt9.jus.br/portal/pagina/tabela-de-atualizacao-monetaria",
    regras_especificas: [
      {
        codigo: "SUM-TRT9-10",
        descricao:
          "Horas in itinere. O tempo de percurso gasto pelo empregado, em conduto fornecido pelo empregador, constitui horas in itinere (pre-reforma).",
        tipo: "sumula",
        referencia: "Sumula 10 TRT9",
      },
      {
        codigo: "SUM-TRT9-3",
        descricao:
          "Atualizacao monetaria. Os debitos trabalhistas sao atualizados pela tabela unica do TRT9.",
        tipo: "sumula",
        referencia: "Sumula 3 TRT9",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 10,
    nome: "Tribunal Regional do Trabalho da 10a Regiao",
    sigla: "TRT10",
    estados: ["DF", "TO"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    regras_especificas: [
      {
        codigo: "SUM-TRT10-15",
        descricao:
          "Intervalo intrajornada. Natureza salarial. A nao concessao ou a concessao parcial do intervalo intrajornada tem natureza salarial.",
        tipo: "sumula",
        referencia: "Sumula 15 TRT10",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 11,
    nome: "Tribunal Regional do Trabalho da 11a Regiao",
    sigla: "TRT11",
    estados: ["AM", "RR"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "INPC",
    regras_especificas: [
      {
        codigo: "SUM-TRT11-2",
        descricao:
          "Adicional de insalubridade. A base de calculo segue o salario minimo ate regulamentacao por lei especifica.",
        tipo: "sumula",
        referencia: "Sumula 2 TRT11",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 12,
    nome: "Tribunal Regional do Trabalho da 12a Regiao",
    sigla: "TRT12",
    estados: ["SC"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    tabela_unica_url: "https://www.trt12.jus.br/tabela-unica",
    regras_especificas: [
      {
        codigo: "SUM-TRT12-8",
        descricao:
          "Horas extras. Cargo de confianca. A jornada de trabalho do empregado exercente de cargo de confianca se sujeita ao art. 62, II, da CLT.",
        tipo: "sumula",
        referencia: "Sumula 8 TRT12",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 13,
    nome: "Tribunal Regional do Trabalho da 13a Regiao",
    sigla: "TRT13",
    estados: ["PB"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    regras_especificas: [
      {
        codigo: "SUM-TRT13-5",
        descricao:
          "Contribuicao previdenciaria. Competencia. A competencia da Justica do Trabalho para executar contribuicoes previdenciarias abrange as incidentes sobre as parcelas deferidas em sentenca.",
        tipo: "sumula",
        referencia: "Sumula 5 TRT13",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 14,
    nome: "Tribunal Regional do Trabalho da 14a Regiao",
    sigla: "TRT14",
    estados: ["RO", "AC"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "INPC",
    regras_especificas: [
      {
        codigo: "SUM-TRT14-1",
        descricao:
          "Honorarios periciais. Responsabilidade. A parte sucumbente na pretensao que originou a pericia e responsavel pelos honorarios periciais.",
        tipo: "sumula",
        referencia: "Sumula 1 TRT14",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 15,
    nome: "Tribunal Regional do Trabalho da 15a Regiao",
    sigla: "TRT15",
    estados: ["SP"], // Interior/Campinas
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    tabela_unica_url: "https://www.trt15.jus.br/escola-da-magistratura/tabela-de-atualizacao",
    regras_especificas: [
      {
        codigo: "SUM-TRT15-2",
        descricao:
          "Honorarios advocaticios. Art. 791-A, CLT. Percentual minimo de 5% e maximo de 15% sobre o valor da liquidacao.",
        tipo: "sumula",
        referencia: "Sumula 2 TRT15",
      },
      {
        codigo: "SUM-TRT15-18",
        descricao:
          "FGTS. Multa de 40%. Incide sobre todos os depositos devidos durante a contratualidade.",
        tipo: "sumula",
        referencia: "Sumula 18 TRT15",
      },
    ],
    honorarios_default_pct: 10, // Different from most TRTs
    custas_default_pct: 2,
  },
  {
    trt_id: 16,
    nome: "Tribunal Regional do Trabalho da 16a Regiao",
    sigla: "TRT16",
    estados: ["MA"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    regras_especificas: [
      {
        codigo: "SUM-TRT16-4",
        descricao:
          "Intervalo intrajornada. A concessao parcial do intervalo intrajornada implica pagamento total do periodo como extra.",
        tipo: "sumula",
        referencia: "Sumula 4 TRT16",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 17,
    nome: "Tribunal Regional do Trabalho da 17a Regiao",
    sigla: "TRT17",
    estados: ["ES"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    regras_especificas: [
      {
        codigo: "SUM-TRT17-5",
        descricao:
          "Dano moral. Acidente de trabalho. Responsabilidade objetiva quando a atividade e de risco.",
        tipo: "sumula",
        referencia: "Sumula 5 TRT17",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 18,
    nome: "Tribunal Regional do Trabalho da 18a Regiao",
    sigla: "TRT18",
    estados: ["GO"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    regras_especificas: [
      {
        codigo: "SUM-TRT18-6",
        descricao:
          "Horas extras. Supressao. A supressao total ou parcial de horas extras gera direito a indenizacao.",
        tipo: "sumula",
        referencia: "Sumula 6 TRT18",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 19,
    nome: "Tribunal Regional do Trabalho da 19a Regiao",
    sigla: "TRT19",
    estados: ["AL"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    regras_especificas: [
      {
        codigo: "SUM-TRT19-3",
        descricao:
          "Equiparacao salarial. Requisitos. Para equiparacao salarial exige-se identidade de funcao, trabalho de igual valor, mesmo empregador e mesma localidade.",
        tipo: "sumula",
        referencia: "Sumula 3 TRT19",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 20,
    nome: "Tribunal Regional do Trabalho da 20a Regiao",
    sigla: "TRT20",
    estados: ["SE"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    regras_especificas: [
      {
        codigo: "SUM-TRT20-1",
        descricao:
          "Aviso previo proporcional. O aviso previo proporcional ao tempo de servico (Lei 12.506/2011) e direito apenas do empregado.",
        tipo: "sumula",
        referencia: "Sumula 1 TRT20",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 21,
    nome: "Tribunal Regional do Trabalho da 21a Regiao",
    sigla: "TRT21",
    estados: ["RN"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    regras_especificas: [
      {
        codigo: "SUM-TRT21-7",
        descricao:
          "Multa do art. 477, CLT. E devida a multa quando nao observado o prazo para pagamento das verbas rescisorias.",
        tipo: "sumula",
        referencia: "Sumula 7 TRT21",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 22,
    nome: "Tribunal Regional do Trabalho da 22a Regiao",
    sigla: "TRT22",
    estados: ["PI"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "INPC",
    regras_especificas: [
      {
        codigo: "SUM-TRT22-2",
        descricao:
          "Verbas rescisorias. Prazo. O empregador que nao observar o prazo para pagamento esta sujeito a multa do art. 477 da CLT.",
        tipo: "sumula",
        referencia: "Sumula 2 TRT22",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 23,
    nome: "Tribunal Regional do Trabalho da 23a Regiao",
    sigla: "TRT23",
    estados: ["MT"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    regras_especificas: [
      {
        codigo: "SUM-TRT23-4",
        descricao:
          "Horas extras. Trabalho externo. O empregado em trabalho externo com controle de jornada tem direito a horas extras.",
        tipo: "sumula",
        referencia: "Sumula 4 TRT23",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
  {
    trt_id: 24,
    nome: "Tribunal Regional do Trabalho da 24a Regiao",
    sigla: "TRT24",
    estados: ["MS"],
    sabado_dia_util_default: true,
    indice_correcao_preferencial: "IPCA-E",
    regras_especificas: [
      {
        codigo: "SUM-TRT24-3",
        descricao:
          "Compensacao de jornada. Banco de horas. A compensacao de jornada mediante banco de horas exige acordo coletivo.",
        tipo: "sumula",
        referencia: "Sumula 3 TRT24",
      },
    ],
    honorarios_default_pct: 15,
    custas_default_pct: 2,
  },
];

// --- Helper functions ---

/**
 * Get TRT config by ID (1-24)
 */
export function getTRTById(trtId: number): TRTConfig | undefined {
  return TRT_CONFIGS.find((t) => t.trt_id === trtId);
}

/**
 * Get TRT config by state abbreviation (UF)
 * Note: SP has two TRTs (2 for Capital, 15 for Interior/Campinas)
 */
export function getTRTsByEstado(uf: string): TRTConfig[] {
  return TRT_CONFIGS.filter((t) => t.estados.includes(uf));
}

/**
 * Get all UFs mapped to their TRT(s)
 */
export function getUFToTRTMap(): Map<string, TRTConfig[]> {
  const map = new Map<string, TRTConfig[]>();
  for (const trt of TRT_CONFIGS) {
    for (const uf of trt.estados) {
      const existing = map.get(uf) || [];
      existing.push(trt);
      map.set(uf, existing);
    }
  }
  return map;
}

/**
 * Given a TRT config, build default PjeParametros overrides.
 */
export function getTRTParametrosDefaults(trtId: number): {
  sabado_dia_util: boolean;
  indice_correcao: string;
  honorarios_pct: number;
  custas_pct: number;
} | null {
  const trt = getTRTById(trtId);
  if (!trt) return null;
  return {
    sabado_dia_util: trt.sabado_dia_util_default,
    indice_correcao: trt.indice_correcao_preferencial,
    honorarios_pct: trt.honorarios_default_pct,
    custas_pct: trt.custas_default_pct,
  };
}

/**
 * Build a label for TRT selection dropdowns:
 * "TRT2 - SP (Sao Paulo - Capital)"
 */
export function getTRTLabel(trt: TRTConfig): string {
  const ufs = trt.estados.join("/");
  const regionName = TRT_REGION_NAMES[trt.trt_id] || "";
  return `TRT${trt.trt_id} - ${ufs}${regionName ? ` (${regionName})` : ""}`;
}

const TRT_REGION_NAMES: Record<number, string> = {
  1: "Rio de Janeiro",
  2: "Sao Paulo - Capital",
  3: "Minas Gerais",
  4: "Rio Grande do Sul",
  5: "Bahia",
  6: "Pernambuco",
  7: "Ceara",
  8: "Para/Amapa",
  9: "Parana",
  10: "Distrito Federal/Tocantins",
  11: "Amazonas/Roraima",
  12: "Santa Catarina",
  13: "Paraiba",
  14: "Rondonia/Acre",
  15: "Campinas - SP Interior",
  16: "Maranhao",
  17: "Espirito Santo",
  18: "Goias",
  19: "Alagoas",
  20: "Sergipe",
  21: "Rio Grande do Norte",
  22: "Piaui",
  23: "Mato Grosso",
  24: "Mato Grosso do Sul",
};
