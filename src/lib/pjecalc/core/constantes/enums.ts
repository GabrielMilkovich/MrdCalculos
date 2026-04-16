/**
 * PJe-Calc v2.15.1 — Enums críticos consolidados
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.constantes.*
 *
 * Referência: pjecalc-fonte/negocio/br/jus/trt8/pjecalc/negocio/constantes/
 *
 * Consolidamos aqui apenas os enums que afetam cálculo (não UI/permissões).
 * Formato: cada enum exporta um namespace-like object com { value: [nome, valor] }.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Índice monetário (17 opções) — IndiceMonetarioEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum IndiceMonetarioEnum {
  INDICE_TRABALHISTA = 'INDTR',
  TUACDT = 'TUACDT',
  TABELA_DEVEDOR_FAZENDA = 'DFP',
  TABELA_INDEBITO_TRIBUTARIO = 'IT',
  TABELA_UNICA_JT_MENSAL = 'TUJTM',
  TABELA_UNICA_JT_DIARIO = 'TUJTD',
  TR = 'TR',
  IGPM = 'IGPM',
  INPC = 'INPC',
  IPC = 'IPC',
  IPCA = 'IPCA',
  IPCAE = 'IPCAE',
  IPCAETR = 'IPCAETR',
  JAM = 'JAM',
  SELIC = 'SELIC',
  SELIC_FAZENDA = 'SELFAZ',
  SELIC_BACEN = 'SELBAC',
  SEM_CORRECAO = 'SEMCO',
}

// ─────────────────────────────────────────────────────────────────────────────
// Momento de acumulação do índice — IndicesAcumuladosEnum (Súmula 381 TST)
// ─────────────────────────────────────────────────────────────────────────────
export enum IndicesAcumuladosEnum {
  /** A partir do mês SUBSEQUENTE ao vencimento das verbas (Súmula 381 TST) */
  MES_SUBSEQUENTE_AO_VENCIMENTO = 'MSV',
  /** A partir do mês DE vencimento (sem shift) */
  MES_DO_VENCIMENTO = 'MV',
  /** Híbrido: mensais no subsequente, anuais/rescisórias no vencimento */
  MES_SUBSEQUENTE_E_MES_DO_VENCIMENTO = 'MSMV',
  /** Fase de atualização pós-apuração do crédito */
  ATUALIZACAO_CALCULO = 'AC',
}

// ─────────────────────────────────────────────────────────────────────────────
// Ocorrência de pagamento — OcorrenciaDePagamentoEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum OcorrenciaDePagamentoEnum {
  DESLIGAMENTO = 'DL',
  DEZEMBRO = 'DZ',
  MENSAL = 'M',
  PERIODO_AQUISITIVO = 'PA',
}

// ─────────────────────────────────────────────────────────────────────────────
// Juros — TipoDeJurosEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum TipoDeJurosEnum {
  SIMPLES = 'S',
  COMPOSTOS = 'C',
}

// ─────────────────────────────────────────────────────────────────────────────
// Quantidade de juros base — TipoDeQuantidadeDeJurosBaseEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum TipoDeQuantidadeDeJurosBaseEnum {
  INTEIRO = 'I',
  /** Fração pro-rata die (padrão do PJe-Calc para juros mensais) */
  FRACAO = 'F',
}

// ─────────────────────────────────────────────────────────────────────────────
// Regime de juros — JurosEnum (13 opções)
// ─────────────────────────────────────────────────────────────────────────────
export enum JurosEnum {
  JUROS_PADRAO = 'JPA',
  JUROS_POUPANCA = 'JPO',
  FAZENDA_PUBLICA = 'FPU',
  JUROS_MEIO_PORCENTO = 'JMP',
  JUROS_UM_PORCENTO = 'JUP',
  JUROS_ZERO_TRINTA_TRES = 'JZT',
  SELIC = 'SEL',
  SELIC_FAZENDA = 'SLF',
  SELIC_BACEN = 'SLB',
  TRD_SIMPLES = 'TRS',
  TRD_COMPOSTOS = 'TRC',
  TAXA_LEGAL = 'TXL',
  SEM_JUROS = 'SJU',
}

