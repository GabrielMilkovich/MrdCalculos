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

// ─────────────────────────────────────────────────────────────────────────────
// Enums adicionais de Atualização (Fase 3) — ParametrosDeAtualizacao.java
// ─────────────────────────────────────────────────────────────────────────────
export enum IndiceDeCorrecaoDoFGTSEnum {
  UTILIZAR_INDICE_TRABALHISTA = 'IT',
  UTILIZAR_INDICE_FGTS = 'IF',
  UTILIZAR_OUTRO_INDICE = 'OI',
}

export enum OpcaoDeIndiceDeCorrecaoEnum {
  UTILIZAR_INDICE_TRABALHISTA = 'IT',
  UTILIZAR_OUTRO_INDICE = 'OI',
  SEM_CORRECAO = 'SC',
}

export enum TipoDaMultaDoINSSEnum {
  URBANA = 'U',
  RURAL = 'R',
}

export enum TipoPagamentoDaMultaDoINSSEnum {
  INTEGRAL = 'I',
  PARCELADA = 'P',
}

export enum FormaAplicacaoEnum {
  MES_A_MES = 'MM',
  ATE_DATA = 'AD',
  SEM_APLICACAO = 'SA',
}

export enum TipoPrecatorioEnumAtualizacao {
  PRE = 'PRE',
  RPV = 'RPV',
}

export enum GrupoEsferaPrecatorioEnum {
  FEDERAL = 'FED',
  ESTADUAL_MUNICIPAL = 'EM',
}

// ─────────────────────────────────────────────────────────────────────────────
// Honorário/Custas/Multa (Fase 8) — Enums do módulo
// ─────────────────────────────────────────────────────────────────────────────

/** TipoHonorarioEnum.java */
export enum TipoHonorarioEnum {
  ADVOCATICIOS = '0',
  ASSISTENCIAIS = '1',
  CONTRATUAIS = '2',
  PERICIAIS_CONTADOR = '3',
  PERICIAIS_DOCUMENTOSCOPIO = '4',
  PERICIAIS_ENGENHEIRO = '5',
  PERICIAIS_INTERPRETE = '6',
  PERICIAIS_MEDICO = '7',
  PERICIAIS_OUTROS = '8',
  SUCUMBENCIAIS = '9',
  LEILOEIRO = '10',
}

/** TipoDeDevedorDoHonorarioEnum.java */
export enum TipoDeDevedorDoHonorarioEnum {
  RECLAMANTE = 'RT',
  RECLAMADO = 'RD',
}

/** TipoDocumentoFiscalEnum.java */
export enum TipoDocumentoFiscalEnum {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  CEI = 'CEI',
}

/** TipoDeImpostoDeRendaEnum.java */
export enum TipoDeImpostoDeRendaEnum {
  PESSOA_FISICA = 'PF',
  PESSOA_JURIDICA = 'PJ',
}

/** BaseParaApuracaoDeHonorarioEnum.java */
export enum BaseParaApuracaoDeHonorarioEnum {
  BRUTO = 'B',
  BRUTO_MENOS_CONTRIBUICAO_SOCIAL = 'BC',
  BRUTO_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA = 'BCP',
  VERBAS_QUE_NAO_COMPOE_O_PRINCIPAL = 'VNP',
}

/** TipoCobrancaReclamanteEnum.java */
export enum TipoCobrancaReclamanteEnum {
  DESCONTAR_CREDITO = 'D',
  COBRAR = 'C',
}

/** TipoOrigemRegistroEnum.java */
export enum TipoOrigemRegistroEnum {
  CALCULO = 'C',
  ATUALIZACAO = 'A',
}

/** BaseParaApuracaoDeMultaEnum.java */
export enum BaseParaApuracaoDeMultaEnum {
  PRINCIPAL = 'P',
  PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL = 'PC',
  PRINCIPAL_MENOS_CONTRIBUICAO_SOCIAL_MENOS_PREVIDENCIA_PRIVADA = 'PCP',
  VALOR_CAUSA = 'VC',
}

/** CredorDevedorMultaEnum.java */
export enum CredorDevedorMultaEnum {
  RECLAMANTE_RECLAMADO = 'RTRD',
  RECLAMADO_RECLAMANTE = 'RDRT',
  TERCEIRO_RECLAMANTE = 'TRT',
  TERCEIRO_RECLAMADO = 'TRD',
}

