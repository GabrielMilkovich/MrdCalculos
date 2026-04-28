/**
 * PJe-Calc v2.15.1 — ApuracaoCartaoDePonto (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoCartaoDePonto
 *
 * Ref Java: pjecalc-fonte/.../cartaodeponto/ApuracaoCartaoDePonto.java (~1214 linhas)
 *
 * Configuração de como apurar horas extras sobre os registros de ponto.
 * Contém ~100 fields controlando forma de apuração, jornada diária por
 * dia da semana, intervalos, supressões, horário noturno, tolerância etc.
 *
 * **Status**: stub estrutural com os campos essenciais. A lógica de apuração
 * (totalHorasNoturnas, horasExtras por critério) virá em fase posterior
 * quando `MaquinaDeCalculoDeCartaoDePonto` for implementada.
 */
import type Decimal from 'decimal.js';
import type { Calculo } from '../calculo/calculo';
import {
  FormaDeApuracaoCartaoEnum,
  HorarioNoturnoApuracaroCartaoEnum,
  PreenchimentoJornadaCartaoEnum,
  TipoPreenchimentoJornadaCartaoEnum,
  TipoEscalaPreenchimentoJornadaCartaoEnum,
} from '../../constantes/enums';
import type { OcorrenciaJornadaApuracaoCartao } from './ocorrencia-jornada-apuracao-cartao';
import type { PreenchimentoJornadaApuracaoCartao } from './preenchimento-jornada-apuracao-cartao';

export class ApuracaoCartaoDePonto {
  private id: number | null = null;
  private versao: number = 0;
  private calculo: Calculo | null = null;

  // Período
  private dataInicial: Date | null = null;
  private dataFinal: Date | null = null;
  private qtExpedientes: number | null = null;

  // Forma de apuração
  private formaDeApuracaoCartao: FormaDeApuracaoCartaoEnum = FormaDeApuracaoCartaoEnum.HORAS_EXTRAS_PELO_CRITERIO_MAIS_FAVORAVEL;
  private qtHorasExtasSumulaTST: string = '02:00';
  private qtPrimeirasHorasExtrasSeparado: string = '02:00';
  private extraDescansoSeparado: boolean = false;
  private extraFeriadoSeparado: boolean = false;
  private extraSabadoDomingoSeparado: boolean = false;
  private considerarFeriados: boolean = true;

  // Tolerância
  private tolerancia: boolean = false;
  private toleranciaPorTurno: string = '00:05';
  private toleranciaPorDia: string = '00:10';

  // Jornada diária (por dia da semana) — formato "HH:mm"
  private valorJornadaDiariaSegundaFeira: string | null = null;
  private valorJornadaDiariaTercaFeira: string | null = null;
  private valorJornadaDiariaQuartaFeira: string | null = null;
  private valorJornadaDiariaQuintaFeira: string | null = null;
  private valorJornadaDiariaSextaFeira: string | null = null;
  private valorJornadaDiariaSab: string | null = null;
  private valorJornadaDiariaDom: string = '00:00';

  // Jornadas semanal/mensal
  private qtJornadaSemanal: Decimal | null = null;
  private qtJornadaMensal: Decimal | null = null;

  // Flags de feriado
  private considerarJornadaDiariaFeriadoTrabalhado: boolean = false;
  private considerarJornadaDiariaFeriadoNaoTrabalhado: boolean = false;

  // Intervalos intrajornada
  private intervaloIntraJornadaSupQuatroSeis: boolean = false;
  private valorIntervaloIntraJornadaSupQuatroSeis: string = '00:15';
  private intervalorIntraJornadaSupSeis: boolean = false;
  private valorIntervalorIntraJornadaSupSeis: string = '01:00';
  private toleranciaIntervaloIntraJornadaSupSeis: string = '00:05';
  private apurarSupressaoIntervaloIntraIntegral: boolean = false;
  private apurarSupressaoIntervaloIntraReforma: boolean = false;
  private considerarFracionamentoIntervaloIntra: boolean = false;
  private apurarExcessoIntervaloIntra: boolean = false;
  private intervaloIntrajornadaMaximo: string = '02:00';
  private apurarApenasExcessoAcimaJornada: boolean = false;

  // Art. 253 CLT (câmaras frigoríficas)
  private apurarSupressaoIntervaloArt253: boolean = false;
  private valorTrabalhoArt253: string = '01:40';
  private valorDescansoArt253: string = '00:20';

