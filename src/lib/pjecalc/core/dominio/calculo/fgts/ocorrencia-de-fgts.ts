/**
 * PJe-Calc v2.15.1 — OcorrenciaDeFgts
 *
 * Porte 1-a-1 de:
 * br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OcorrenciaDeFgts (441 linhas)
 *
 * Status anterior no TS: **AUSENTE**. Esta classe representa uma única
 * ocorrência mensal de FGTS, com:
 *   - bases (histórico, verba, verba sem aviso prévio)
 *   - alíquota (2%/8%)
 *   - depositado
 *   - índice acumulado e de multa (40%)
 *   - taxa de juros aplicada
 *
 * Calcula valores derivados:
 *   - `getValorDevido` (alíquota × bases)
 *   - `getDiferenca` (devido − depositado, clamp 0)
 *   - `getDiferencaCorrigida` (com correção monetária)
 *   - `getJuros` (diferença corrigida × taxa)
 *   - `getTotal` (diferença corrigida + juros)
 *   - `getValorDaContribuicaoSocialDe05` (LC 110/2001 — só entre 01/2002 e
 *     12/2006: 0,5% sobre as bases)
 *   - `getValorDaContribuicaoSocialDe05Corrigido` (com índice acumulado)
 *   - `getJurosDaContribuicaoSocialDe05`
 *   - `getTotalDaContribuicaoSocialDe05`
 *
 * Diferença em relação ao Java:
 *   - Persistência JPA removida (gerenciada pelo Supabase adapter)
 *   - `equals/hashCode` simplificados (TS não usa pattern HashCodeBuilder)
 */
import Decimal from 'decimal.js';
import {
  AliquotaDoFgtsEnum,
  TipoDeBaseDoFgtsEnum,
  TipoDeDepositadoDoFgtsEnum,
  type TipoDeCorrecaoDoFgtsEnum,
} from '../../../constantes/enums';
import { calcularAliquotaDoFgts } from '../../../constantes/aliquota-do-fgts-operadores';
import { aplicarCorrecaoMonetaria, aplicarTaxa } from '../../../base/comum/utils';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Fgts } from './fgts';

const ZERO = new Decimal(0);
/** LC 110/2001 — alíquota 0,5% sobre as bases (período 01/2002 → 12/2006). */
const TAXA_CONTRIBUICAO_SOCIAL = new Decimal('0.5');
/** Início da CS 0,5% (01/01/2002 — Java HelperDate.getInstance(2002, 0, 1)). */
const DATA_INICIAL_CS_05 = new Date(Date.UTC(2002, 0, 1));
/** Fim da CS 0,5% (01/12/2006 — Java HelperDate.getInstance(2006, 11, 1)). */
const DATA_FINAL_CS_05 = new Date(Date.UTC(2006, 11, 1));

/**
 * Resolver de índice de correção a partir do enum `TipoDeCorrecaoDoFgtsEnum`.
 * No Java, o enum tem método polimórfico `indice(OcorrenciaDeFgts)` que
 * devolve o índice acumulado/da multa conforme o caso. Em TS expressamos isso
 * como função de duas-pernas para evitar refatorar todo o enum.
 *
 * Implementação atual: como o TS `TipoDeCorrecaoDoFgtsEnum` ainda não foi
 * portado polimorficamente (Fase 6 → Fase futura), aceita a função do caller.
 */
type IndiceResolver = (oc: OcorrenciaDeFgts) => Decimal | null;

export class OcorrenciaDeFgts {
  private id: number | null = null;
  private versao = 0;
  private fgts: Fgts | null = null;
  private ocorrencia: Date | null = null;
  private baseHistorico: Decimal | null = null;
  private tipoDeBaseDoFgts: TipoDeBaseDoFgtsEnum = TipoDeBaseDoFgtsEnum.CALCULADA;
  private baseVerba: Decimal | null = null;
  private baseVerbaSemAvisoPrevio: Decimal | null = null;
  private aliquotaDoFgtsEnum: AliquotaDoFgtsEnum = AliquotaDoFgtsEnum.OITO_PORCENTO;
  private depositado: Decimal | null = null;
  private tipoDeDepositadoDoFgts: TipoDeDepositadoDoFgtsEnum = TipoDeDepositadoDoFgtsEnum.CALCULADA;
  private ocorrenciaOriginal: OcorrenciaDeFgts | null = null;
  private indiceAcumulado: Decimal | null = null;
  private indiceAcumuladoDaMulta: Decimal | null = null;
  private taxaDeJuros: Decimal | null = null;
  private selecionada = false;

