/**
 * Fixtures realisticas para a suite E2E `ocr-pipeline-e2e.test.ts`.
 *
 * Cada fixture representa o ESTADO FINAL de um documento depois de:
 *   1) upload no supabase storage
 *   2) OCR via Mistral (texto bruto extraido)
 *   3) extracao estruturada via OpenAI (JSON tipado)
 *
 * As propriedades batem com o shape consumido por `extrairPropostas()` da
 * edge function `extract-and-fill` (campos `dados_processo`, `contrato`,
 * `reclamante`, `reclamada`, `tipo_documento`, `confianca_geral`).
 *
 * Sao usadas em 2 dimensoes:
 *   - `mistral_text`: texto que o mock de fetch para Mistral devolve.
 *   - `openai_extracted`: JSON que o mock de fetch para OpenAI devolve.
 *   - `expected_propostas`: contrato que o pipeline deve produzir.
 */

import type { CampoAutoFill, DocumentoTipo } from '../document-authority';

export interface OcrFixture {
  cenario: string;
  doc_tipo: DocumentoTipo;
  mistral_text: string;
  openai_extracted: ExtractedJson;
  /** Campos que DEVEM virar propostas (authority > 0 + valor presente). */
  expected_campos: CampoAutoFill[];
}

/**
 * Shape minimo do JSON estruturado retornado pelo OpenAI no extract-and-fill.
 * Replica em runtime o contrato do edge function (sem importar do Deno).
 */
export interface ExtractedJson {
  tipo_documento: string;
  confianca_geral: number;
  paginas_detectadas?: number;
  dados_processo?: {
    numero_processo?: string;
    tribunal?: string;
    vara?: string;
    data_ajuizamento?: string;
  };
  reclamante?: {
    nome?: string;
    cpf?: string;
  };
  reclamada?: {
    nome?: string;
    razao_social?: string;
    cnpj?: string;
  };
  contrato?: {
    data_admissao?: string;
    data_demissao?: string;
    cargo_funcao?: string;
    salario_base?: number;
    tipo_demissao?: string;
    jornada?: string;
    carga_horaria_mensal?: number;
  };
  rubricas?: Array<{ codigo: string; descricao: string; valor: number }>;
  verbas_rescisorias?: Array<{ verba: string; valor: number }>;
  sentenca?: { parametros_liquidacao?: { honorarios_percentual?: number } };
}

// ---------------------------------------------------------------------------
// FIXTURE A — CTPS digital com data_admissao
// ---------------------------------------------------------------------------
export const FIXTURE_CTPS: OcrFixture = {
  cenario: 'CTPS digital — data_admissao + dados pessoais',
  doc_tipo: 'CTPS',
  mistral_text: `
CARTEIRA DE TRABALHO E PREVIDENCIA SOCIAL
Nome: JOAO DA SILVA SANTOS
CPF: 123.456.789-00
Empregador: ACME INDUSTRIA LTDA
CNPJ: 12.345.678/0001-90
Cargo: ANALISTA DE SISTEMAS
Data de Admissao: 15/03/2018
Salario: R$ 5.000,00
Jornada: 40h semanais
`.trim(),
  openai_extracted: {
    tipo_documento: 'ctps',
    confianca_geral: 0.95,
    paginas_detectadas: 2,
    reclamante: { nome: 'JOAO DA SILVA SANTOS', cpf: '123.456.789-00' },
    reclamada: { nome: 'ACME INDUSTRIA LTDA', cnpj: '12.345.678/0001-90' },
    contrato: {
      data_admissao: '2018-03-15',
      cargo_funcao: 'ANALISTA DE SISTEMAS',
      salario_base: 5000,
      jornada: '40h semanais',
      carga_horaria_mensal: 220,
    },
  },
  expected_campos: [
    'data_admissao',
    'reclamante_nome',
    'reclamante_cpf',
    'reclamada_nome',
    'reclamada_cnpj',
    'cargo_funcao',
    'salario_base',
    'jornada',
  ],
};

