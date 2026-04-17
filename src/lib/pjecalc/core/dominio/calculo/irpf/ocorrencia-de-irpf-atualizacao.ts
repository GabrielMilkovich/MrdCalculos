/**
 * PJe-Calc v2.15.1 — OcorrenciaDeIrpfAtualizacao
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.OcorrenciaDeIrpfAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../calculo/irpf/OcorrenciaDeIrpfAtualizacao.java (~376 linhas)
 *
 * Snapshot de uma OcorrenciaDeIrpf em um evento de atualização (dataEvento).
 * Adiciona `dataEvento` + `hasPagamento`. `quantidadeCompetencias` aqui é
 * BigDecimal (Java) em vez de Integer (OcorrenciaDeIrpf base).
 */
import Decimal from 'decimal.js';
import { TipoOcorrenciaIrpfEnum } from '../../../constantes/enums';
import type { Irpf } from './irpf';

const ZERO = new Decimal(0);

function soma(a: Decimal, b: Decimal | null): Decimal { return b === null ? a : a.plus(b); }
function sub(a: Decimal, b: Decimal | null): Decimal { return b === null ? a : a.minus(b); }

export class OcorrenciaDeIrpfAtualizacao {
  private id: number | null = null;
  private hasPagamento: boolean = true;
  private irpf: Irpf | null = null;
  private dataOcorrencia: Date | null = null;
  private dataEvento: Date | null = null;
  private valorVerbas: Decimal | null = null;
  private valorJuros: Decimal | null = null;
  private valorContribuicaoSocial: Decimal | null = null;
  private valorPrevidenciaPrivada: Decimal | null = null;
  private valorPensaoAlimenticia: Decimal | null = null;
  private valorHonorarios: Decimal | null = null;
  private valorDependentes: Decimal | null = null;
  private valorAposentadoMaiorQue65: Decimal | null = null;
  private valorBase: Decimal = ZERO;
  private quantidadeCompetencias: Decimal | null = null;
  private valorInicialFaixa: Decimal = ZERO;
  private valorFinalFaixa: Decimal | null = null;
  private valorAliquota: Decimal = ZERO;
  private valorDeducao: Decimal = ZERO;
  private valorDevido: Decimal = ZERO;
  private readonly tipo: TipoOcorrenciaIrpfEnum;

  private precisaAtualizarBase: boolean = true;
  private precisaAtualizarDevido: boolean = true;

  constructor(tipo: TipoOcorrenciaIrpfEnum = TipoOcorrenciaIrpfEnum.NORMAL) {
    this.tipo = tipo;
  }

  getId(): number | null { return this.id; }
  setId(id: number): void { this.id = id; }

  getHasPagamento(): boolean { return this.hasPagamento; }
  setHasPagamento(v: boolean): void { this.hasPagamento = v; }

  getIrpf(): Irpf | null { return this.irpf; }
  setIrpf(irpf: Irpf | null): void { this.irpf = irpf; }

  getDataOcorrencia(): Date | null { return this.dataOcorrencia; }
  setDataOcorrencia(d: Date | null): void { this.dataOcorrencia = d; }

  getDataEvento(): Date | null { return this.dataEvento; }
  setDataEvento(d: Date | null): void { this.dataEvento = d; }

  getValorVerbas(): Decimal | null { return this.valorVerbas; }
  setValorVerbas(v: Decimal | null): void { this.valorVerbas = v; this.precisaAtualizarBase = true; }

  getValorJuros(): Decimal | null { return this.valorJuros; }
  setValorJuros(v: Decimal | null): void { this.valorJuros = v; this.precisaAtualizarBase = true; }

  getValorContribuicaoSocial(): Decimal | null { return this.valorContribuicaoSocial; }
  setValorContribuicaoSocial(v: Decimal | null): void { this.valorContribuicaoSocial = v; this.precisaAtualizarBase = true; }

  getValorPrevidenciaPrivada(): Decimal | null { return this.valorPrevidenciaPrivada; }
  setValorPrevidenciaPrivada(v: Decimal | null): void { this.valorPrevidenciaPrivada = v; this.precisaAtualizarBase = true; }

  getValorPensaoAlimenticia(): Decimal | null { return this.valorPensaoAlimenticia; }
  setValorPensaoAlimenticia(v: Decimal | null): void { this.valorPensaoAlimenticia = v; this.precisaAtualizarBase = true; }

  getValorHonorarios(): Decimal | null { return this.valorHonorarios; }
  setValorHonorarios(v: Decimal | null): void { this.valorHonorarios = v; this.precisaAtualizarBase = true; }

  getValorDependentes(): Decimal | null { return this.valorDependentes; }
  setValorDependentes(v: Decimal | null): void { this.valorDependentes = v; this.precisaAtualizarBase = true; }

  getValorAposentadoMaiorQue65(): Decimal | null { return this.valorAposentadoMaiorQue65; }
  setValorAposentadoMaiorQue65(v: Decimal | null): void { this.valorAposentadoMaiorQue65 = v; this.precisaAtualizarBase = true; }

  getValorBase(): Decimal {
    if (this.precisaAtualizarBase) {
      let base: Decimal = ZERO;
      base = soma(base, this.valorVerbas);
      base = soma(base, this.valorJuros);
      base = sub(base, this.valorContribuicaoSocial);
      base = sub(base, this.valorPrevidenciaPrivada);
      base = sub(base, this.valorPensaoAlimenticia);
      base = sub(base, this.valorHonorarios);
      base = sub(base, this.valorDependentes);
      base = sub(base, this.valorAposentadoMaiorQue65);
      if (base.isNegative()) base = ZERO;
      this.valorBase = base;
      this.precisaAtualizarBase = false;
    }
    return this.valorBase;
  }
  setValorBase(v: Decimal): void { this.valorBase = v; }

  getQuantidadeCompetencias(): Decimal | null { return this.quantidadeCompetencias; }
  setQuantidadeCompetencias(v: Decimal | null): void { this.quantidadeCompetencias = v; }

  getValorInicialFaixa(): Decimal { return this.valorInicialFaixa; }
  setValorInicialFaixa(v: Decimal): void { this.valorInicialFaixa = v; }

  getValorFinalFaixa(): Decimal | null { return this.valorFinalFaixa; }
  setValorFinalFaixa(v: Decimal | null): void { this.valorFinalFaixa = v; }

  getValorAliquota(): Decimal { return this.valorAliquota; }
  setValorAliquota(v: Decimal): void { this.valorAliquota = v; this.precisaAtualizarDevido = true; }

  getValorDeducao(): Decimal { return this.valorDeducao; }
  setValorDeducao(v: Decimal): void { this.valorDeducao = v; this.precisaAtualizarDevido = true; }

  atualizaBase(): void { this.precisaAtualizarBase = true; this.getValorBase(); }
  atualizaValorDevido(): void { this.precisaAtualizarDevido = true; this.getValorDevido(); }

  getValorDevido(): Decimal {
    if (this.precisaAtualizarBase || this.precisaAtualizarDevido) {
      let devido = this.getValorBase().times(this.valorAliquota).div(100);
      devido = devido.minus(this.valorDeducao);
      if (devido.isNegative()) devido = ZERO;
      this.valorDevido = devido;
      this.precisaAtualizarDevido = false;
    }
    return this.valorDevido;
  }
  setValorDevido(v: Decimal): void { this.valorDevido = v; }

  getTipo(): TipoOcorrenciaIrpfEnum { return this.tipo; }
}