  // Horário noturno
  private horarioProrrogadoSumula60: boolean = false;
  private forcarProrrogacao: boolean = false;
  private considerarReducaoFictaDaHoraNoturna: boolean = false;
  private horarioNoturnoApuracaroCartao: HorarioNoturnoApuracaroCartaoEnum = HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_URBANA;

  // Preenchimento da jornada
  private tipoPreenchimento: TipoPreenchimentoJornadaCartaoEnum = TipoPreenchimentoJornadaCartaoEnum.SEMANAL;
  private preenchimentoJornadas: PreenchimentoJornadaCartaoEnum = PreenchimentoJornadaCartaoEnum.LIVRE;
  private tipoEscala: TipoEscalaPreenchimentoJornadaCartaoEnum | null = null;

  // Coleções
  private ocorrencias: OcorrenciaJornadaApuracaoCartao[] = [];
  private preenchimentos: PreenchimentoJornadaApuracaoCartao[] = [];

  // ─── Getters/Setters ───
  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getCalculo(): Calculo | null { return this.calculo; }
  setCalculo(c: Calculo | null): void { this.calculo = c; }

  getDataInicial(): Date | null { return this.dataInicial; }
  setDataInicial(d: Date | null): void { this.dataInicial = d; }

  getDataFinal(): Date | null { return this.dataFinal; }
  setDataFinal(d: Date | null): void { this.dataFinal = d; }

  getQtExpedientes(): number | null { return this.qtExpedientes; }
  setQtExpedientes(v: number | null): void { this.qtExpedientes = v; }

  getFormaDeApuracaoCartao(): FormaDeApuracaoCartaoEnum { return this.formaDeApuracaoCartao; }
  setFormaDeApuracaoCartao(v: FormaDeApuracaoCartaoEnum): void { this.formaDeApuracaoCartao = v; }

  getQtHorasExtasSumulaTST(): string { return this.qtHorasExtasSumulaTST; }
  setQtHorasExtasSumulaTST(v: string): void { this.qtHorasExtasSumulaTST = v; }

  getQtPrimeirasHorasExtrasSeparado(): string { return this.qtPrimeirasHorasExtrasSeparado; }
  setQtPrimeirasHorasExtrasSeparado(v: string): void { this.qtPrimeirasHorasExtrasSeparado = v; }

  getExtraDescansoSeparado(): boolean { return this.extraDescansoSeparado; }
  setExtraDescansoSeparado(v: boolean): void { this.extraDescansoSeparado = v; }

  getExtraFeriadoSeparado(): boolean { return this.extraFeriadoSeparado; }
  setExtraFeriadoSeparado(v: boolean): void { this.extraFeriadoSeparado = v; }

  getExtraSabadoDomingoSeparado(): boolean { return this.extraSabadoDomingoSeparado; }
  setExtraSabadoDomingoSeparado(v: boolean): void { this.extraSabadoDomingoSeparado = v; }

  getConsiderarFeriados(): boolean { return this.considerarFeriados; }
  setConsiderarFeriados(v: boolean): void { this.considerarFeriados = v; }

  getTolerancia(): boolean { return this.tolerancia; }
  setTolerancia(v: boolean): void { this.tolerancia = v; }

  getToleranciaPorTurno(): string { return this.toleranciaPorTurno; }
  setToleranciaPorTurno(v: string): void { this.toleranciaPorTurno = v; }

  getToleranciaPorDia(): string { return this.toleranciaPorDia; }
  setToleranciaPorDia(v: string): void { this.toleranciaPorDia = v; }

  getValorJornadaDiariaSegundaFeira(): string | null { return this.valorJornadaDiariaSegundaFeira; }
  setValorJornadaDiariaSegundaFeira(v: string | null): void { this.valorJornadaDiariaSegundaFeira = v; }

  getValorJornadaDiariaTercaFeira(): string | null { return this.valorJornadaDiariaTercaFeira; }
  setValorJornadaDiariaTercaFeira(v: string | null): void { this.valorJornadaDiariaTercaFeira = v; }

  getValorJornadaDiariaQuartaFeira(): string | null { return this.valorJornadaDiariaQuartaFeira; }
  setValorJornadaDiariaQuartaFeira(v: string | null): void { this.valorJornadaDiariaQuartaFeira = v; }

  getValorJornadaDiariaQuintaFeira(): string | null { return this.valorJornadaDiariaQuintaFeira; }
  setValorJornadaDiariaQuintaFeira(v: string | null): void { this.valorJornadaDiariaQuintaFeira = v; }

