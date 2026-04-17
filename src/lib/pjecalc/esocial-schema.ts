/**
 * =====================================================
 * eSocial Schema — Tipos rígidos dos layouts S-2500 e S-2501
 * =====================================================
 *
 * Layouts:
 * - S-2500: Processo Trabalhista — informações do processo, trabalhador,
 *           contrato, rubricas por período e bases consolidadas.
 * - S-2501: Informações de Contribuições Sociais — bases, contribuições
 *           devidas, bases INSS por competência e CPRB.
 *
 * Versão de referência: eSocial S-1.2 (NT 02/2024 consolidada).
 *
 * Este módulo NÃO valida — apenas declara a estrutura e as regras
 * (tipo, tamanho, regex) que o validador (`esocial-validator.ts`) aplica.
 *
 * Todos os campos são representados pelo TIPO TypeScript mais próximo
 * do tipo XSD oficial. Valores monetários são `string` (ex.: "1234.56")
 * porque o XSD os define como decimal com 2 casas e representa-los como
 * `number` causaria perda de precisão.
 */

// =====================================================
// ENUMS OFICIAIS (do layout eSocial S-1.2)
// =====================================================

/** Indicativo de retificação — S-2500 / S-2501 */
export const IND_RETIF = {
  ORIGINAL: '1',
  RETIFICACAO: '2',
} as const;
export type IndRetif = (typeof IND_RETIF)[keyof typeof IND_RETIF];

/** Tipo de ambiente */
export const TP_AMB = {
  PRODUCAO: '1',
  PRODUCAO_RESTRITA: '2',
} as const;
export type TpAmb = (typeof TP_AMB)[keyof typeof TP_AMB];

/** Processo de emissão */
export const PROC_EMI = {
  APLICATIVO_EMPREGADOR: '1',
  APLICATIVO_GOV: '2',
} as const;
export type ProcEmi = (typeof PROC_EMI)[keyof typeof PROC_EMI];

/** Tipo de inscrição do empregador (1=CNPJ, 2=CPF) */
export const TP_INSC = {
  CNPJ: '1',
  CPF: '2',
  CAEPF: '3',
  CNO: '4',
} as const;
export type TpInsc = (typeof TP_INSC)[keyof typeof TP_INSC];

/** Tipo de processo/juízo — S-2500 */
export const TP_PROC = {
  JUDICIAL_TRABALHISTA: '1',
  ADMINISTRATIVO: '2',
} as const;
export type TpProc = (typeof TP_PROC)[keyof typeof TP_PROC];

/** Origem/natureza do processo */
export const ORIG_PROC = {
  JUSTICA_TRABALHO: '1',
  CCP_NINTER: '2',
  DEMAIS: '3',
} as const;
export type OrigProc = (typeof ORIG_PROC)[keyof typeof ORIG_PROC];

/** Indicativo de reconhecimento de vínculo */
export const IND_RECONHECIMENTO = {
  RECONHECIDO: '1',
  NAO_RECONHECIDO: '2',
  RECONHECIDO_ALTERACAO: '3',
} as const;
export type IndReconhecimento = (typeof IND_RECONHECIMENTO)[keyof typeof IND_RECONHECIMENTO];

/** Motivo de desligamento/rescisão (subset — os mais comuns) */
export const MOT_DESLIG = {
  DISPENSA_SEM_JUSTA: '02',
  DISPENSA_COM_JUSTA: '03',
  PEDIDO_DEMISSAO: '07',
  TERMINO_CONTRATO_PRAZO: '08',
  RESCISAO_INDIRETA: '11',
  ACORDO_484A: '31',
  OUTROS: '99',
} as const;
export type MotDeslig = (typeof MOT_DESLIG)[keyof typeof MOT_DESLIG];

/** Código de categoria eSocial (subset) */
export const COD_CATEG = [
  '101', '102', '103', '104', '105', '106', '107', '108', '111',
  '201', '202', '301', '302', '303', '305', '306', '307', '308', '309',
  '401', '410', '701', '711', '712', '721', '722', '723', '731', '734',
  '738', '741', '751', '761', '771', '781', '901', '902', '903', '904',
] as const;
export type CodCateg = (typeof COD_CATEG)[number];

/** Indicativo de categoria do trabalhador (S-2501) */
export const IND_CATEG = {
  MENSAL: '1',
  DIARIA: '2',
  HORISTA: '3',
  TAREFA: '4',
} as const;
export type IndCateg = (typeof IND_CATEG)[keyof typeof IND_CATEG];

