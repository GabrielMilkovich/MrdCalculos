/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;

public abstract class ComportamentoDaBaseDoReflexo
implements Serializable {
    private static final long serialVersionUID = -6015386768263060830L;
    protected static final int TRINTA_DIAS = 30;
    protected static final BigDecimal TRINTA = new BigDecimal("30");

    public abstract BigDecimal resolverValor(ItemBaseVerba var1, ParametroDoTermo var2);

    protected List<OcorrenciaDeVerba> obterOcorrenciasDoPeriodoDaMediaDoReflexo(ParametroDoTermo parametro, VerbaDeCalculo base) {
        Reflexo reflexo = (Reflexo)parametro.getVerbaDeCalculo();
        switch (reflexo.getPeriodoMediaReflexo()) {
            case ANO_CIVIL: {
                List<OcorrenciaDeVerba> ocorrencias = base.obterOcorrenciasDoAno(parametro.getPeriodo().getFinal());
                if (parametro.getCalculo().getDataDemissao() != null) {
                    ArrayList<OcorrenciaDeVerba> ocorrenciasAtualizadas = new ArrayList<OcorrenciaDeVerba>();
                    for (OcorrenciaDeVerba ocorrencia : ocorrencias) {
                        if (!HelperDate.getCurrentCompetence(ocorrencia.getDataInicial()).lessThanOrEqualsTo(HelperDate.getCurrentCompetence(parametro.getCalculo().getDataDemissao()))) continue;
                        ocorrenciasAtualizadas.add(ocorrencia);
                    }
                    ocorrencias = ocorrenciasAtualizadas;
                }
                return ocorrencias;
            }
            case DOZE_MESES_ANTERIORES_AO_VENCIMENTO_DA_PARCELA: {
                return base.obterDozeOcorrenciasAnterioresAoMes(parametro.getPeriodo().getInicial());
            }
            case PERIODO_AQUISITIVO: {
                if (parametro.getPeriodoAquisitivo() == null) {
                    return new ArrayList<OcorrenciaDeVerba>();
                }
                Date inicio = parametro.getPeriodoAquisitivo().getInicial();
                Date fim = parametro.getPeriodoAquisitivo().getFinal();
                if (parametro.getCalculo().getDataDemissao() != null && HelperDate.dateAfter(parametro.getPeriodoAquisitivo().getFinal(), parametro.getCalculo().getDataDemissao())) {
                    fim = parametro.getCalculo().getDataDemissao();
                    if (HelperDate.dateAfter(parametro.getPeriodoAquisitivo().getInicial(), parametro.getCalculo().getDataDemissao())) {
                        inicio = HelperDate.getInstance(parametro.getPeriodoAquisitivo().getInicial()).addYear(-1).getDate();
                    }
                }
                if (HelperDate.breakInMonths(inicio, fim).size() == 13) {
                    return base.obterOcorrenciasEntreMeses(inicio, HelperDate.getInstance(fim).addMonth(-1).getDate());
                }
                return base.obterOcorrenciasEntreMeses(inicio, fim);
            }
            case ULTIMOS_DOZE_MESES_DO_CONTRATO: {
                if (parametro.getCalculo().getDataDemissao() == null) {
                    return new ArrayList<OcorrenciaDeVerba>();
                }
                return base.obterDozeOcorrenciasAnterioresAoMes(HelperDate.getInstance(parametro.getCalculo().getDataDemissao()).addMonth(1).getDate());
            }
        }
        return new ArrayList<OcorrenciaDeVerba>();
    }

    protected int obterQuantidadeEsperadaDeOcorrenciasParaMediaDoReflexo(ParametroDoTermo parametro) {
        Reflexo reflexo = (Reflexo)parametro.getVerbaDeCalculo();
        int quantidade = 0;
        switch (reflexo.getPeriodoMediaReflexo()) {
            case ANO_CIVIL: {
                int ano = HelperDate.getInstance(parametro.getPeriodo().getInicial()).getYear();
                for (int i = 0; i < 12; ++i) {
                    if (!HelperDate.getCurrentCompetence(parametro.getCalculo().getDataAdmissao()).lessThanOrEqualsTo(HelperDate.getInstance(ano, i, 1))) continue;
                    if (parametro.getCalculo().getDataDemissao() != null) {
                        if (!HelperDate.getInstance(ano, i, 1).lessThanOrEqualsTo(HelperDate.getCurrentCompetence(parametro.getCalculo().getDataDemissao()))) continue;
                        ++quantidade;
                        continue;
                    }
                    ++quantidade;
                }
                return quantidade;
            }
            case DOZE_MESES_ANTERIORES_AO_VENCIMENTO_DA_PARCELA: {
                HelperDate mesAnteriorDataInicial = HelperDate.getCurrentCompetence(parametro.getPeriodo().getInicial()).addMonth(-13);
                for (int i = 0; i < 12; ++i) {
                    if (!HelperDate.getCurrentCompetence(parametro.getCalculo().getDataAdmissao()).lessThanOrEqualsTo(mesAnteriorDataInicial.addMonth(1))) continue;
                    ++quantidade;
                }
                return quantidade;
            }
            case PERIODO_AQUISITIVO: {
                int valorQuantidade;
                if (parametro.getPeriodoAquisitivo() == null) {
                    return 0;
                }
                Date inicio = parametro.getPeriodoAquisitivo().getInicial();
                Date fim = parametro.getPeriodoAquisitivo().getFinal();
                if (parametro.getCalculo().getDataDemissao() != null && HelperDate.dateAfter(parametro.getPeriodoAquisitivo().getFinal(), parametro.getCalculo().getDataDemissao())) {
                    fim = parametro.getCalculo().getDataDemissao();
                    if (HelperDate.dateAfter(parametro.getPeriodoAquisitivo().getInicial(), parametro.getCalculo().getDataDemissao())) {
                        inicio = HelperDate.getInstance(parametro.getPeriodoAquisitivo().getInicial()).addYear(-1).getDate();
                    }
                }
                if ((valorQuantidade = HelperDate.breakInMonths(inicio, fim).size()) == 13) {
                    --valorQuantidade;
                }
                return valorQuantidade;
            }
            case ULTIMOS_DOZE_MESES_DO_CONTRATO: {
                if (parametro.getCalculo().getDataDemissao() == null) {
                    return 0;
                }
                HelperDate mesPosteriordataFimContrato = HelperDate.getCurrentCompetence(parametro.getCalculo().getDataDemissao()).addMonth(1);
                for (int i = 0; i < 12; ++i) {
                    if (!HelperDate.getCurrentCompetence(parametro.getCalculo().getDataAdmissao()).lessThanOrEqualsTo(mesPosteriordataFimContrato.addMonth(-1))) continue;
                    ++quantidade;
                }
                return quantidade;
            }
        }
        return quantidade;
    }

    protected void marcarDias(Set<Date> diasCobertos, OcorrenciaDeVerba ocorrencia) {
        HelperDate auxiliarInicio = HelperDate.getInstance(ocorrencia.getDataInicial());
        HelperDate auxiliarFim = HelperDate.getInstance(ocorrencia.getDataFinal());
        auxiliarInicio.removeTime();
        auxiliarFim.removeTime();
        while (auxiliarInicio.lessThanOrEqualsTo(auxiliarFim)) {
            diasCobertos.add(auxiliarInicio.getDate());
            auxiliarInicio.addDay(1);
        }
    }

    protected void agruparOcorrencias(List<OcorrenciaDeVerba> ocorrencias, Map<Date, List<OcorrenciaDeVerba>> ocorrenciasAgrupadas) {
        for (OcorrenciaDeVerba ocorrencia : ocorrencias) {
            HelperDate competenciaOcorrencia = HelperDate.getInstance(ocorrencia.getDataFinal());
            competenciaOcorrencia.removeTime();
            competenciaOcorrencia.setDay(1);
            if (!ocorrenciasAgrupadas.containsKey(competenciaOcorrencia.getDate())) {
                ocorrenciasAgrupadas.put(competenciaOcorrencia.getDate(), new ArrayList());
            }
            ocorrenciasAgrupadas.get(competenciaOcorrencia.getDate()).add(ocorrencia);
        }
    }

    protected TabelaDeCorrecaoMonetaria obterTabelaDeCorrecaoMonetaria(VerbaDeCalculo verba, ParametroDoTermo parametro) {
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(verba.getCalculo().getAtualizacaoMonetaria(), verba.getCalculo().getIndicesAcumulados(), verba.getCalculo().getIgnorarTaxaCorrecaoNegativa());
        Reflexo reflexo = (Reflexo)parametro.getVerbaDeCalculo();
        Periodo periodo = new Periodo();
        switch (reflexo.getPeriodoMediaReflexo()) {
            case ANO_CIVIL: 
            case ULTIMOS_DOZE_MESES_DO_CONTRATO: {
                periodo.setFinal(parametro.getPeriodo().getInicial());
                HelperDate helperDate = HelperDate.getInstance(parametro.getPeriodo().getInicial());
                helperDate.addYear(-2);
                periodo.setInicial(helperDate.getDate());
                break;
            }
            case DOZE_MESES_ANTERIORES_AO_VENCIMENTO_DA_PARCELA: {
                HelperDate dataInicial = HelperDate.getInstance(parametro.getPeriodo().getFinal());
                dataInicial.addMonth(-1);
                periodo.setFinal(dataInicial.getDate());
                HelperDate dataFinal = HelperDate.getInstance(parametro.getPeriodo().getInicial());
                dataFinal.addYear(-2);
                periodo.setInicial(dataFinal.getDate());
                break;
            }
            case PERIODO_AQUISITIVO: {
                periodo.setFinal(parametro.getPeriodo().getInicial());
                periodo.setInicial(parametro.getPeriodoAquisitivo().getInicial());
            }
        }
        tabelaDeCorrecaoMonetaria.setOrigemCalculo(Boolean.TRUE);
        tabelaDeCorrecaoMonetaria.carregarTabela(periodo);
        return tabelaDeCorrecaoMonetaria;
    }

    protected BigDecimal verificarValorParaFerias(ParametroDoTermo parametro, BigDecimal valorDoPeriodo, int diasPeriodo) {
        if (parametro.getVerbaDeCalculo().isCaracteristicaFerias()) {
            if (HelperDate.dateEquals(parametro.getPeriodo().getInicial(), parametro.getPeriodo().getFinal()) && Utils.naoNulo(parametro.getCalculo().getDataDemissao()) && HelperDate.dateEquals(parametro.getPeriodo().getInicial(), parametro.getCalculo().getDataDemissao())) {
                boolean encontrouFerias = false;
                for (Ferias ferias : parametro.getCalculo().getListaDeFerias()) {
                    if (!ferias.getPeriodoAquisitivo().isMesmoPeriodo(parametro.getPeriodoAquisitivo())) continue;
                    encontrouFerias = true;
                    if (!parametro.isFeriasIndenizadas()) break;
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
                    valorDoPeriodo = valorDoPeriodo.multiply(new BigDecimal(totalDeDias), Utils.CONTEXTO_MATEMATICO);
                    break;
                }
                if (!encontrouFerias) {
                    int prazo = Ferias.encontrarPrazoFeriasProporcionais(parametro);
                    valorDoPeriodo = valorDoPeriodo.multiply(new BigDecimal(prazo), Utils.CONTEXTO_MATEMATICO);
                }
            } else {
                valorDoPeriodo = valorDoPeriodo.multiply(new BigDecimal(diasPeriodo), Utils.CONTEXTO_MATEMATICO);
            }
            valorDoPeriodo = valorDoPeriodo.divide(TRINTA, Utils.CONTEXTO_MATEMATICO);
        }
        return valorDoPeriodo;
    }
}