// ─────────────────────────────────────────────────────────────────────────────
// Base de juros das verbas — BaseDeJurosDasVerbasEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum BaseDeJurosDasVerbasEnum {
  /** Verbas (valor total, sem dedução INSS) */
  VERBAS = 'V',
  /** Verba (-) Contribuição Social — padrão empírico 100% dos PJC reais */
  VERBA_INSS = 'VI',
  /** Verba (-) CS (-) Previdência Privada */
  VERBA_INSS_PP = 'VIP',
}

// ─────────────────────────────────────────────────────────────────────────────
// Juros do ajuizamento — JurosDoAjuizamentoEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum JurosDoAjuizamentoEnum {
  OCORRENCIAS_VENCIDAS_E_VINCENDAS = 'M',
  OCORRENCIAS_VENCIDAS = 'V',
}

// ─────────────────────────────────────────────────────────────────────────────
// Lógico (SIM/NAO) — LogicoEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum LogicoEnum {
  SIM = 'S',
  NAO = 'N',
}

// ─────────────────────────────────────────────────────────────────────────────
// Característica da verba — CaracteristicaDaVerbaEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum CaracteristicaDaVerbaEnum {
  COMUM = 'C',
  DECIMO_TERCEIRO_SALARIO = 'DT',
  AVISO_PREVIO = 'AP',
  FERIAS = 'F',
}

// ─────────────────────────────────────────────────────────────────────────────
// Valor da verba — ValorDaVerbaEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum ValorDaVerbaEnum {
  CALCULADO = 'C',
  INFORMADO = 'I',
}

// ─────────────────────────────────────────────────────────────────────────────
// Modo de cálculo — ModoDeCalculoEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum ModoDeCalculoEnum {
  LIQUIDACAO = 'L',
  ATUALIZACAO = 'A',
  CARGA_INICIAL = 'C',
}

// ─────────────────────────────────────────────────────────────────────────────
// Fase do cálculo — FaseDoCalculoEnum (simplificado)
// ─────────────────────────────────────────────────────────────────────────────
export enum FaseDoCalculoEnum {
  CALCULANDO_BASE = 'CB',
  CALCULANDO_DIVISOR = 'CD',
  CALCULANDO_MULTIPLICADOR = 'CM',
  CALCULANDO_QUANTIDADE = 'CQ',
  CALCULANDO_VALOR_DEVIDO = 'CV',
  CALCULANDO_VALOR_PAGO = 'CP',
}

// ─────────────────────────────────────────────────────────────────────────────
// Comportamento de reflexo — ComportamentoDoReflexoEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum ComportamentoDoReflexoEnum {
  MEDIA = 'MD',
  MEDIA_PONDERADA = 'MP',
  MEDIA_PELO_VALOR = 'MV',
  NAO_APLICAR = 'NA',
}

// ─────────────────────────────────────────────────────────────────────────────
// Aliquota do FGTS — AliquotaDoFgtsEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum AliquotaDoFgtsEnum {
  OITO_PORCENTO = '8',
  DOIS_PORCENTO = '2',  // Lei 10.097/2000 — menor aprendiz
}

// ─────────────────────────────────────────────────────────────────────────────
// Base do FGTS — TipoDeBaseDoFgtsEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum TipoDeBaseDoFgtsEnum {
  DEVIDO = 'D',
  CORRIGIDO = 'C',
}

// ─────────────────────────────────────────────────────────────────────────────
// Divisor de Verba — DivisorDeVerbaEnum
// Porte de: negocio/constantes/DivisorDeVerbaEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum DivisorDeVerbaEnum {
  CARGA_HORARIA = 'CH',
  DIAS_UTEIS = 'DU',
  OUTRO_VALOR = 'OV',
  IMPORTADA_DO_CARTAO = 'CP',
}