/** Tipo de pagamento (efetivado / pendente) */
export const TP_PGTO = {
  PAGAMENTO_EFETUADO: '1',
  PAGAMENTO_NAO_EFETUADO: '2',
  COMPENSACAO_HONORARIOS: '3',
} as const;
export type TpPgto = (typeof TP_PGTO)[keyof typeof TP_PGTO];

/** Tipo de rubrica na tabela S-1010 */
export const NAT_RUBR = {
  VENCIMENTO: '1',
  DESCONTO: '2',
  INFORMATIVA: '3',
  INFORMATIVA_DEDUTORA: '4',
} as const;
export type NatRubr = (typeof NAT_RUBR)[keyof typeof NAT_RUBR];

/** Indicativo de apuração do IR na fonte (S-2501) */
export const IND_APUR_IR = {
  MENSAL: '1',
  RRA: '2',
} as const;
export type IndApurIR = (typeof IND_APUR_IR)[keyof typeof IND_APUR_IR];

/** Código do tributo (infoCRContrib) — FPAS/sub padrão eSocial */
export const TP_CR = {
  CONTRIB_PATRONAL_EMPRESA: '1708',
  CONTRIB_SEGURADO: '1799',
  CONTRIB_SAT_RAT: '1800',
  CONTRIB_TERCEIROS: '1801',
} as const;
export type TpCR = (typeof TP_CR)[keyof typeof TP_CR];

// =====================================================
// REGRAS DE CAMPO — cada chave é um identificador canônico
// =====================================================

export interface FieldRule {
  required: boolean;
  /** Regex que representa a restrição XSD do campo */
  pattern?: RegExp;
  /** Tamanho mínimo (inclusive) de string */
  minLength?: number;
  /** Tamanho máximo (inclusive) de string */
  maxLength?: number;
  /** Valor mínimo numérico (inclusive) — validado contra Decimal */
  min?: number;
  /** Valor máximo numérico (inclusive) */
  max?: number;
  /** Enum aceito */
  enum?: readonly string[];
  /** Rótulo legível */
  label: string;
}

/** Catálogo de regras reutilizáveis */
export const FIELD_RULES = {
  // Identificação
  cnpj: {
    required: true,
    pattern: /^\d{14}$/,
    minLength: 14,
    maxLength: 14,
    label: 'CNPJ',
  },
  cpf: {
    required: true,
    pattern: /^\d{11}$/,
    minLength: 11,
    maxLength: 11,
    label: 'CPF',
  },
  nis: {
    required: false,
    pattern: /^\d{11}$/,
    minLength: 11,
    maxLength: 11,
    label: 'NIS/NIT/PIS',
  },
  // Datas
  dataISO: {
    required: true,
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    minLength: 10,
    maxLength: 10,
    label: 'Data (YYYY-MM-DD)',
  },
  perAnoMes: {
    required: true,
    pattern: /^\d{4}-(0[1-9]|1[0-2])$/,
    minLength: 7,
    maxLength: 7,
    label: 'Período (YYYY-MM)',
  },
  perAno: {
    required: true,
    pattern: /^\d{4}$/,
    minLength: 4,
    maxLength: 4,
    label: 'Período (YYYY)',
  },
  // Processo
  nrProcTrab: {
    required: true,
    pattern: /^\d{20}$/,
    minLength: 20,
    maxLength: 20,
    label: 'Número do processo (CNJ, apenas dígitos)',
  },
  // Textos
  nomeCompleto: {
    required: true,
    minLength: 2,
    maxLength: 70,
    label: 'Nome completo',
  },
  observacao: {
    required: false,
    minLength: 1,
    maxLength: 255,
    label: 'Observação',
  },
  codRubrica: {
    required: true,
    minLength: 1,
    maxLength: 30,
    label: 'Código da rubrica',
  },
  ideTabRubrica: {
    required: true,
    minLength: 1,
    maxLength: 8,
    label: 'Identificador da tabela de rubricas',
  },
  // Valores monetários (representados como string)
  valorMonetario: {
    required: true,
    pattern: /^-?\d{1,14}\.\d{2}$/,
    label: 'Valor monetário (######.##)',
  },
  valorMonetarioPositivo: {
    required: true,
    pattern: /^\d{1,14}\.\d{2}$/,
    min: 0,
    label: 'Valor monetário positivo',
  },
  quantidade: {
    required: false,
    pattern: /^\d{1,5}(\.\d{1,2})?$/,
    label: 'Quantidade',
  },
  fator: {
    required: false,
    pattern: /^\d{1,5}(\.\d{1,4})?$/,
    label: 'Fator',
  },
  aliquota: {
    required: false,
    pattern: /^\d{1,3}(\.\d{1,4})?$/,
    min: 0,
    max: 100,
    label: 'Alíquota (%)',
  },
} satisfies Record<string, FieldRule>;

