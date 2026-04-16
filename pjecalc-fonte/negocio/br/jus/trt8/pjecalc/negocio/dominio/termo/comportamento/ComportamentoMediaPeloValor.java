/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoIntegralizar;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeGeracaoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.comportamento.ComportamentoDaBaseDoReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ComportamentoMediaPeloValor
extends ComportamentoDaBaseDoReflexo {
    private static final long serialVersionUID = -2551689556247306275L;
    private static final boolean NAO_CORRIGIR = Boolean.FALSE;

    @Override
    public BigDecimal resolverValor(ItemBaseVerba item, ParametroDoTermo parametro) {
        return this.resolverValor(item, parametro, NAO_CORRIGIR);
    }

    protected BigDecimal resolverValor(ItemBaseVerba item, ParametroDoTermo parametro, boolean corrigir) {
        BigDecimal fatorConversaoMoedasAteDataDoReflexo;
        VerbaDeCalculo base = item.getVerbaDeCalculo();
        int quantidadePeriodosDaMedia = this.obterQuantidadeEsperadaDeOcorrenciasParaMediaDoReflexo(parametro);
        BigDecimal media = BigDecimal.ZERO;
        List<OcorrenciaDeVerba> ocorrencias = this.obterOcorrenciasDoPeriodoDaMediaDoReflexo(parametro, item.getVerbaDeCalculo());
        LinkedHashMap<Date, List<OcorrenciaDeVerba>> ocorrenciasAgrupadas = new LinkedHashMap<Date, List<OcorrenciaDeVerba>>();
        this.agruparOcorrencias(ocorrencias, ocorrenciasAgrupadas);
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = corrigir ? this.obterTabelaDeCorrecaoMonetaria(item.getVerbaDeCalculo(), parametro) : null;
        Map<Date, BigDecimal> fatores = corrigir ? null : this.calcularFatorDasCompetencias(ocorrenciasAgrupadas.keySet());
        Date ultimaCompetencia = null;
        for (Map.Entry entry : ocorrenciasAgrupadas.entrySet()) {
            if (Utils.nulo(ultimaCompetencia) || HelperDate.dateAfter((Date)entry.getKey(), ultimaCompetencia)) {
                ultimaCompetencia = (Date)entry.getKey();
            }
            List ocorrenciasDaCompetencia = (List)entry.getValue();
            HashSet<Date> diasCobertos = new HashSet<Date>();
            int diasParaExcluir = 0;
            BigDecimal valorDaCompetencia = BigDecimal.ZERO;
            BigDecimal valorDaCompetenciaIntegral = null;
            for (OcorrenciaDeVerba ocorrencia : ocorrenciasDaCompetencia) {
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
                valorDaCompetencia = valorDaCompetencia.add(valorBase, Utils.CONTEXTO_MATEMATICO);
                if (!Utils.nulo(valorDaCompetenciaIntegral)) continue;
                valorDaCompetenciaIntegral = valorDaBaseIntegral;
            }
            if (diasCobertos.isEmpty()) continue;
            switch (((Reflexo)parametro.getVerbaDeCalculo()).getTratamentoDaFracaoDeMesDoReflexo()) {
                case MANTER: {
                    if (!corrigir) {
                        valorDaCompetencia = valorDaCompetencia.divide(fatores.get(entry.getKey()), Utils.CONTEXTO_MATEMATICO);
                    }
                    media = media.add(corrigir ? Utils.aplicarCorrecaoMonetaria(tabelaDeCorrecaoMonetaria.obterIndice((Date)entry.getKey()), valorDaCompetencia) : valorDaCompetencia, Utils.CONTEXTO_MATEMATICO);
                    break;
                }
                case INTEGRALIZAR: {
                    int qtdDias = diasCobertos.size();
                    if ((qtdDias -= diasParaExcluir) < 0) {
                        qtdDias = 0;
                    }
                    if (qtdDias > 0) {
                        if (Utils.naoNulo(valorDaCompetenciaIntegral)) {
                            valorDaCompetencia = valorDaCompetenciaIntegral;
                        } else {
                            Periodo periodoCondensadoParaCalculoDaIntegralizacao = new Periodo(HelperDate.getInstance((Date)entry.getKey()).setDay(1).getDate(), HelperDate.getInstance((Date)entry.getKey()).setDay(diasCobertos.size()).getDate());
                            CalculoDoIntegralizar integralizar = new CalculoDoIntegralizar(periodoCondensadoParaCalculoDaIntegralizacao, valorDaCompetencia, diasParaExcluir);
                            integralizar.executar();
                            valorDaCompetencia = integralizar.getResultado();
                        }
                    }
                    if (!corrigir) {
                        valorDaCompetencia = valorDaCompetencia.divide(fatores.get(entry.getKey()), Utils.CONTEXTO_MATEMATICO);
                    }
                    media = media.add(corrigir ? Utils.aplicarCorrecaoMonetaria(tabelaDeCorrecaoMonetaria.obterIndice((Date)entry.getKey()), valorDaCompetencia) : valorDaCompetencia, Utils.CONTEXTO_MATEMATICO);
                    break;
                }
                case DESPREZAR: {
                    int qtdDias = diasCobertos.size();
                    Date inicioMes = HelperDate.getInstance((Date)entry.getKey()).setDay(1).getDate();
                    Date fimMes = HelperDate.getInstance((Date)entry.getKey()).setDay(HelperDate.getInstance((Date)entry.getKey()).daysInMonth()).getDate();
                    Periodo mesVerbaBase = new Periodo(inicioMes, fimMes);
                    if ((qtdDias -= diasParaExcluir) < mesVerbaBase.totalDeDias()) {
                        --quantidadePeriodosDaMedia;
                        break;
                    }
                    if (!corrigir) {
                        valorDaCompetencia = valorDaCompetencia.divide(fatores.get(entry.getKey()), Utils.CONTEXTO_MATEMATICO);
                    }
                    media = media.add(corrigir ? Utils.aplicarCorrecaoMonetaria(tabelaDeCorrecaoMonetaria.obterIndice((Date)entry.getKey()), valorDaCompetencia) : valorDaCompetencia, Utils.CONTEXTO_MATEMATICO);
                    break;
                }
                case DESPREZAR_MENOR_QUE_15_DIAS: {
                    int qtdDias = diasCobertos.size();
                    if ((qtdDias -= diasParaExcluir) < 15) {
                        --quantidadePeriodosDaMedia;
                        break;
                    }
                    if (!corrigir) {
                        valorDaCompetencia = valorDaCompetencia.divide(fatores.get(entry.getKey()), Utils.CONTEXTO_MATEMATICO);
                    }
                    media = media.add(corrigir ? Utils.aplicarCorrecaoMonetaria(tabelaDeCorrecaoMonetaria.obterIndice((Date)entry.getKey()), valorDaCompetencia) : valorDaCompetencia, Utils.CONTEXTO_MATEMATICO);
                }
            }
        }
        if (quantidadePeriodosDaMedia <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal valor = media.divide(new BigDecimal(quantidadePeriodosDaMedia), Utils.CONTEXTO_MATEMATICO);
        if (parametro.getVerbaDeCalculo().isCaracteristicaFerias()) {
            valor = this.verificarValorParaFerias(parametro, valor, parametro.getPeriodo().totalDeDias());
        }
        if (!corrigir && Utils.naoNulo(fatorConversaoMoedasAteDataDoReflexo = this.encontrarFatorConversaoAteDataDoReflexo(ultimaCompetencia, parametro.getPeriodo().getInicial())) && BigDecimal.ZERO.compareTo(fatorConversaoMoedasAteDataDoReflexo) != 0) {
            valor = valor.divide(fatorConversaoMoedasAteDataDoReflexo, Utils.CONTEXTO_MATEMATICO);
        }
        return valor;
    }

    private BigDecimal encontrarFatorConversaoAteDataDoReflexo(Date ultimaCompetencia, Date dataDoReflexo) {
        if (Utils.nulo(ultimaCompetencia)) {
            return null;
        }
        BigDecimal fator = null;
        for (Map.Entry<Date, BigDecimal> entry : ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.entrySet()) {
            if (!HelperDate.dateAfter(entry.getKey(), ultimaCompetencia) || !HelperDate.dateBeforeOrEquals(entry.getKey(), dataDoReflexo)) continue;
            if (Utils.nulo(fator)) {
                fator = entry.getValue();
                continue;
            }
            fator = Utils.multiplicar(fator, entry.getValue());
        }
        return fator;
    }

    private Map<Date, BigDecimal> calcularFatorDasCompetencias(Set<Date> competenciasDaMedia) {
        HashMap<Date, BigDecimal> mapaDeFatores = new HashMap<Date, BigDecimal>();
        Date dataConversao = this.encontraMesDeConversaoNoPeriodoDaMedia(competenciasDaMedia);
        if (Utils.naoNulo(dataConversao)) {
            for (Date data : competenciasDaMedia) {
                if (HelperDate.dateBefore(data, dataConversao)) {
                    mapaDeFatores.put(data, ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(dataConversao));
                    continue;
                }
                mapaDeFatores.put(data, BigDecimal.ONE);
            }
        } else {
            for (Date data : competenciasDaMedia) {
                mapaDeFatores.put(data, BigDecimal.ONE);
            }
        }
        return mapaDeFatores;
    }

    private Date encontraMesDeConversaoNoPeriodoDaMedia(Set<Date> competenciasDaMedia) {
        if (Utils.nulo(competenciasDaMedia) || competenciasDaMedia.isEmpty()) {
            return null;
        }
        Date dataInicial = null;
        Date dataFinal = null;
        for (Date data : competenciasDaMedia) {
            if (Utils.nulo(dataInicial)) {
                dataInicial = data;
                dataFinal = data;
                continue;
            }
            if (HelperDate.dateBefore(data, dataInicial)) {
                dataInicial = data;
            }
            if (!HelperDate.dateAfter(data, dataFinal)) continue;
            dataFinal = data;
        }
        return this.encontraMesDeConversaoEntreAsDatas(dataInicial, dataFinal);
    }

    private Date encontraMesDeConversaoEntreAsDatas(Date dataInicial, Date dataFinal) {
        Date dataConversao = null;
        for (Map.Entry<Date, BigDecimal> entry : ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.entrySet()) {
            if (!HelperDate.dateAfterOrEquals(entry.getKey(), dataInicial) || !HelperDate.dateBeforeOrEquals(entry.getKey(), dataFinal)) continue;
            dataConversao = entry.getKey();
        }
        return dataConversao;
    }
}

