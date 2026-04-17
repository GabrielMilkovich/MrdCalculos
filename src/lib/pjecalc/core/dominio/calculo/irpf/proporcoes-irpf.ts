/**
 * PJe-Calc v2.15.1 — ProporcoesIrpf
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.ProporcoesIrpf
 *
 * Ref Java: pjecalc-fonte/.../calculo/irpf/ProporcoesIrpf.java (~221 linhas)
 *
 * Calcula proporções utilizadas no rateio do IRPF:
 *   - proporção de cada grupo de verba (13º, férias, anos anteriores, normal)
 *     em relação ao valor principal corrigido do reclamante
 *   - proporção de juros por grupo (se `incidirSobreJurosDeMora`)
 *   - proporção de INSS e Previdência Privada deduzidos por grupo
 *
 * Consumido por `MaquinaDeCalculoDeIrpf` para distribuir valores de pagamento
 * proporcionalmente entre as ocorrências.
 *
 * Os campos são `null` se a base correspondente for zero (paridade com Java).
 */
import Decimal from 'decimal.js';
import { HelperDate } from '../../../base/comum/helper-date';
import { arredondarValorMonetario } from '../../../base/comum/utils';
import { TipoOcorrenciaIrpfEnum } from '../../../constantes/enums';
import type { Irpf } from './irpf';

const ZERO = new Decimal(0);

/**
 * Interface mínima (ducktype) do CreditosDoReclamante (módulo Pagamento, Fase 9).
 */
export interface CreditosDoReclamanteProporcoes {
  getPagoPrincipal?(): Decimal | null;
  getDiferencaPrincipal?(): Decimal | null;
  getValorPrincipal(): Decimal;
  getJuroPrincipal(): Decimal;
}

/** Caracteristica enum (ducktyping) — igual a `CaracteristicaDaVerbaEnum` */
type Caracteristica = string;
const DECIMO_TERCEIRO_SALARIO: Caracteristica = 'DECIMO_TERCEIRO_SALARIO';
const FERIAS: Caracteristica = 'FERIAS';
const AVISO_PREVIO: Caracteristica = 'AVISO_PREVIO';
const COMUM: Caracteristica = 'COMUM';

interface VerbaLike {
  getIncidenciaIRPF?(): boolean;
  getValorTotalDiferencaCorrigida?(): Decimal | null;
  getCaracteristica?(): Caracteristica;
  getOcorrenciasAtivas?(): Iterable<OcorrenciaVerbaLike>;
}

interface OcorrenciaVerbaLike {
  getDiferencaCorrigida?(): Decimal | null;
  getDiferencaCorrigidaParaCalculoDasIncidencias?(): Decimal | null;
  getDataInicial?(): Date | null;
}

interface ApuracaoJurosLike {
  getCompetencia?(): Date | null;
  getJurosParaIrpfDecimoTerceiro?(): Decimal | null;
  getJurosParaIrpfFerias?(): Decimal | null;
  getJurosParaIrpfDemaisVerbas?(): Decimal | null;
}

export class ProporcoesIrpf {
  private proporcaoFerias: Decimal | null = null;
  private proporcaoDecimo: Decimal | null = null;
  private proporcaoAnosAnteriores: Decimal | null = null;
  private proporcaoNormal: Decimal | null = null;

  private proporcaoJurosDecimo: Decimal | null = null;
  private proporcaoJurosFerias: Decimal | null = null;
  private proporcaoJurosAnosAnteriores: Decimal | null = null;
  private proporcaoJurosNormal: Decimal | null = null;

  private proporcaoInssDecimo: Decimal | null = null;
  private proporcaoInssFerias: Decimal | null = null;
  private proporcaoInssAnosAnteriores: Decimal | null = null;
  private proporcaoInssNormal: Decimal | null = null;

  private proporcaoPrevidenciaPrivadaDecimo: Decimal | null = null;
  private proporcaoPrevidenciaPrivadaFerias: Decimal | null = null;
  private proporcaoPrevidenciaPrivadaAnosAnteriores: Decimal | null = null;
  private proporcaoPrevidenciaPrivadaNormal: Decimal | null = null;