// =====================================================
// TIPOS — HEADER COMUM (ideEvento / ideEmpregador)
// =====================================================

export interface IdeEvento {
  indRetif: IndRetif;
  nrRecibo?: string; // obrigatório quando indRetif=2
  tpAmb: TpAmb;
  procEmi: ProcEmi;
  verProc: string;   // 1..20
}

export interface IdeEmpregador {
  tpInsc: TpInsc;
  nrInsc: string;    // 8..14 dígitos (CNPJ raiz se tpInsc=1)
}

// =====================================================
// S-2500 — PROCESSO TRABALHISTA
// =====================================================

/** Informações do processo */
export interface S2500_InfoProcesso {
  tpProc: TpProc;
  nrProcTrab: string;       // CNJ 20 dígitos
  obsProc?: string;         // 1..255
  dtSent?: string;          // YYYY-MM-DD
}

/** Informações do trabalhador */
export interface S2500_Trabalhador {
  cpfTrab: string;
  nmTrab: string;           // 2..70
  dtNascto?: string;        // YYYY-MM-DD
  nisTrab?: string;         // PIS/NIS 11 dígitos
  codCateg?: CodCateg;
}

/** Contrato reconhecido ou existente */
export interface S2500_InfoContrato {
  indReconhec: IndReconhecimento;
  dtAdm: string;            // YYYY-MM-DD
  tpContr?: '1' | '2';      // 1=indeterminado, 2=determinado
  dtDeslig?: string;        // YYYY-MM-DD
  mtvDeslig?: MotDeslig;
  codCateg: CodCateg;
  remuneracao?: string;     // valor monetário
}

/** Rubrica de folha (S-2500 > dadosFolha > infoFolha) */
export interface S2500_Rubrica {
  codRubr: string;          // 1..30
  ideTabRubr: string;       // 1..8
  qtdRubr?: string;         // quantidade (decimal)
  fatorRubr?: string;       // fator (decimal)
  vrUnit?: string;          // valor unitário
  vrRubr: string;           // valor monetário total
}

/** Bloco detalhamento por período de referência */
export interface S2500_InfoPerRef {
  perRef: string;           // YYYY-MM
  remuneracao?: string;     // valor monetário do mês
  rubricas: S2500_Rubrica[];
}

/** Evento S-2500 completo */
export interface S2500_Event {
  ideEvento: IdeEvento;
  ideEmpregador: IdeEmpregador;
  infoProcesso: S2500_InfoProcesso;
  trabalhador: S2500_Trabalhador;
  infoContrato: S2500_InfoContrato;
  /** Período de apuração do pagamento (YYYY-MM) */
  perApurPgto: string;
  /** Período de referência das rubricas (>= 1 item) */
  periodos: S2500_InfoPerRef[];
}

// =====================================================
// S-2501 — CONTRIBUIÇÕES SOCIAIS DO PROCESSO TRABALHISTA
// =====================================================

/** Base INSS por competência */
export interface S2501_BaseInss {
  perRef: string;           // YYYY-MM
  /** Base de cálculo mensal INSS */
  vrBcCpMensal: string;
  /** Base de cálculo 13º INSS (opcional) */
  vrBcCp13?: string;
  /** Valor deduzido de INSS já recolhido (opcional) */
  vrDescCp?: string;
}

/** Contribuição patronal / SAT / Terceiros */
export interface S2501_InfoCRContrib {
  tpCR: TpCR;
  vrCR: string;
}

export interface S2501_CalcTrib {
  /** Tipo de cálculo (mensal / RRA) para IR */
  indApurIR: IndApurIR;
  /** Base total INSS ativa */
  vrBcCpAnual?: string;
  vrBcCp13Anual?: string;
  vrCpSeg: string;           // contribuição do segurado total
  vrDescSeg?: string;        // retenção do segurado
  contribuicoes: S2501_InfoCRContrib[];
}

/** Evento S-2501 completo */
export interface S2501_Event {
  ideEvento: IdeEvento;
  ideEmpregador: IdeEmpregador;
  /** Identificação do processo */
  ideProc: {
    nrProcTrab: string;
    perApurPgto: string;     // YYYY-MM
    tpPgto: TpPgto;
    dtPgto?: string;         // YYYY-MM-DD
  };
  /** Identificação do trabalhador */
  ideTrab: {
    cpfTrab: string;
    indCateg: IndCateg;
  };
  calcTrib: S2501_CalcTrib;
  /** Bases de INSS por competência (>= 1) */
  basesInss: S2501_BaseInss[];
}

// =====================================================
// ValidationResult compartilhado
// =====================================================

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