  getValorJornadaDiariaSextaFeira(): string | null { return this.valorJornadaDiariaSextaFeira; }
  setValorJornadaDiariaSextaFeira(v: string | null): void { this.valorJornadaDiariaSextaFeira = v; }

  getValorJornadaDiariaSab(): string | null { return this.valorJornadaDiariaSab; }
  setValorJornadaDiariaSab(v: string | null): void { this.valorJornadaDiariaSab = v; }

  getValorJornadaDiariaDom(): string { return this.valorJornadaDiariaDom; }
  setValorJornadaDiariaDom(v: string): void { this.valorJornadaDiariaDom = v; }

  getQtJornadaSemanal(): Decimal | null { return this.qtJornadaSemanal; }
  setQtJornadaSemanal(v: Decimal | null): void { this.qtJornadaSemanal = v; }

  getQtJornadaMensal(): Decimal | null { return this.qtJornadaMensal; }
  setQtJornadaMensal(v: Decimal | null): void { this.qtJornadaMensal = v; }

  getConsiderarJornadaDiariaFeriadoTrabalhado(): boolean { return this.considerarJornadaDiariaFeriadoTrabalhado; }
  setConsiderarJornadaDiariaFeriadoTrabalhado(v: boolean): void { this.considerarJornadaDiariaFeriadoTrabalhado = v; }

  getConsiderarJornadaDiariaFeriadoNaoTrabalhado(): boolean { return this.considerarJornadaDiariaFeriadoNaoTrabalhado; }
  setConsiderarJornadaDiariaFeriadoNaoTrabalhado(v: boolean): void { this.considerarJornadaDiariaFeriadoNaoTrabalhado = v; }

  getIntervaloIntraJornadaSupQuatroSeis(): boolean { return this.intervaloIntraJornadaSupQuatroSeis; }
  setIntervaloIntraJornadaSupQuatroSeis(v: boolean): void { this.intervaloIntraJornadaSupQuatroSeis = v; }

  getValorIntervaloIntraJornadaSupQuatroSeis(): string { return this.valorIntervaloIntraJornadaSupQuatroSeis; }
  setValorIntervaloIntraJornadaSupQuatroSeis(v: string): void { this.valorIntervaloIntraJornadaSupQuatroSeis = v; }

  getIntervalorIntraJornadaSupSeis(): boolean { return this.intervalorIntraJornadaSupSeis; }
  setIntervalorIntraJornadaSupSeis(v: boolean): void { this.intervalorIntraJornadaSupSeis = v; }

  getValorIntervalorIntraJornadaSupSeis(): string { return this.valorIntervalorIntraJornadaSupSeis; }
  setValorIntervalorIntraJornadaSupSeis(v: string): void { this.valorIntervalorIntraJornadaSupSeis = v; }

  getToleranciaIntervaloIntraJornadaSupSeis(): string { return this.toleranciaIntervaloIntraJornadaSupSeis; }
  setToleranciaIntervaloIntraJornadaSupSeis(v: string): void { this.toleranciaIntervaloIntraJornadaSupSeis = v; }

  getApurarSupressaoIntervaloIntraIntegral(): boolean { return this.apurarSupressaoIntervaloIntraIntegral; }
  setApurarSupressaoIntervaloIntraIntegral(v: boolean): void { this.apurarSupressaoIntervaloIntraIntegral = v; }

  getApurarSupressaoIntervaloIntraReforma(): boolean { return this.apurarSupressaoIntervaloIntraReforma; }
  setApurarSupressaoIntervaloIntraReforma(v: boolean): void { this.apurarSupressaoIntervaloIntraReforma = v; }

  getConsiderarFracionamentoIntervaloIntra(): boolean { return this.considerarFracionamentoIntervaloIntra; }
  setConsiderarFracionamentoIntervaloIntra(v: boolean): void { this.considerarFracionamentoIntervaloIntra = v; }

  getApurarExcessoIntervaloIntra(): boolean { return this.apurarExcessoIntervaloIntra; }
  setApurarExcessoIntervaloIntra(v: boolean): void { this.apurarExcessoIntervaloIntra = v; }

  getIntervaloIntrajornadaMaximo(): string { return this.intervaloIntrajornadaMaximo; }
  setIntervaloIntrajornadaMaximo(v: string): void { this.intervaloIntrajornadaMaximo = v; }

  getApurarApenasExcessoAcimaJornada(): boolean { return this.apurarApenasExcessoAcimaJornada; }
  setApurarApenasExcessoAcimaJornada(v: boolean): void { this.apurarApenasExcessoAcimaJornada = v; }