/** BaseParaCustasCalculadasEnum.java */
export enum BaseParaCustasCalculadasEnum {
  BRUTO_DEVIDO_AO_RECLAMANTE = 'BR',
  BRUTO_DEVIDO_AO_RECLAMANTE_MAIS_DEBITOS_RECLAMADO = 'BROR',
}

/** TipoDeCustasDeConhecimentoEnum.java */
export enum TipoDeCustasDeConhecimentoEnum {
  NAO_SE_APLICA = 'N',
  CALCULADA_2_POR_CENTO = 'C',
  INFORMADA = 'I',
}

/** TipoDeCustasDeLiquidacaoEnum.java */
export enum TipoDeCustasDeLiquidacaoEnum {
  NAO_SE_APLICA = 'N',
  CALCULADA_MEIO_POR_CENTO = 'C',
  INFORMADA = 'I',
}

/** TipoDePaganteEnum.java */
export enum TipoDePaganteEnum {
  RECLAMANTE = 'RT',
  RECLAMADO = 'RD',
}

/** TipoDeAutoEnum.java */
export enum TipoDeAutoEnum {
  REMICAO = 'R',
  ADJUDICACAO = 'AD',
  ARREMATACAO = 'AR',
}

/** CustasDevidasFixasEnum.java */
export enum CustasDevidasFixasEnum {
  ATOS_URBANOS_DO_OFICIAL_DE_JUSTICA = 'ATOS_URBANOS_DO_OFICIAL_DE_JUSTICA',
  ATOS_RURAIS_DO_OFICIAL_DE_JUSTICA = 'ATOS_RURAIS_DO_OFICIAL_DE_JUSTICA',
  AGRAVO_DE_INSTRUMENTO = 'AGRAVO_DE_INSTRUMENTO',
  AGRAVO_DE_PETICAO = 'AGRAVO_DE_PETICAO',
  IMPUGNACAO_SENTENCA_DE_LIQUIDACAO = 'IMPUGNACAO_SENTENCA_DE_LIQUIDACAO',
  EMBARGOS_A_ARREMATACAO = 'EMBARGOS_A_ARREMATACAO',
  EMBARGOS_A_EXECUCAO = 'EMBARGOS_A_EXECUCAO',
  EMBARGOS_DE_TERCEIROS = 'EMBARGOS_DE_TERCEIROS',
  RECURSO_DE_REVISTA = 'RECURSO_DE_REVISTA',
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagamento (Fase 9) — Enums de vínculo
// ─────────────────────────────────────────────────────────────────────────────

/** TipoVinculoDeHonorarioDoPagamentoEnum.java */
export enum TipoVinculoDeHonorarioDoPagamentoEnum {
  DEBITOSRECLAMANTE = 'D',
  OUTROSDEBITOSRECLAMADO = 'O',
  DEBITOSCOBRARRECLAMANTE = 'C',
}

/** TipoVinculoDeMultaDoPagamentoEnum.java */
export enum TipoVinculoDeMultaDoPagamentoEnum {
  DEBITOSRECLAMANTE = 'D',
  OUTROSDEBITOSRECLAMADO = 'O',
  DEBITOSCOBRARRECLAMANTE = 'C',
}

// ─────────────────────────────────────────────────────────────────────────────
// IRPF (Fase 7) — TipoOcorrenciaIrpfEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum TipoOcorrenciaIrpfEnum {
  NORMAL = 'N',
  TRIBUTACAO_EM_SEPARADO = 'S',
  TRIBUTACAO_EXCLUSIVA = 'E',
  RRA_ANOS_ANTERIORES = 'A',
}

// ─────────────────────────────────────────────────────────────────────────────
// INSS (Fase 6) — TipoDeAliquotaDoSeguradoEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum TipoDeAliquotaDoSeguradoEnum {
  SEGURADO_EMPREGADO = 'SE',
  EMPREGADO_DOMESTICO = 'ED',
  FIXA = 'F',
}

// ─────────────────────────────────────────────────────────────────────────────
// INSS (Fase 6) — TipoDeAliquotaDoEmpregadorEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum TipoDeAliquotaDoEmpregadorEnum {
  POR_ATIVIDADE_ECONOMICA = 'A',
  POR_PERIODO = 'PP',
  FIXA = 'F',
}

// ─────────────────────────────────────────────────────────────────────────────
// Calculo (Fase 10) — Enums principais
// ─────────────────────────────────────────────────────────────────────────────