  constructor(creditosDoReclamante: CreditosDoReclamanteProporcoes, irpf: Irpf) {
    const calc = irpf.getCalculo();
    if (!calc) return;
    const calcExt = calc as unknown as {
      getDataDeLiquidacao?(): Date;
      getVerbasAtivas?(): Iterable<VerbaLike>;
      getApuracoesDeJuros?(): Iterable<ApuracaoJurosLike>;
    };

    // Data limite "anos anteriores" = 01/01 do ano da liquidação
    const dataLiq = calcExt.getDataDeLiquidacao?.();
    if (!dataLiq) return;
    const dataLimiteAnosAnteriores = new Date(dataLiq.getFullYear(), 0, 1);

    let verbaAnosAnteriores = ZERO;
    let verbaFerias = ZERO;
    let verbaDecimoTerceiro = ZERO;
    let verbaDemaisVerbas = ZERO;

    const regimeDeCaixa = irpf.getRegimeDeCaixa();

    for (const verba of calcExt.getVerbasAtivas?.() ?? []) {
      if (!verba.getIncidenciaIRPF?.()) continue;
      for (const ocVerba of verba.getOcorrenciasAtivas?.() ?? []) {
        const valorOcorrenciaCorrigida = arredondarValorMonetario(ocVerba.getDiferencaCorrigida?.() ?? null);
        const dataInicial = ocVerba.getDataInicial?.();
        const base = ocVerba.getDiferencaCorrigidaParaCalculoDasIncidencias?.() ?? null;

        // Ramo "anos anteriores" (regimeDeCaixa=false e data anterior a 01/01 da liq.)
        if (!regimeDeCaixa && dataInicial && HelperDate.dateBefore(dataInicial, dataLimiteAnosAnteriores)) {
          if (valorOcorrenciaCorrigida.isZero() || base === null) continue;
          verbaAnosAnteriores = verbaAnosAnteriores.plus(base);
          continue;
        }

        switch (verba.getCaracteristica?.()) {
          case DECIMO_TERCEIRO_SALARIO:
            verbaDecimoTerceiro = verbaDecimoTerceiro.plus(valorOcorrenciaCorrigida);
            break;
          case FERIAS:
            if (base !== null) verbaFerias = verbaFerias.plus(base);
            break;
          case AVISO_PREVIO:
          case COMUM:
            verbaDemaisVerbas = verbaDemaisVerbas.plus(valorOcorrenciaCorrigida);
            break;
        }
      }
    }

    // Juros — somente se incidirSobreJurosDeMora
    if (irpf.getIncidirSobreJurosDeMora()) {
      let jurosAnosAnteriores = ZERO;
      let jurosDecimoTerceiro = ZERO;
      let jurosFerias = ZERO;
      let jurosDemaisVerbas = ZERO;
      for (const ocJuros of calcExt.getApuracoesDeJuros?.() ?? []) {
        const comp = ocJuros.getCompetencia?.();
        const valorDec = arredondarValorMonetario(ocJuros.getJurosParaIrpfDecimoTerceiro?.() ?? null);
        const valorFer = arredondarValorMonetario(ocJuros.getJurosParaIrpfFerias?.() ?? null);
        const valorDem = arredondarValorMonetario(ocJuros.getJurosParaIrpfDemaisVerbas?.() ?? null);
        if (!regimeDeCaixa && comp && HelperDate.dateBefore(comp, dataLimiteAnosAnteriores)) {
          jurosAnosAnteriores = jurosAnosAnteriores.plus(valorDec).plus(valorFer).plus(valorDem);
          continue;
        }
        jurosDecimoTerceiro = jurosDecimoTerceiro.plus(valorDec);
        jurosFerias = jurosFerias.plus(valorFer);
        jurosDemaisVerbas = jurosDemaisVerbas.plus(valorDem);
      }
      const juroPrincipal = creditosDoReclamante.getJuroPrincipal();
      if (!juroPrincipal.isZero()) {
        this.proporcaoJurosAnosAnteriores = jurosAnosAnteriores.div(juroPrincipal);
        this.proporcaoJurosDecimo = jurosDecimoTerceiro.div(juroPrincipal);
        this.proporcaoJurosFerias = jurosFerias.div(juroPrincipal);
        this.proporcaoJurosNormal = jurosDemaisVerbas.div(juroPrincipal);
      }
    }

    // Proporções de verba sobre o principal
    const valorPrincipalCorrigido = creditosDoReclamante.getValorPrincipal();
    if (!valorPrincipalCorrigido.isZero()) {
      this.proporcaoDecimo = verbaDecimoTerceiro.div(valorPrincipalCorrigido);
      this.proporcaoFerias = verbaFerias.div(valorPrincipalCorrigido);
      this.proporcaoAnosAnteriores = verbaAnosAnteriores.div(valorPrincipalCorrigido);
      this.proporcaoNormal = verbaDemaisVerbas.div(valorPrincipalCorrigido);
    }

    // INSS / Previdência Privada por tipo de ocorrência
    let descontoInssTotal = ZERO;
    let descontoInssExclusiva = ZERO;
    let descontoInssEmSeparado = ZERO;
    let descontoInssAnosAnteriores = ZERO;
    let descontoInssNormal = ZERO;
    let descontoPPTotal = ZERO;
    let descontoPPExclusiva = ZERO;
    let descontoPPEmSeparado = ZERO;
    let descontoPPAnosAnteriores = ZERO;
    let descontoPPNormal = ZERO;

    for (const oc of irpf.getOcorrencias()) {
      const cs = oc.getValorContribuicaoSocial() ?? ZERO;
      const pp = oc.getValorPrevidenciaPrivada() ?? ZERO;
      descontoInssTotal = descontoInssTotal.plus(cs);
      descontoPPTotal = descontoPPTotal.plus(pp);
      switch (oc.getTipo()) {
        case TipoOcorrenciaIrpfEnum.NORMAL:
          descontoInssNormal = descontoInssNormal.plus(cs);
          descontoPPNormal = descontoPPNormal.plus(pp);
          break;
        case TipoOcorrenciaIrpfEnum.TRIBUTACAO_EXCLUSIVA:
          descontoInssExclusiva = descontoInssExclusiva.plus(cs);
          descontoPPExclusiva = descontoPPExclusiva.plus(pp);
          break;
        case TipoOcorrenciaIrpfEnum.TRIBUTACAO_EM_SEPARADO:
          descontoInssEmSeparado = descontoInssEmSeparado.plus(cs);
          descontoPPEmSeparado = descontoPPEmSeparado.plus(pp);
          break;
        case TipoOcorrenciaIrpfEnum.RRA_ANOS_ANTERIORES:
          descontoInssAnosAnteriores = descontoInssAnosAnteriores.plus(cs);
          descontoPPAnosAnteriores = descontoPPAnosAnteriores.plus(pp);
          break;
      }
    }

    if (!descontoInssTotal.isZero()) {
      this.proporcaoInssDecimo = descontoInssExclusiva.div(descontoInssTotal);
      this.proporcaoInssFerias = descontoInssEmSeparado.div(descontoInssTotal);
      this.proporcaoInssAnosAnteriores = descontoInssAnosAnteriores.div(descontoInssTotal);
      this.proporcaoInssNormal = descontoInssNormal.div(descontoInssTotal);
    }
    if (!descontoPPTotal.isZero()) {
      this.proporcaoPrevidenciaPrivadaDecimo = descontoPPExclusiva.div(descontoPPTotal);
      this.proporcaoPrevidenciaPrivadaFerias = descontoPPEmSeparado.div(descontoPPTotal);
      this.proporcaoPrevidenciaPrivadaAnosAnteriores = descontoPPAnosAnteriores.div(descontoPPTotal);
      this.proporcaoPrevidenciaPrivadaNormal = descontoPPNormal.div(descontoPPTotal);
    }
  }

