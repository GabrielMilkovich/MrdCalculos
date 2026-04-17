/**
 * PJe-Calc Engine v4 — Pipeline Refinado
 *
 * Extends engine-v3 com INSS proporcionalizado:
 * - Correção/Juros: herda do v3 (SELIC separada, combinações ADC 58/59)
 * - INSS: recalcula com base MARGINAL proporcionalizada (historico + diferença)
 * - IRPF: herda do v3 (TabelaIrpf real)
 * - Honorários/Custas/Multas: herda do v3
 *
 * Uso: substitui PjeCalcEngineV3 no orchestrator.
 */
import Decimal from 'decimal.js';
import { PjeCalcEngineV3 } from './engine-v3';
import { CalculoDoProporcionalizar } from './core/comum/rotinasdecalculo/calculo-do-proporcionalizar';
import { Periodo } from './core/base/comum/periodo';
import { HelperDate } from './core/base/comum/helper-date';
import type {
  PjeParametros, PjeHistoricoSalarial, PjeFalta, PjeFerias, PjeVerba,
  PjeCartaoPonto, PjeFGTSConfig, PjeCSConfig, PjeIRConfig,
  PjeCorrecaoConfig, PjeHonorariosConfig, PjeCustasConfig, PjeSeguroConfig,
  PjeIndiceRow, PjeINSSFaixaRow, PjeIRFaixaRow,
  PjeLiquidacaoResult, PjeCSResult,
} from './engine-types';

export class PjeCalcEngineV4 extends PjeCalcEngineV3 {
  private historicosSal: PjeHistoricoSalarial[];
  private verbasSal: PjeVerba[];
  private csConfigV4: PjeCSConfig;
  private faixasINSSV4: PjeINSSFaixaRow[];
  private paramsV4: PjeParametros;

  constructor(
    params: PjeParametros,
    historicos: PjeHistoricoSalarial[],
    faltas: PjeFalta[],
    ferias: PjeFerias[],
    verbas: PjeVerba[],
    cartaoPonto: PjeCartaoPonto[],
    fgtsConfig: PjeFGTSConfig,
    csConfig: PjeCSConfig,
    irConfig: PjeIRConfig,
    correcaoConfig: PjeCorrecaoConfig,
    honorariosConfig: PjeHonorariosConfig,
    custasConfig: PjeCustasConfig,
    seguroConfig: PjeSeguroConfig,
    indicesDB: PjeIndiceRow[] = [],
    faixasINSSDB: PjeINSSFaixaRow[] = [],
    faixasIRDB: PjeIRFaixaRow[] = [],
  ) {
    super(params, historicos, faltas, ferias, verbas, cartaoPonto,
      fgtsConfig, csConfig, irConfig, correcaoConfig,
      honorariosConfig, custasConfig, seguroConfig, indicesDB, faixasINSSDB, faixasIRDB);
    this.historicosSal = historicos;
    this.verbasSal = verbas;
    this.csConfigV4 = csConfig;
    this.faixasINSSV4 = faixasINSSDB;
    this.paramsV4 = params;
  }

  override liquidar(): PjeLiquidacaoResult {
    const result = super.liquidar();
    if (!this.csConfigV4.apurar_segurado && !this.csConfigV4.apurar_empresa) return result;
    if (this.faixasINSSV4.length === 0) return result;

    const recalculated = this.recalcularINSSComHistorico(result);
    return recalculated;
  }