// ---------------------------------------------------------------------------
// FIXTURE B — TRCT (rescisao + verbas rescisorias)
// ---------------------------------------------------------------------------
export const FIXTURE_TRCT: OcrFixture = {
  cenario: 'TRCT — data_demissao + verbas rescisorias',
  doc_tipo: 'TRCT',
  mistral_text: `
TERMO DE RESCISAO DE CONTRATO DE TRABALHO
Empregado: JOAO DA SILVA SANTOS  CPF: 123.456.789-00
Empregador: ACME INDUSTRIA LTDA  CNPJ: 12.345.678/0001-90
Data de Admissao: 15/03/2018
Data de Afastamento: 30/06/2024
Codigo Saque: 01 - DISPENSA SEM JUSTA CAUSA
Aviso Previo Indenizado: R$ 5.000,00
Saldo de Salario: R$ 2.500,00
13o Proporcional: R$ 2.500,00
Ferias Proporcionais + 1/3: R$ 3.333,33
FGTS Multa 40%: R$ 8.000,00
`.trim(),
  openai_extracted: {
    tipo_documento: 'trct',
    confianca_geral: 0.93,
    paginas_detectadas: 1,
    reclamante: { nome: 'JOAO DA SILVA SANTOS', cpf: '123.456.789-00' },
    reclamada: { nome: 'ACME INDUSTRIA LTDA', cnpj: '12.345.678/0001-90' },
    contrato: {
      data_admissao: '2018-03-15',
      data_demissao: '2024-06-30',
      tipo_demissao: 'sem_justa_causa',
      salario_base: 5000,
    },
    verbas_rescisorias: [
      { verba: 'AVISO_PREVIO', valor: 5000 },
      { verba: 'SALDO_SALARIO', valor: 2500 },
      { verba: '13_PROPORCIONAL', valor: 2500 },
      { verba: 'FERIAS_PROPORCIONAIS', valor: 3333.33 },
      { verba: 'FGTS_MULTA_40', valor: 8000 },
    ],
  },
  expected_campos: [
    'data_admissao',
    'data_demissao',
    'reclamante_nome',
    'reclamante_cpf',
    'reclamada_nome',
    'reclamada_cnpj',
    'salario_base',
    'tipo_demissao',
  ],
};

// ---------------------------------------------------------------------------
// FIXTURE C — Holerite (rubrica mensal + salario competencia)
// ---------------------------------------------------------------------------
export const FIXTURE_HOLERITE: OcrFixture = {
  cenario: 'Holerite — rubrica mensal',
  doc_tipo: 'HOLERITE',
  mistral_text: `
RECIBO DE PAGAMENTO DE SALARIO - 03/2024
Funcionario: JOAO DA SILVA SANTOS  CPF: 123.456.789-00
Empresa: ACME INDUSTRIA LTDA  CNPJ: 12.345.678/0001-90
Codigo  Descricao            Vencimento   Desconto
0001    SALARIO BASE          5.000,00
0002    HORAS EXTRAS 50%        450,00
0901    INSS                                  550,00
0902    IRRF                                  150,00
SALARIO BRUTO: 5.450,00   LIQUIDO: 4.750,00
`.trim(),
  openai_extracted: {
    tipo_documento: 'holerite',
    confianca_geral: 0.88,
    paginas_detectadas: 1,
    reclamante: { nome: 'JOAO DA SILVA SANTOS', cpf: '123.456.789-00' },
    reclamada: { nome: 'ACME INDUSTRIA LTDA', cnpj: '12.345.678/0001-90' },
    contrato: {
      salario_base: 5000,
    },
    rubricas: [
      { codigo: '0001', descricao: 'SALARIO BASE', valor: 5000 },
      { codigo: '0002', descricao: 'HORAS EXTRAS 50%', valor: 450 },
      { codigo: '0901', descricao: 'INSS', valor: -550 },
      { codigo: '0902', descricao: 'IRRF', valor: -150 },
    ],
  },
  expected_campos: [
    'reclamante_nome',
    'reclamante_cpf',
    'reclamada_nome',
    'reclamada_cnpj',
    'salario_base',
  ],
};

// ---------------------------------------------------------------------------
// FIXTURE D — Sentenca (numero_processo + tribunal)
// ---------------------------------------------------------------------------
export const FIXTURE_SENTENCA: OcrFixture = {
  cenario: 'Sentenca — numero_processo + tribunal + vara',
  doc_tipo: 'SENTENCA',
  mistral_text: `
PODER JUDICIARIO
JUSTICA DO TRABALHO
TRIBUNAL REGIONAL DO TRABALHO DA 2a REGIAO
1a VARA DO TRABALHO DE SAO PAULO

Processo no 1234567-89.2023.5.02.0001
Reclamante: JOAO DA SILVA SANTOS
Reclamada: ACME INDUSTRIA LTDA

SENTENCA
Julgo PROCEDENTES em parte os pedidos para condenar a reclamada
ao pagamento de horas extras, ferias e 13o, com honorarios de
sucumbencia em 15% sobre o valor da condenacao.
`.trim(),
  openai_extracted: {
    tipo_documento: 'sentenca',
    confianca_geral: 0.91,
    paginas_detectadas: 8,
    dados_processo: {
      numero_processo: '1234567-89.2023.5.02.0001',
      tribunal: 'TRT-2',
      vara: '1a Vara do Trabalho de Sao Paulo',
    },
    reclamante: { nome: 'JOAO DA SILVA SANTOS' },
    reclamada: { nome: 'ACME INDUSTRIA LTDA' },
    sentenca: { parametros_liquidacao: { honorarios_percentual: 15 } },
  },
  expected_campos: ['numero_processo', 'tribunal', 'vara', 'reclamante_nome', 'reclamada_nome'],
};

