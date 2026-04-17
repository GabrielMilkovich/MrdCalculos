/**
 * PJe-Calc v2.15.1 — Reflexo
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/Reflexo.java (~171 linhas)
 *
 * Subclasse concreta de `VerbaDeCalculo` que representa um reflexo (13º sobre
 * horas extras, FGTS sobre aviso prévio etc.). Sempre usa `FormulaReflexo` e
 * depende de verbas principais como base.
 *
 * Campos específicos:
 *   - comportamentoDoReflexo (VALOR_MENSAL | MEDIA_PELA_QUANTIDADE |
 *     MEDIA_PELO_VALOR | MEDIA_PELO_VALOR_CORRIGIDO)
 *   - periodoMediaReflexo (PERIODO_AQUISITIVO | PERIODO_DE_APURACAO)
 *   - tratamentoDaFracaoDeMesDoReflexo (MANTER | ARREDONDAR_PARA_CIMA | ...)
 */
import {
  ComportamentoDoReflexoEnum,
  PeriodoDaMediaDoReflexoEnum,
  TratamentoDaFracaoDeMesDoReflexoEnum,
} from '../../constantes/enums';
import { VerbaDeCalculo } from './verba-de-calculo';

export class Reflexo extends VerbaDeCalculo {
  private comportamentoDoReflexo: ComportamentoDoReflexoEnum = ComportamentoDoReflexoEnum.VALOR_MENSAL;
  private periodoMediaReflexo: PeriodoDaMediaDoReflexoEnum = PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO;
  private tratamentoDaFracaoDeMesDoReflexo: TratamentoDaFracaoDeMesDoReflexoEnum = TratamentoDaFracaoDeMesDoReflexoEnum.MANTER;

  getComportamentoDoReflexo(): ComportamentoDoReflexoEnum { return this.comportamentoDoReflexo; }
  setComportamentoDoReflexo(v: ComportamentoDoReflexoEnum): void { this.comportamentoDoReflexo = v; }

  getPeriodoMediaReflexo(): PeriodoDaMediaDoReflexoEnum { return this.periodoMediaReflexo; }
  setPeriodoMediaReflexo(v: PeriodoDaMediaDoReflexoEnum): void { this.periodoMediaReflexo = v; }

  getTratamentoDaFracaoDeMesDoReflexo(): TratamentoDaFracaoDeMesDoReflexoEnum {
    return this.tratamentoDaFracaoDeMesDoReflexo;
  }
  setTratamentoDaFracaoDeMesDoReflexo(v: TratamentoDaFracaoDeMesDoReflexoEnum): void {
    this.tratamentoDaFracaoDeMesDoReflexo = v;
  }

  /** isPrincipal — override. Reflexo não é principal. */
  isPrincipal(): boolean { return false; }
}