  constructor(fgts?: Fgts) {
    if (fgts) this.fgts = fgts;
  }

  // ───────── identidade / fk ─────────
  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getFgts(): Fgts | null { return this.fgts; }
  setFgts(v: Fgts | null): void { this.fgts = v; }

  // ───────── data da ocorrência ─────────
  getOcorrencia(): Date | null { return this.ocorrencia; }
  setOcorrencia(v: Date | null): void { this.ocorrencia = v; }

  // ───────── bases ─────────
  getBaseHistorico(): Decimal | null { return this.baseHistorico; }
  setBaseHistorico(v: Decimal | null): void { this.baseHistorico = v; }

  getBaseVerba(): Decimal | null { return this.baseVerba; }
  setBaseVerba(v: Decimal | null): void { this.baseVerba = v; }

  getBaseVerbaSemAvisoPrevio(): Decimal | null { return this.baseVerbaSemAvisoPrevio; }
  setBaseVerbaSemAvisoPrevio(v: Decimal | null): void { this.baseVerbaSemAvisoPrevio = v; }

  getTipoDeBaseDoFgts(): TipoDeBaseDoFgtsEnum { return this.tipoDeBaseDoFgts; }
  setTipoDeBaseDoFgts(v: TipoDeBaseDoFgtsEnum): void { this.tipoDeBaseDoFgts = v; }

  // ───────── alíquota / depositado ─────────
  getAliquotaDoFgtsEnum(): AliquotaDoFgtsEnum { return this.aliquotaDoFgtsEnum; }
  setAliquotaDoFgtsEnum(v: AliquotaDoFgtsEnum): void { this.aliquotaDoFgtsEnum = v; }

  getDepositado(): Decimal | null { return this.depositado; }
  setDepositado(v: Decimal | null): void { this.depositado = v; }

  getTipoDeDepositadoDoFgts(): TipoDeDepositadoDoFgtsEnum { return this.tipoDeDepositadoDoFgts; }
  setTipoDeDepositadoDoFgts(v: TipoDeDepositadoDoFgtsEnum): void { this.tipoDeDepositadoDoFgts = v; }

  // ───────── original / seleção / índices / taxa ─────────
  getOcorrenciaOriginal(): OcorrenciaDeFgts | null { return this.ocorrenciaOriginal; }
  setOcorrenciaOriginal(v: OcorrenciaDeFgts | null): void { this.ocorrenciaOriginal = v; }

  getSelecionada(): boolean { return this.selecionada; }
  setSelecionada(v: boolean): void { this.selecionada = v; }

  getIndiceAcumulado(): Decimal | null { return this.indiceAcumulado; }
  setIndiceAcumulado(v: Decimal | null): void { this.indiceAcumulado = v; }

  getIndiceAcumuladoDaMulta(): Decimal | null { return this.indiceAcumuladoDaMulta; }
  setIndiceAcumuladoDaMulta(v: Decimal | null): void { this.indiceAcumuladoDaMulta = v; }

  getTaxaDeJuros(): Decimal | null { return this.taxaDeJuros; }
  setTaxaDeJuros(v: Decimal | null): void { this.taxaDeJuros = v; }

  // ───────── predicados ─────────
  isOriginal(): boolean { return this.ocorrenciaOriginal == null; }
  isValorCalculado(): boolean { return this.tipoDeBaseDoFgts === TipoDeBaseDoFgtsEnum.CALCULADA; }
  isValorInformado(): boolean { return this.tipoDeBaseDoFgts === TipoDeBaseDoFgtsEnum.INFORMADA; }
  isDepositadoInformado(): boolean {
    return this.tipoDeDepositadoDoFgts === TipoDeDepositadoDoFgtsEnum.INFORMADA;
  }

  // ───────── cópia ─────────
  /**
   * `copiar` — porte 1-a-1 de OcorrenciaDeFgts.java:157-165. Replica
   * todos os campos editáveis do `original` (sem id/versao/transient).
   */
  copiar(original: OcorrenciaDeFgts): void {
    this.ocorrencia = original.getOcorrencia();
    this.baseHistorico = original.getBaseHistorico();
    this.tipoDeBaseDoFgts = original.getTipoDeBaseDoFgts();
    this.baseVerba = original.getBaseVerba();
    this.aliquotaDoFgtsEnum = original.getAliquotaDoFgtsEnum();
    this.depositado = original.getDepositado();
    this.tipoDeDepositadoDoFgts = original.getTipoDeDepositadoDoFgts();
  }

