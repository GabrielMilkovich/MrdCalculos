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
// Quantidade — TipoDeQuantidadeEnum (Quantidade.java)
// ─────────────────────────────────────────────────────────────────────────────
export enum TipoDeQuantidadeEnum {
  INFORMADA = 'INF',
  IMPORTADA_DO_CALENDARIO = 'CAL',
  APURADA = 'APU',
  AVOS = 'AVO',
  IMPORTADA_DO_CARTAO = 'CDP',
}

export enum TipoDeQuantidadeImportadaDoCalendarioEnum {
  REPOUSOS = 'REP',
  DIAS_UTEIS = 'DUT',
  FERIADOS = 'FER',
  REPOUSOS_FERIADOS = 'REF',
}

export enum TipoDeQuantidadeImportadaDoCartaoDePontoEnum {
  HORAS_EXTRAS = 'HE',
  HORAS_NOTURNAS = 'HN',
  ADICIONAL_NOTURNO = 'AN',
  INTERVALO_INTRAJORNADA = 'II',
  INTERVALO_INTERJORNADAS = 'IJ',
  HORAS_DOMINGOS_FERIADOS = 'HDF',
}

// ─────────────────────────────────────────────────────────────────────────────
// Divisor — TipoDoDivisorEnum (Divisor.java)
// ─────────────────────────────────────────────────────────────────────────────
export enum TipoDoDivisorEnum {
  TRINTA = 'T30',
  DUZENTOS_E_VINTE = 'D220',
  CARGA_HORARIA = 'CH',
  OUTRO_VALOR = 'OV',
  HORAS_TRABALHADAS = 'HT',
}

// ─────────────────────────────────────────────────────────────────────────────
// BaseTabelada — TipoDeBaseTabeladaEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum TipoDeBaseTabeladaEnum {
  HISTORICO_SALARIAL = 'HIS',
  SALARIO_MINIMO = 'SM',
  MAIOR_REMUNERACAO = 'MR',
  ULTIMA_REMUNERACAO = 'UR',
  SALARIO_DA_CATEGORIA = 'SC',
  TETO_INSS = 'TI',
}

// ─────────────────────────────────────────────────────────────────────────────
// ValorPago — TipoDeValorPagoEnum
// ─────────────────────────────────────────────────────────────────────────────
export enum TipoDeValorPagoEnum {
  INFORMADO = 'INF',
  PROPORCIONAL_DEVIDO = 'PD',
  ZERO = 'ZER',
  HISTORICO = 'HIS',
}

// ─────────────────────────────────────────────────────────────────────────────
// Período da média do reflexo — PeriodoDaMediaDoReflexoEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum PeriodoDaMediaDoReflexoEnum {
  PERIODO_AQUISITIVO = 'PA',
  ANO_CIVIL = 'AC',
  ULTIMOS_DOZE_MESES_DO_CONTRATO = 'DM',
  DOZE_MESES_ANTERIORES_AO_VENCIMENTO_DA_PARCELA = 'DA',
}

// ─────────────────────────────────────────────────────────────────────────────
// Tratamento da fração de mês no reflexo — TratamentoDaFracaoDeMesDoReflexoEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum TratamentoDaFracaoDeMesDoReflexoEnum {
  MANTER = 'M',
  INTEGRALIZAR = 'I',
  DESPREZAR = 'D',
  DESPREZAR_MENOR_QUE_15_DIAS = 'DMQ',
}

// ─────────────────────────────────────────────────────────────────────────────
// Comportamento do reflexo (completo) — ComportamentoDoReflexoEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum ComportamentoDoReflexoEnumFull {
  VALOR_MENSAL = 'VM',
  MEDIA_PELA_QUANTIDADE = 'MQ',
  MEDIA_PELO_VALOR = 'MV',
  MEDIA_PELO_VALOR_CORRIGIDO = 'MC',
}

// ─────────────────────────────────────────────────────────────────────────────
// Situação de férias — SituacaoDaFeriasEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum SituacaoDaFeriasEnum {
  GOZADAS = 'GOZ',
  INDENIZADAS = 'IND',
  GOZADAS_PARCIALMENTE = 'GP',
  PERDIDAS = 'PER',
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipo de geração do reflexo — TipoDeGeracaoEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum TipoDeGeracaoEnum {
  DEVIDO = 'DEV',
  DIFERENCA = 'DIF',
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipo variação da parcela — TipoVariacaoDaParcelaEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum TipoVariacaoDaParcelaEnum {
  FIXA = 'F',
  VARIAVEL = 'V',
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipo de valor (HistoricoSalarial) — TipoValorEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum TipoValorEnum {
  INFORMADO = 'I',
  CALCULADO = 'C',
}

// ─────────────────────────────────────────────────────────────────────────────
// Base de cálculo do principal — BaseDeCalculoDoPrincipalEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum BaseDeCalculoDoPrincipalEnum {
  SALARIO_MINIMO = 'SM',
  SALARIO_CATEGORIA = 'SC',
  MAIOR_REMUNERACAO = 'MR',
  ULTIMA_REMUNERACAO = 'UR',
}

// ─────────────────────────────────────────────────────────────────────────────
// Regime de contrato — RegimeDoContratoEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum RegimeDoContratoEnum {
  TEMPO_INTEGRAL = 'TI',
  INTERMITENTE = 'IM',
  PARCIAL = 'PA',
}
