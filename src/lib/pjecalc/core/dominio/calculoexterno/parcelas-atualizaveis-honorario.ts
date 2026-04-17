/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisHonorario
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorario
 *
 * Ref Java: ~435 linhas.
 */
import Decimal from 'decimal.js';
import { NegocioException } from '../../comum/exceptions/negocio-exception';
import { MensagemDeRecurso } from '../../comum/mensagem-de-recurso';
import { Mensagens } from '../../comum/mensagens';
import {
  IndiceMonetarioEnum,
  TipoCobrancaReclamanteEnum,
  TipoDeImpostoDeRendaEnum,
  TipoDocumentoFiscalEnum,
  TipoHonorarioEnum,
  TipoValorEnum,
} from '../../constantes/enums';
import type { ParcelasAtualizaveisDebitosReclamante } from './parcelas-atualizaveis-debitos-reclamante';
import type { ParcelasAtualizaveisDescontoCreditosReclamante } from './parcelas-atualizaveis-desconto-creditos-reclamante';
import type { ParcelasAtualizaveisOutrosDebitosReclamado } from './parcelas-atualizaveis-outros-debitos-reclamado';

/** Honorario é uma entidade do pacote calculo/honorarios (não portada ainda). */
export type HonorarioRef = unknown;

export class ParcelasAtualizaveisHonorario {
  private id: number | null = null;
  private descontoCreditosReclamante: ParcelasAtualizaveisDescontoCreditosReclamante | null = null;
  private outrosDebitosReclamado: ParcelasAtualizaveisOutrosDebitosReclamado | null = null;
  private debitosReclamante: ParcelasAtualizaveisDebitosReclamante | null = null;
  private honorario: HonorarioRef | null = null;
  private descricao: string | null = null;
  private tipo: TipoHonorarioEnum = TipoHonorarioEnum.ADVOCATICIOS;
  private credor: string | null = null;
  private tipoDocFiscal: TipoDocumentoFiscalEnum = TipoDocumentoFiscalEnum.CPF;
  private numeroDocFiscal: string | null = null;
  private apurarIrpf: boolean = false;
  private incidirIrpfSobreJuros: boolean = false;
  private tipoIrpf: TipoDeImpostoDeRendaEnum | null = TipoDeImpostoDeRendaEnum.PESSOA_FISICA;
  private tipoValor: TipoValorEnum = TipoValorEnum.INFORMADO;
  private valorParcelaInformado: Decimal | null = null;
  private valorJurosInformado: Decimal | null = null;
  private indiceTrabalhistaInformado: IndiceMonetarioEnum | null = IndiceMonetarioEnum.INDICE_TRABALHISTA;
  private aplicarJurosInformado: boolean = false;
  private dataApartirDeAplicarJurosInformado: Date | null = null;
  private aplicarDescontoContribSocialCalculado: boolean = false;
  private aplicarDescontoPrevPrivadaCalculado: boolean = false;
  private taxaCalculado: Decimal | null = null;
  private tipoCobrancaReclamante: TipoCobrancaReclamanteEnum = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;
  private readonly timestampCriacao: number = Date.now();