  getApurarSupressaoIntervaloArt253(): boolean { return this.apurarSupressaoIntervaloArt253; }
  setApurarSupressaoIntervaloArt253(v: boolean): void { this.apurarSupressaoIntervaloArt253 = v; }

  getValorTrabalhoArt253(): string { return this.valorTrabalhoArt253; }
  setValorTrabalhoArt253(v: string): void { this.valorTrabalhoArt253 = v; }

  getValorDescansoArt253(): string { return this.valorDescansoArt253; }
  setValorDescansoArt253(v: string): void { this.valorDescansoArt253 = v; }

  getHorarioProrrogadoSumula60(): boolean { return this.horarioProrrogadoSumula60; }
  setHorarioProrrogadoSumula60(v: boolean): void { this.horarioProrrogadoSumula60 = v; }

  getForcarProrrogacao(): boolean { return this.forcarProrrogacao; }
  setForcarProrrogacao(v: boolean): void { this.forcarProrrogacao = v; }

  getConsiderarReducaoFictaDaHoraNoturna(): boolean { return this.considerarReducaoFictaDaHoraNoturna; }
  setConsiderarReducaoFictaDaHoraNoturna(v: boolean): void { this.considerarReducaoFictaDaHoraNoturna = v; }

  getHorarioNoturnoApuracaroCartao(): HorarioNoturnoApuracaroCartaoEnum { return this.horarioNoturnoApuracaroCartao; }
  setHorarioNoturnoApuracaroCartao(v: HorarioNoturnoApuracaroCartaoEnum): void { this.horarioNoturnoApuracaroCartao = v; }

  getTipoPreenchimento(): TipoPreenchimentoJornadaCartaoEnum { return this.tipoPreenchimento; }
  setTipoPreenchimento(v: TipoPreenchimentoJornadaCartaoEnum): void { this.tipoPreenchimento = v; }

  getPreenchimentoJornadas(): PreenchimentoJornadaCartaoEnum { return this.preenchimentoJornadas; }
  setPreenchimentoJornadas(v: PreenchimentoJornadaCartaoEnum): void { this.preenchimentoJornadas = v; }

  getTipoEscala(): TipoEscalaPreenchimentoJornadaCartaoEnum | null { return this.tipoEscala; }
  setTipoEscala(v: TipoEscalaPreenchimentoJornadaCartaoEnum | null): void { this.tipoEscala = v; }

  getOcorrencias(): OcorrenciaJornadaApuracaoCartao[] { return this.ocorrencias; }
  setOcorrencias(v: OcorrenciaJornadaApuracaoCartao[]): void { this.ocorrencias = v; }

  getPreenchimentos(): PreenchimentoJornadaApuracaoCartao[] { return this.preenchimentos; }
  setPreenchimentos(v: PreenchimentoJornadaApuracaoCartao[]): void { this.preenchimentos = v; }

  /**
   * Início do horário noturno conforme atividade econômica.
   * Porte 1-a-1 de ApuracaoCartaoDePonto.java:809-817.
   *
   * - ATIVIDADE_AGRICOLA → 21:00 (CLT art. 7º Lei 5.889/73)
   * - ATIVIDADE_PECUARIA → 20:00
   * - ATIVIDADE_URBANA → 22:00 (CLT art. 73 §2º, padrão)
   */
  obterInicioAtividadeHorarioNoturno(): string {
    switch (this.horarioNoturnoApuracaroCartao) {
      case HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_AGRICOLA: return '21:00';
      case HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_PECUARIA: return '20:00';
      default: return '22:00';
    }
  }

  /**
   * Fim do horário noturno conforme atividade econômica.
   * Porte 1-a-1 de ApuracaoCartaoDePonto.java:819-827.
   *
   * - ATIVIDADE_AGRICOLA → 05:00 (Lei 5.889/73)
   * - ATIVIDADE_PECUARIA → 04:00
   * - ATIVIDADE_URBANA → 05:00 (CLT art. 73 §2º)
   *
   * Nota: agrícola e urbana têm mesmo fim (05:00), apesar de ramos diferentes
   * no switch Java. Preservado 1-a-1.
   */
  obterFimAtividadeHorarioNoturno(): string {
    switch (this.horarioNoturnoApuracaroCartao) {
      case HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_AGRICOLA: return '05:00';
      case HorarioNoturnoApuracaroCartaoEnum.ATIVIDADE_PECUARIA: return '04:00';
      default: return '05:00';
    }
  }
}