  getProporcaoFerias(): Decimal | null { return this.proporcaoFerias; }
  getProporcaoDecimo(): Decimal | null { return this.proporcaoDecimo; }
  getProporcaoAnosAnteriores(): Decimal | null { return this.proporcaoAnosAnteriores; }
  getProporcaoNormal(): Decimal | null { return this.proporcaoNormal; }

  getProporcaoJurosDecimo(): Decimal | null { return this.proporcaoJurosDecimo; }
  getProporcaoJurosFerias(): Decimal | null { return this.proporcaoJurosFerias; }
  getProporcaoJurosAnosAnteriores(): Decimal | null { return this.proporcaoJurosAnosAnteriores; }
  getProporcaoJurosNormal(): Decimal | null { return this.proporcaoJurosNormal; }

  getProporcaoInssDecimo(): Decimal | null { return this.proporcaoInssDecimo; }
  getProporcaoInssFerias(): Decimal | null { return this.proporcaoInssFerias; }
  getProporcaoInssAnosAnteriores(): Decimal | null { return this.proporcaoInssAnosAnteriores; }
  getProporcaoInssNormal(): Decimal | null { return this.proporcaoInssNormal; }

  getProporcaoPrevidenciaPrivadaDecimo(): Decimal | null { return this.proporcaoPrevidenciaPrivadaDecimo; }
  getProporcaoPrevidenciaPrivadaFerias(): Decimal | null { return this.proporcaoPrevidenciaPrivadaFerias; }
  getProporcaoPrevidenciaPrivadaAnosAnteriores(): Decimal | null { return this.proporcaoPrevidenciaPrivadaAnosAnteriores; }
  getProporcaoPrevidenciaPrivadaNormal(): Decimal | null { return this.proporcaoPrevidenciaPrivadaNormal; }
}