  /** `recuperarValorOriginal` — Java L167. */
  recuperarValorOriginal(): void {
    if (this.ocorrenciaOriginal != null) {
      this.copiar(this.ocorrenciaOriginal);
    }
  }

  /**
   * `copiarValoresInformadosAnteriormente` — Java L407-419. Mantém edições
   * manuais do usuário (informadas) ao re-gerar a ocorrência.
   */
  copiarValoresInformadosAnteriormente(antiga: OcorrenciaDeFgts | null): void {
    if (antiga == null) return;
    if (antiga.isValorInformado()) {
      this.setBaseHistorico(antiga.getBaseHistorico());
      this.setTipoDeBaseDoFgts(antiga.getTipoDeBaseDoFgts());
    }
    if (antiga.isDepositadoInformado()) {
      this.setDepositado(antiga.getDepositado());
      this.setTipoDeDepositadoDoFgts(antiga.getTipoDeDepositadoDoFgts());
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Cálculos derivados
  // ─────────────────────────────────────────────────────────────────────

  /**
   * `getSomaDasBases(excluirAviso)` — Java L309-318.
   * Soma `baseHistorico + baseVerba` (ou `baseVerbaSemAvisoPrevio` se flag).
   * Trata nulos como zero (paridade Java).
   */
  getSomaDasBases(excluirAviso = false): Decimal {
    let soma: Decimal = ZERO;
    if (this.baseHistorico != null) {
      soma = soma.plus(this.baseHistorico);
    }
    if (excluirAviso) {
      if (this.baseVerbaSemAvisoPrevio != null) {
        soma = soma.plus(this.baseVerbaSemAvisoPrevio);
      }
    } else if (this.baseVerba != null) {
      soma = soma.plus(this.baseVerba);
    }
    return soma;
  }

  /**
   * `getValorDevido` — Java L293-295. Aplica alíquota sobre `getSomaDasBases()`.
   * Retorna 0 se a soma resultar em null (paridade defensiva — Java pode
   * devolver null aqui).
   */
  getValorDevido(): Decimal {
    return calcularAliquotaDoFgts(this.aliquotaDoFgtsEnum, this.getSomaDasBases()) ?? ZERO;
  }

  /** `getValorDevidoSemAviso` — Java L297-299. */
  getValorDevidoSemAviso(): Decimal {
    return calcularAliquotaDoFgts(this.aliquotaDoFgtsEnum, this.getSomaDasBases(true)) ?? ZERO;
  }

  /** `getValorDevidoCorrigido` — Java L320-322. */
  getValorDevidoCorrigido(indiceResolver: IndiceResolver): Decimal {
    const indice = indiceResolver(this);
    return aplicarCorrecaoMonetaria(indice, this.getValorDevido()) ?? ZERO;
  }

  /** `getValorDevidoSemAvisoCorrigido` — Java L324-326. */
  getValorDevidoSemAvisoCorrigido(indiceResolver: IndiceResolver): Decimal {
    const indice = indiceResolver(this);
    return aplicarCorrecaoMonetaria(indice, this.getValorDevidoSemAviso()) ?? ZERO;
  }

  // ───────── Diferença (devido − depositado) ─────────

  /**
   * `getDiferenca(excluiAviso)` — Java L339-358.
   * Devido − Depositado, com clamp em 0 (não negativo).
   * Trata nulos como zero.
   */
  getDiferenca(excluiAviso = false): Decimal {
    const valorDevido = excluiAviso ? this.getValorDevidoSemAviso() : this.getValorDevido();
    const valorDepositado = this.depositado ?? ZERO;
    const diferenca = valorDevido.minus(valorDepositado);
    return diferenca.isNegative() ? ZERO : diferenca;
  }

  /** `getDiferencaCorrigida` — Java L360-371. */
  getDiferencaCorrigida(indiceResolver: IndiceResolver, excluiAviso = false): Decimal {
    const diferenca = this.getDiferenca(excluiAviso);
    if (diferenca.isZero()) return ZERO;
    const indice = indiceResolver(this);
    return aplicarCorrecaoMonetaria(indice, diferenca) ?? ZERO;
  }

  // ───────── Juros / Total ─────────

  /**
   * `getJuros(tipoDeCorrecao)` — Java L377-382.
   * Diferença corrigida × (taxaDeJuros/100). Retorna 0 se taxa nula.
   */
  getJuros(indiceResolver: IndiceResolver): Decimal {
    if (this.taxaDeJuros == null) return ZERO;
    const baseJuros = this.getDiferencaCorrigida(indiceResolver);
    return aplicarTaxa(this.taxaDeJuros, baseJuros) ?? ZERO;
  }

  /** `getTotal` — Java L384-390. Diferença corrigida + juros. */
  getTotal(indiceResolver: IndiceResolver): Decimal {
    const diferencaCorrigida = this.getDiferencaCorrigida(indiceResolver);
    return diferencaCorrigida.plus(this.getJuros(indiceResolver));
  }

  // ───────── Contribuição Social LC 110/2001 (0,5%) ─────────

  /**
   * `getValorDaContribuicaoSocialDe05` — Java L328-333.
   * Aplica 0,5% sobre as bases SE a competência cair entre 01/2002 e 12/2006.
   * Fora desse período, devolve 0.
   *
   * Base legal: LC 110/2001 art. 1º — vigeu até 31/12/2006 (Lei 11.049/2004
   * autorizou a extinção quando o saldo necessário fosse atingido; STF
   * declarou inconstitucional o prosseguimento com ADI 5051).
   */
  getValorDaContribuicaoSocialDe05(): Decimal {
    if (this.ocorrencia == null) return ZERO;
    const dataOc = HelperDate.getInstance(this.ocorrencia);
    if (!dataOc.between(DATA_INICIAL_CS_05, DATA_FINAL_CS_05)) return ZERO;
    return aplicarTaxa(TAXA_CONTRIBUICAO_SOCIAL, this.getSomaDasBases()) ?? ZERO;
  }

  /** `getValorDaContribuicaoSocialDe05Corrigido` — Java L335-337. */
  getValorDaContribuicaoSocialDe05Corrigido(): Decimal {
    return aplicarCorrecaoMonetaria(this.indiceAcumulado, this.getValorDaContribuicaoSocialDe05()) ?? ZERO;
  }

  /** `getJurosDaContribuicaoSocialDe05` — Java L392-397. */
  getJurosDaContribuicaoSocialDe05(): Decimal {
    if (this.taxaDeJuros == null) return ZERO;
    return aplicarTaxa(this.taxaDeJuros, this.getValorDaContribuicaoSocialDe05Corrigido()) ?? ZERO;
  }

  /**
   * `getTotalDaContribuicaoSocialDe05` — Java L399-401.
   *
   * Nota: o Java original tem um bug aparente em
   * `Utils.somar(valorCorrigido, juros, valorCorrigido)` — o terceiro
   * argumento é o "default" se algum dos primeiros for nulo, mas como
   * `valorCorrigido` é repetido, na prática soma valor+juros (o que faz
   * sentido). Preservado aqui sem o overload de "default".
   */
  getTotalDaContribuicaoSocialDe05(): Decimal {
    return this.getValorDaContribuicaoSocialDe05Corrigido().plus(this.getJurosDaContribuicaoSocialDe05());
  }

  // ───────── igualdade / chave primária ─────────
  obterChavePrimaria(): number | null { return this.id; }

  /**
   * `equals` — port simplificado (Java usa EqualsBuilder com 8 campos).
   * Igualdade primária por `id` quando ambos persistidos; senão, compara
   * campos de identificação (data + bases + alíquota + depositado).
   */
  equalsOcorrencia(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof OcorrenciaDeFgts)) return false;
    if (this.id != null && other.id != null) return this.id === other.id;
    return (
      this.ocorrencia?.getTime() === other.ocorrencia?.getTime() &&
      this.baseHistorico?.equals(other.baseHistorico ?? ZERO) === true &&
      this.tipoDeBaseDoFgts === other.tipoDeBaseDoFgts &&
      this.baseVerba?.equals(other.baseVerba ?? ZERO) === true &&
      this.aliquotaDoFgtsEnum === other.aliquotaDoFgtsEnum &&
      this.depositado?.equals(other.depositado ?? ZERO) === true &&
      this.tipoDeDepositadoDoFgts === other.tipoDeDepositadoDoFgts
    );
  }
}