  private recalcularINSSComHistorico(result: PjeLiquidacaoResult): PjeLiquidacaoResult {
    const admissao = new Date(this.paramsV4.data_admissao);
    const demissao = this.paramsV4.data_demissao ? new Date(this.paramsV4.data_demissao) : null;

    const historicoBasePorComp = new Map<string, number>();
    for (const hist of this.historicosSal) {
      if (!hist.incidencia_cs) continue;
      for (const oc of hist.ocorrencias) {
        const comp = oc.competencia.slice(0, 7);
        const valor = oc.valor || 0;
        if (valor <= 0) continue;

        const compDate = new Date(comp + '-01');
        const compEnd = new Date(compDate.getFullYear(), compDate.getMonth() + 1, 0);
        let proporcionalizado = valor;

        const isFirstMonth = compDate.getFullYear() === admissao.getFullYear()
          && compDate.getMonth() === admissao.getMonth()
          && admissao.getDate() > 1;
        const isLastMonth = demissao
          && compDate.getFullYear() === demissao.getFullYear()
          && compDate.getMonth() === demissao.getMonth()
          && demissao.getDate() < compEnd.getDate();

        if (isFirstMonth || isLastMonth) {
          const inicio = isFirstMonth ? admissao : compDate;
          const fim = isLastMonth ? demissao! : compEnd;
          const calc = new CalculoDoProporcionalizar(
            new Periodo(inicio, fim), new Decimal(valor), 0,
          );
          calc.executar();
          proporcionalizado = calc.getResultado().toNumber();
        }

        historicoBasePorComp.set(comp, (historicoBasePorComp.get(comp) ?? 0) + proporcionalizado);
      }
    }

    if (historicoBasePorComp.size === 0) return result;

    const calcularInssProgressivo = (comp: string, baseTotal: number): number => {
      const compDate = comp + '-01';
      const faixas = this.faixasINSSV4
        .filter(f => f.competencia_inicio <= compDate && (!f.competencia_fim || f.competencia_fim >= compDate))
        .sort((a, b) => a.faixa - b.faixa);
      if (faixas.length === 0) return 0;

      const isProgressivo = comp >= '2020-03';
      const teto = faixas[faixas.length - 1].valor_ate;
      const baseCapped = Math.min(baseTotal, teto);

      if (isProgressivo) {
        let restante = baseCapped, anterior = 0, total = 0;
        for (const f of faixas) {
          const largura = f.valor_ate - anterior;
          const parcela = Math.min(restante, largura);
          if (parcela > 0) total += +(parcela * f.aliquota).toFixed(2);
          restante -= parcela;
          anterior = f.valor_ate;
          if (restante <= 0) break;
        }
        return total;
      }

      let aliquotaFlat = faixas[faixas.length - 1].aliquota;
      for (const f of faixas) {
        if (baseCapped <= f.valor_ate) { aliquotaFlat = f.aliquota; break; }
      }
      return +(baseCapped * aliquotaFlat).toFixed(2);
    };

    let newTotalSegurado = 0;
    let newTotalEmpregador = 0;
    const newDevidos: PjeCSResult['segurado_devidos'] = [];

    const basesNormal = new Map<string, number>();
    const bases13 = new Map<string, number>();
    for (let vi = 0; vi < this.verbasSal.length; vi++) {
      const v = this.verbasSal[vi];
      if (!v.incidencias?.contribuicao_social) continue;
      const is13 = v.caracteristica === '13_salario';
      const verbResult = result.verbas[vi];
      if (!verbResult) continue;
      for (const oc of verbResult.ocorrencias) {
        if (oc.diferenca <= 0) continue;
        const target = is13 ? bases13 : basesNormal;
        target.set(oc.competencia, (target.get(oc.competencia) ?? 0) + oc.diferenca);
      }
    }

    const processarBase = (comp: string, diferenca: number, is13: boolean) => {
      const salarioHistorico = historicoBasePorComp.get(comp) ?? 0;
      const inssSemHistorico = calcularInssProgressivo(comp, diferenca);

      let inssFinal: number;
      if (salarioHistorico > 0) {
        const inssTotal = calcularInssProgressivo(comp, salarioHistorico + diferenca);
        const inssHist = calcularInssProgressivo(comp, salarioHistorico);
        const inssMarginal = Math.max(0, +(inssTotal - inssHist).toFixed(2));
        inssFinal = Math.max(inssMarginal, inssSemHistorico);
      } else {
        inssFinal = inssSemHistorico;
      }

      const aliqEmpresa = (this.csConfigV4.aliquota_empresa_fixa ?? 20) / 100;
      const aliqSAT = (this.csConfigV4.aliquota_sat_fixa ?? 2) / 100;
      const aliqTerc = (this.csConfigV4.aliquota_terceiros_fixa ?? 5.8) / 100;
      const valorEmpresa = +(diferenca * aliqEmpresa).toFixed(2);
      const valorSAT = +(diferenca * aliqSAT).toFixed(2);
      const valorTerc = +(diferenca * aliqTerc).toFixed(2);
      const aliquotaEfetiva = diferenca > 0 ? inssFinal / diferenca : 0;

      newDevidos.push({
        competencia: is13 ? comp + '-13' : comp,
        base: +diferenca.toFixed(2),
        aliquota: +aliquotaEfetiva.toFixed(4),
        valor: inssFinal,
        recolhido: 0,
        diferenca: inssFinal,
      });
      newTotalSegurado += inssFinal;
      newTotalEmpregador += valorEmpresa + valorSAT + valorTerc;
    };

    for (const [comp, base] of basesNormal) processarBase(comp, base, false);
    for (const [comp, base] of bases13) processarBase(comp, base, true);

    const csDescontado = this.csConfigV4.cobrar_reclamante ? +newTotalSegurado.toFixed(2) : 0;
    const oldCsDescontado = result.resumo.cs_segurado;
    const deltaCs = csDescontado - oldCsDescontado;

    const newResumo = { ...result.resumo };
    newResumo.cs_segurado = csDescontado;
    newResumo.cs_empregador = +newTotalEmpregador.toFixed(2);
    newResumo.liquido_reclamante = +(newResumo.liquido_reclamante - deltaCs).toFixed(2);
    newResumo.total_reclamada = +(newResumo.total_reclamada + deltaCs + (newTotalEmpregador - result.resumo.cs_empregador)).toFixed(2);

    return {
      ...result,
      resumo: newResumo,
      contribuicao_social: {
        ...result.contribuicao_social,
        segurado_devidos: newDevidos,
        total_segurado: +newTotalSegurado.toFixed(2),
        total_empregador: +newTotalEmpregador.toFixed(2),
      },
    };
  }
}
