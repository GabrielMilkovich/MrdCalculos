/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoIntegralizar;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.RegimeDoContratoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.SituacaoDaFeriasEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeGeracaoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TratamentoDaFracaoDeMesDoReflexoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.SimuladorDeBaseParaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento.ComportamentoDaBaseDoReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.Date;
import java.util.HashSet;
import java.util.List;

public class ComportamentoValorMensal
extends ComportamentoDaBaseDoReflexo {
    private static final long serialVersionUID = -2551689556247306275L;

    @Override
    public BigDecimal resolverValor(ItemBaseVerba item, ParametroDoTermo parametro) {
        VerbaDeCalculo base = item.getVerbaDeCalculo();
        long diasOcorrenciaReflexo = HelperDate.getInstance(parametro.getPeriodo().getFinal()).subtractDays(parametro.getPeriodo().getInicial()) + 1L;
        List<Periodo> periodosOcorrenciaDoReflexo = HelperDate.breakInMonths(parametro.getPeriodo().getInicial(), parametro.getPeriodo().getFinal());
        BigDecimal valorBaseReflexo = BigDecimal.ZERO;
        for (Periodo periodo : periodosOcorrenciaDoReflexo) {
            List<OcorrenciaDeVerba> ocorrencias = base.obterOcorrenciasDoMes(periodo.getFinal());
            HashSet<Date> diasCobertos = new HashSet<Date>();
            int diasParaExcluir = 0;
            BigDecimal valorDoPeriodo = BigDecimal.ZERO;
            BigDecimal valorDoPeriodoIntegral = null;
            for (OcorrenciaDeVerba ocorrencia : ocorrencias) {
                if (!ocorrencia.getAtivo().booleanValue()) continue;
                this.marcarDias(diasCobertos, ocorrencia);
                diasParaExcluir += ocorrencia.verificaDiasParaExcluirDeAcordoComA(base);
                BigDecimal valorBase = null;
                BigDecimal valorDaBaseIntegral = null;
                if (TipoDeGeracaoEnum.DEVIDO.equals((Object)item.getVerbaDeCalculo().getGerarReflexo())) {
                    valorBase = ocorrencia.getDevido();
                    valorDaBaseIntegral = ocorrencia.getDevidoIntegral();
                } else {
                    valorBase = ocorrencia.getDiferenca();
                    valorDaBaseIntegral = ocorrencia.getDiferencaIntegral();
                }
                valorDoPeriodo = valorDoPeriodo.add(valorBase, Utils.CONTEXTO_MATEMATICO);
                if (!Utils.nulo(valorDoPeriodoIntegral)) continue;
                valorDoPeriodoIntegral = valorDaBaseIntegral;
            }
            if (!diasCobertos.isEmpty()) {
                if (TratamentoDaFracaoDeMesDoReflexoEnum.INTEGRALIZAR.equals((Object)((Reflexo)parametro.getVerbaDeCalculo()).getTratamentoDaFracaoDeMesDoReflexo())) {
                    if (Utils.naoNulo(valorDoPeriodoIntegral)) {
                        valorDoPeriodo = valorDoPeriodoIntegral;
                    } else {
                        int qtdDias = diasCobertos.size();
                        if ((qtdDias -= diasParaExcluir) < 0) {
                            qtdDias = 0;
                        }
                        if (qtdDias == 0) {
                            Date inicioMes = HelperDate.getInstance(periodo.getFinal()).setDay(1).getDate();
                            Date fimMes = HelperDate.getInstance(periodo.getFinal()).setDay(HelperDate.getInstance(periodo.getFinal()).daysInMonth()).getDate();
                            Periodo mesVerbaBase = new Periodo(inicioMes, fimMes);
                            valorDoPeriodo = SimuladorDeBaseParaVerba.obterValorTeoricoParaMesSemFeriasOuFaltas(base, mesVerbaBase, parametro);
                        } else {
                            Periodo periodoCondensadoParaCalculoDaIntegralizacao = new Periodo(HelperDate.getCurrentCompetence(periodo.getFinal()), HelperDate.getCurrentCompetence(periodo.getFinal()).setDay(diasCobertos.size()));
                            CalculoDoIntegralizar integralizar = new CalculoDoIntegralizar(periodoCondensadoParaCalculoDaIntegralizacao, valorDoPeriodo, diasParaExcluir);
                            integralizar.executar();
                            valorDoPeriodo = integralizar.getResultado();
                        }
                    }
                }
            } else {
                valorDoPeriodo = BigDecimal.ZERO;
            }
            long diasPeriodo = periodo.totalDeDias();
            valorBaseReflexo = valorBaseReflexo.add(valorDoPeriodo.multiply(new BigDecimal(diasPeriodo), Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO);
        }
        if (CaracteristicaDaVerbaEnum.FERIAS.equals((Object)parametro.getVerbaDeCalculo().getCaracteristica()) && !RegimeDoContratoEnum.INTERMITENTE.equals((Object)parametro.getCalculo().getRegimeDoContrato())) {
            valorBaseReflexo = valorBaseReflexo.divide(new BigDecimal(30), Utils.CONTEXTO_MATEMATICO);
            if (HelperDate.dateEquals(parametro.getPeriodo().getInicial(), parametro.getPeriodo().getFinal()) && Utils.naoNulo(parametro.getCalculo().getDataDemissao()) && HelperDate.dateEquals(parametro.getPeriodo().getInicial(), parametro.getCalculo().getDataDemissao())) {
                boolean encontrouFerias = false;
                for (Ferias ferias : parametro.getCalculo().getListaDeFerias()) {
                    if (!ferias.getPeriodoAquisitivo().isMesmoPeriodo(parametro.getPeriodoAquisitivo())) continue;
                    encontrouFerias = true;
                    if (!SituacaoDaFeriasEnum.INDENIZADAS.equals((Object)ferias.getSituacao()) && !SituacaoDaFeriasEnum.GOZADAS_PARCIALMENTE.equals((Object)ferias.getSituacao())) break;
                    Integer totalDeDias = ferias.getPrazo();
                    if (ferias.getPeriodoDeGozo1() != null) {
                        totalDeDias = totalDeDias - ferias.getPeriodoDeGozo1().totalDeDias();
                    }
                    if (ferias.getPeriodoDeGozo2() != null) {
                        totalDeDias = totalDeDias - ferias.getPeriodoDeGozo2().totalDeDias();
                    }
                    if (ferias.getPeriodoDeGozo3() != null) {
                        totalDeDias = totalDeDias - ferias.getPeriodoDeGozo3().totalDeDias();
                    }
                    if (ferias.getAbono().booleanValue()) {
                        totalDeDias = totalDeDias - ferias.getQuantidadeDiasAbono();
                    }
                    valorBaseReflexo = valorBaseReflexo.multiply(new BigDecimal(totalDeDias), Utils.CONTEXTO_MATEMATICO);
                    break;
                }
                if (!encontrouFerias) {
                    int n = Ferias.encontrarPrazoFeriasProporcionais(parametro);
                    valorBaseReflexo = valorBaseReflexo.multiply(new BigDecimal(n), Utils.CONTEXTO_MATEMATICO);
                }
            }
        } else {
            valorBaseReflexo = valorBaseReflexo.divide(new BigDecimal(diasOcorrenciaReflexo), Utils.CONTEXTO_MATEMATICO);
        }
        return valorBaseReflexo;
    }
}