  validar(): this {
    const excecao = new NegocioException();
    if (this.apurarIrpf) {
      if (!this.numeroDocFiscal || this.numeroDocFiscal.trim() === '') {
        excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0003, 'Documento Fiscal'));
      }
      if (this.tipoIrpf == null) {
        excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0003, 'Tipo de Imposto de Renda'));
      }
    }
    if (excecao.existeMensagensDeRecurso()) throw excecao;
    return this;
  }

  clonar(): ParcelasAtualizaveisHonorario {
    const clone = new ParcelasAtualizaveisHonorario();
    clone.aplicarJurosInformado = this.aplicarJurosInformado;
    clone.dataApartirDeAplicarJurosInformado = this.dataApartirDeAplicarJurosInformado;
    clone.apurarIrpf = this.apurarIrpf;
    clone.credor = this.credor;
    clone.debitosReclamante = this.debitosReclamante;
    clone.aplicarDescontoContribSocialCalculado = this.aplicarDescontoContribSocialCalculado;
    clone.descontoCreditosReclamante = this.descontoCreditosReclamante;
    clone.aplicarDescontoPrevPrivadaCalculado = this.aplicarDescontoPrevPrivadaCalculado;
    clone.descricao = this.descricao;
    clone.incidirIrpfSobreJuros = this.incidirIrpfSobreJuros;
    clone.indiceTrabalhistaInformado = this.indiceTrabalhistaInformado;
    clone.numeroDocFiscal = this.numeroDocFiscal;
    clone.outrosDebitosReclamado = this.outrosDebitosReclamado;
    clone.taxaCalculado = this.taxaCalculado;
    clone.tipo = this.tipo;
    clone.tipoDocFiscal = this.tipoDocFiscal;
    clone.tipoIrpf = this.tipoIrpf;
    clone.tipoValor = this.tipoValor;
    clone.valorJurosInformado = this.valorJurosInformado;
    clone.valorParcelaInformado = this.valorParcelaInformado;
    clone.tipoCobrancaReclamante = this.tipoCobrancaReclamante;
    clone.honorario = this.honorario;
    return clone;
  }

  obterChavePrimaria(): number | null { return this.id; }

  getValorBaseCalculo(): Decimal {
    let base = new Decimal(0);
    if (this.tipoValor === TipoValorEnum.INFORMADO) {
      base = base.plus(this.valorParcelaInformado ?? new Decimal(0))
                 .plus(this.valorJurosInformado ?? new Decimal(0));
    }
    return base;
  }

  getBaseDeCalculoDescricao(): string {
    const parts: string[] = [];
    if (this.tipoValor === TipoValorEnum.CALCULADO) {
      parts.push('(+) Bruto Dev. Reclamante');
      if (this.aplicarDescontoContribSocialCalculado) parts.push(' (-) Desc. Contrib. Social');
      if (this.aplicarDescontoPrevPrivadaCalculado) parts.push(' (-) Desc. Prev. Privada');
    }
    return parts.join('');
  }

  getTimestampCriacao(): number { return this.timestampCriacao; }

  getDescricao(): string | null { return this.descricao; }
  setDescricao(v: string | null): void { this.descricao = v; }

  getTipo(): TipoHonorarioEnum { return this.tipo; }
  setTipo(v: TipoHonorarioEnum): void { this.tipo = v; }

  getCredor(): string | null { return this.credor; }
  setCredor(v: string | null): void { this.credor = v; }

  getApurarIrpf(): boolean { return this.apurarIrpf; }
  setApurarIrpf(v: boolean): void { this.apurarIrpf = v; }

  getIncidirIrpfSobreJuros(): boolean { return this.incidirIrpfSobreJuros; }
  setIncidirIrpfSobreJuros(v: boolean): void { this.incidirIrpfSobreJuros = v; }

  getTipoValor(): TipoValorEnum { return this.tipoValor; }
  setTipoValor(v: TipoValorEnum): void { this.tipoValor = v; }

  getValorParcelaInformado(): Decimal | null { return this.valorParcelaInformado; }
  setValorParcelaInformado(v: Decimal | null): void { this.valorParcelaInformado = v; }

  getValorJurosInformado(): Decimal | null { return this.valorJurosInformado; }
  setValorJurosInformado(v: Decimal | null): void { this.valorJurosInformado = v; }

  getIndiceTrabalhistaInformado(): IndiceMonetarioEnum | null { return this.indiceTrabalhistaInformado; }
  setIndiceTrabalhistaInformado(v: IndiceMonetarioEnum | null): void { this.indiceTrabalhistaInformado = v; }

  getAplicarJurosInformado(): boolean { return this.aplicarJurosInformado; }
  setAplicarJurosInformado(v: boolean): void { this.aplicarJurosInformado = v; }

  getTaxaCalculado(): Decimal | null { return this.taxaCalculado; }
  setTaxaCalculado(v: Decimal | null): void { this.taxaCalculado = v; }

  getTipoIrpf(): TipoDeImpostoDeRendaEnum | null { return this.tipoIrpf; }
  setTipoIrpf(v: TipoDeImpostoDeRendaEnum | null): void { this.tipoIrpf = v; }

  getTipoDocFiscal(): TipoDocumentoFiscalEnum { return this.tipoDocFiscal; }
  setTipoDocFiscal(v: TipoDocumentoFiscalEnum): void { this.tipoDocFiscal = v; }

  getNumeroDocFiscal(): string | null { return this.numeroDocFiscal; }
  setNumeroDocFiscal(v: string | null): void { this.numeroDocFiscal = v; }

  getId(): number | null { return this.id; }
  setId(v: number | null): void { this.id = v; }

  getDescontoCreditosReclamante(): ParcelasAtualizaveisDescontoCreditosReclamante | null { return this.descontoCreditosReclamante; }
  setDescontoCreditosReclamante(v: ParcelasAtualizaveisDescontoCreditosReclamante | null): void { this.descontoCreditosReclamante = v; }

  getOutrosDebitosReclamado(): ParcelasAtualizaveisOutrosDebitosReclamado | null { return this.outrosDebitosReclamado; }
  setOutrosDebitosReclamado(v: ParcelasAtualizaveisOutrosDebitosReclamado | null): void { this.outrosDebitosReclamado = v; }

  getDebitosReclamante(): ParcelasAtualizaveisDebitosReclamante | null { return this.debitosReclamante; }
  setDebitosReclamante(v: ParcelasAtualizaveisDebitosReclamante | null): void { this.debitosReclamante = v; }

  getHonorario(): HonorarioRef | null { return this.honorario; }
  setHonorario(v: HonorarioRef | null): void { this.honorario = v; }

  getTipoCobrancaReclamante(): TipoCobrancaReclamanteEnum { return this.tipoCobrancaReclamante; }
  setTipoCobrancaReclamante(v: TipoCobrancaReclamanteEnum): void { this.tipoCobrancaReclamante = v; }

  getAplicarDescontoContribSocialCalculado(): boolean { return this.aplicarDescontoContribSocialCalculado; }
  setAplicarDescontoContribSocialCalculado(v: boolean): void { this.aplicarDescontoContribSocialCalculado = v; }

  getAplicarDescontoPrevPrivadaCalculado(): boolean { return this.aplicarDescontoPrevPrivadaCalculado; }
  setAplicarDescontoPrevPrivadaCalculado(v: boolean): void { this.aplicarDescontoPrevPrivadaCalculado = v; }

  getDataApartirDeAplicarJurosInformado(): Date | null { return this.dataApartirDeAplicarJurosInformado; }
  setDataApartirDeAplicarJurosInformado(v: Date | null): void { this.dataApartirDeAplicarJurosInformado = v; }
}