/** TipoCalculoEnum.java */
export enum TipoCalculoEnum {
  ADVOGADO = 'A',
  CREDOR = 'C',
  DEVEDOR = 'D',
  VARA = 'V',
  GABINETE = 'G',
}

/** TipoDeApuracaoPrazoDoAvisoPrevioEnum.java */
export enum TipoDeApuracaoPrazoDoAvisoPrevioEnum {
  NAO_APURAR = 'N',
  APURACAO_CALCULADA = 'C',
  APURACAO_INFORMADA = 'I',
}

/** InstanciaSetorEnum.java */
export enum InstanciaSetorEnum {
  PRIMEIRA = '1',
  SEGUNDA = '2',
}

/** TipoVinculoDeVerbaEnum.java — VerbaDeCalculo → HistoricoSalarial/ValeTransporte */
export enum TipoVinculoDeVerbaEnum {
  BASE = 'B',
  VALOR_PAGO = 'P',
}

/** TipoRegistroCalculoWS.java — usado por HistoricoValidacaoDoCalculo. */
export enum TipoRegistroCalculoWS {
  CALCULO = 'C',
  ATUALIZACAO = 'A',
}

// ─────────────────────────────────────────────────────────────────────────────
// Cartão de Ponto (Fase 13) — Enums de apuração
// ─────────────────────────────────────────────────────────────────────────────

/** FormaDeApuracaoCartaoEnum.java */
export enum FormaDeApuracaoCartaoEnum {
  NAO_APURAR_HORAS_EXTRAS = 'NAP',
  HORAS_EXTRAS_EXCEDENTES_DA_JORNADA_DIARIA = 'HJD',
  HORAS_EXTRAS_PELO_CRITERIO_MAIS_FAVORAVEL = 'HMF',
  HORAS_EXTRAS_CONFORME_SUMULA_85 = 'HST',
  APURA_PRIMEIRAS_HORAS_EXTRAS_SEPARADO = 'APH',
  HORAS_EXTRAS_EXCEDENTES_DA_JORNADA_SEMANAL = 'HJS',
  HORAS_EXTRAS_EXCEDENTES_DA_JORNADA_MENSAL = 'HJM',
}

/** HorarioNoturnoApuracaroCartaoEnum.java (sic — typo do Java preservado) */
export enum HorarioNoturnoApuracaroCartaoEnum {
  ATIVIDADE_AGRICOLA = 'AAG',
  ATIVIDADE_PECUARIA = 'APE',
  ATIVIDADE_URBANA = 'AUR',
}

/** PreenchimentoJornadasCartaoEnum.java (sem o "s" do Java) — sinônimo. */
export enum PreenchimentoJornadaCartaoEnum {
  LIVRE = 'LIV',
  PROGRAMACAO = 'PRO',
  ESCALA = 'ESC',
}

/** TipoEscalaPreenchimentoJornadaCartaoEnum.java */
export enum TipoEscalaPreenchimentoJornadaCartaoEnum {
  OUTRA = 'O',
  DOZE_POR_DOZE = 'Z',
  DOZE_POR_VINTE_QUATRO = 'V',
  DOZE_POR_TRINTA_E_SEIS = 'D',
  DOZE_POR_QUARENTA_E_OITO = 'Q',
  CINCO_POR_UM = 'C',
  SEIS_POR_UM = 'S',
  OITO_DOIS = 'T',
}

/** TipoPreenchimentoJornadaCartaoEnum.java */
export enum TipoPreenchimentoJornadaCartaoEnum {
  SEMANAL = 'S',
  ESCALA = 'E',
}

/** SemanaEnum.java — numerais internos diferem dos getDay() nativos. */
export enum SemanaEnum {
  FERIADO = 0,
  DOMINGO = 1,
  SEGUNDA = 2,
  TERCA = 3,
  QUARTA = 4,
  QUINTA = 5,
  SEXTA = 6,
  SABADO = 7,
=======
// Divisor de Verba — DivisorDeVerbaEnum
// Porte de: negocio/constantes/DivisorDeVerbaEnum.java
// ─────────────────────────────────────────────────────────────────────────────
export enum DivisorDeVerbaEnum {
  CARGA_HORARIA = 'CH',
  DIAS_UTEIS = 'DU',
  OUTRO_VALOR = 'OV',
  IMPORTADA_DO_CARTAO = 'CP',
}