// ---------------------------------------------------------------------------
// FIXTURE E — Peticao Inicial (data_ajuizamento)
// ---------------------------------------------------------------------------
export const FIXTURE_PETICAO: OcrFixture = {
  cenario: 'Peticao Inicial — data_ajuizamento + numero_processo',
  doc_tipo: 'PETICAO_INICIAL',
  mistral_text: `
EXMO SR DR JUIZ DA VARA DO TRABALHO DE SAO PAULO

JOAO DA SILVA SANTOS, brasileiro, CPF 123.456.789-00, vem
respeitosamente a presenca de V. Exa., propor a presente

RECLAMACAO TRABALHISTA

em face de ACME INDUSTRIA LTDA, CNPJ 12.345.678/0001-90,
pelos fatos a seguir...

Sao Paulo, 10 de janeiro de 2025.
`.trim(),
  openai_extracted: {
    tipo_documento: 'peticao_inicial',
    confianca_geral: 0.86,
    paginas_detectadas: 25,
    dados_processo: {
      numero_processo: '7654321-12.2025.5.02.0001',
      tribunal: 'TRT-2',
      vara: 'Vara do Trabalho de Sao Paulo',
      data_ajuizamento: '2025-01-10',
    },
    reclamante: { nome: 'JOAO DA SILVA SANTOS', cpf: '123.456.789-00' },
    reclamada: { nome: 'ACME INDUSTRIA LTDA', cnpj: '12.345.678/0001-90' },
    contrato: {
      data_admissao: '2018-03-15',
      data_demissao: '2024-06-30',
      cargo_funcao: 'ANALISTA',
      salario_base: 5000,
    },
  },
  expected_campos: [
    'data_ajuizamento',
    'numero_processo',
    'tribunal',
    'vara',
    'reclamante_cpf',
    'data_admissao',
    'data_demissao',
  ],
};

// ---------------------------------------------------------------------------
// FIXTURE F — Holerite com data_admissao DIVERGENTE da CTPS (cenario composto)
// ---------------------------------------------------------------------------
export const FIXTURE_HOLERITE_CONFLITO: OcrFixture = {
  cenario: 'Holerite com data_admissao divergente (gera conflito vs CTPS)',
  doc_tipo: 'HOLERITE',
  mistral_text: 'Recibo de pagamento... admissao 01/04/2018',
  openai_extracted: {
    tipo_documento: 'holerite',
    confianca_geral: 0.90,
    paginas_detectadas: 1,
    contrato: {
      data_admissao: '2018-04-01', // CTPS diz 2018-03-15
      salario_base: 5000,
    },
    reclamante: { nome: 'JOAO DA SILVA SANTOS' },
  },
  expected_campos: ['data_admissao', 'salario_base', 'reclamante_nome'],
};

export const ALL_FIXTURES: OcrFixture[] = [
  FIXTURE_CTPS,
  FIXTURE_TRCT,
  FIXTURE_HOLERITE,
  FIXTURE_SENTENCA,
  FIXTURE_PETICAO,
];

/**
 * Helper: dada uma fixture, devolve os pares (campo, valor) que serao
 * extraidos pelo `extrairPropostas` (replica determinstica da edge fn).
 *
 * Mantem 1:1 a logica `add(campo, valor)` do supabase/functions/
 * extract-and-fill/index.ts:1249 (`extrairPropostas`).
 */
export function pairsFromExtracted(extracted: ExtractedJson): Array<{
  campo: CampoAutoFill;
  valor: unknown;
}> {
  const dp = extracted.dados_processo ?? {};
  const c = extracted.contrato ?? {};
  const rec = extracted.reclamante ?? {};
  const rda = extracted.reclamada ?? {};

  const candidates: Array<{ campo: CampoAutoFill; valor: unknown }> = [
    { campo: 'data_admissao', valor: c.data_admissao },
    { campo: 'data_demissao', valor: c.data_demissao },
    { campo: 'data_ajuizamento', valor: dp.data_ajuizamento },
    { campo: 'numero_processo', valor: dp.numero_processo },
    { campo: 'tribunal', valor: dp.tribunal },
    { campo: 'vara', valor: dp.vara },
    { campo: 'reclamante_nome', valor: rec.nome },
    { campo: 'reclamante_cpf', valor: rec.cpf },
    { campo: 'reclamada_nome', valor: rda.nome ?? rda.razao_social },
    { campo: 'reclamada_cnpj', valor: rda.cnpj },
    { campo: 'cargo_funcao', valor: c.cargo_funcao },
    { campo: 'salario_base', valor: c.salario_base },
    { campo: 'tipo_demissao', valor: c.tipo_demissao },
    { campo: 'jornada', valor: c.jornada },
  ];

  return candidates.filter(({ valor }) => valor !== null && valor !== undefined && valor !== '');
}
