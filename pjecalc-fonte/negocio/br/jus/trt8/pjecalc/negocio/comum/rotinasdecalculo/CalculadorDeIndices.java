/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.jam.IndiceJAM;
import br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicDiaria;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaDebitoTrabalhista;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTDiario;
import br.jus.trt8.pjecalc.negocio.dominio.juros.taxalegal.JurosTaxaLegal;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;

public class CalculadorDeIndices {
    private static boolean isCompetenciaDiaria(List<? extends IndiceDeCalculo> listaDeIndices) {
        if (listaDeIndices == null || listaDeIndices.isEmpty()) {
            return false;
        }
        boolean isDiaria = listaDeIndices.get(0) instanceof IndiceJAM || listaDeIndices.get(0) instanceof IndiceTabelaUnicaJTDiario || listaDeIndices.get(0) instanceof IndiceTabelaUnicaDebitoTrabalhista || listaDeIndices.get(0) instanceof IndiceSelicDiaria;
        isDiaria = isDiaria || listaDeIndices.get(0) instanceof JurosTaxaLegal;
        return isDiaria;
    }

    private static boolean isMesSubsequente(List<? extends IndiceDeCalculo> listaDeIndices) {
        if (listaDeIndices == null || listaDeIndices.isEmpty()) {
            return false;
        }
        return listaDeIndices.get(0) instanceof IndiceTabelaUnicaJTDiario || listaDeIndices.get(0) instanceof IndiceTabelaUnicaDebitoTrabalhista || listaDeIndices.get(0) instanceof IndiceSelicDiaria;
    }

    private static boolean isJAM(List<? extends IndiceDeCalculo> listaDeIndices) {
        return listaDeIndices != null && !listaDeIndices.isEmpty() && listaDeIndices.get(0) instanceof IndiceJAM;
    }

    private static Date encontrarCompetenciaDiariaParaConversaoDeMoedasUltrapassada(Date dataIndiceAnterior, Date dataIndiceAtual, boolean isMesSubsequente, boolean isJAM) {
        if (isMesSubsequente) {
            for (Date competenciaParaConversao : ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.keySet()) {
                if (!HelperDate.dateAfterOrEquals(dataIndiceAnterior, competenciaParaConversao) || !HelperDate.dateBefore(dataIndiceAtual, competenciaParaConversao)) continue;
                return competenciaParaConversao;
            }
        } else if (isJAM) {
            Date marco1991 = HelperDate.getInstance(1991, 2, 1).getDate();
            if (HelperDate.dateBeforeOrEquals(dataIndiceAnterior, marco1991)) {
                Date dataIndiceAnteriorAuxiliar = HelperDate.getInstance(dataIndiceAnterior).addMonth(-3).getDate();
                Date dataIndiceAtualAuxiliar = HelperDate.getInstance(dataIndiceAtual).addMonth(-3).getDate();
                for (Date competenciaParaConversao : ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.keySet()) {
                    if (!HelperDate.dateAfter(dataIndiceAnteriorAuxiliar, competenciaParaConversao) || !HelperDate.dateBeforeOrEquals(dataIndiceAtualAuxiliar, competenciaParaConversao)) continue;
                    return competenciaParaConversao;
                }
            } else {
                for (Date competenciaParaConversao : ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.keySet()) {
                    if (!HelperDate.dateAfter(dataIndiceAnterior, competenciaParaConversao) || !HelperDate.dateBeforeOrEquals(dataIndiceAtual, competenciaParaConversao)) continue;
                    return competenciaParaConversao;
                }
            }
        } else {
            for (Date competenciaParaConversao : ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.keySet()) {
                if (!HelperDate.dateAfter(dataIndiceAnterior, competenciaParaConversao) || !HelperDate.dateBeforeOrEquals(dataIndiceAtual, competenciaParaConversao)) continue;
                return competenciaParaConversao;
            }
        }
        return null;
    }

    public static List<IndiceDeCalculo> calcularIndiceAcumulado(List<? extends IndiceDeCalculo> listaDeIndices) {
        ArrayList<? extends IndiceDeCalculo> novaLista = new ArrayList<IndiceDeCalculo>();
        for (IndiceDeCalculo indiceDeCalculo : listaDeIndices) {
            novaLista.add(indiceDeCalculo.clonar());
        }
        listaDeIndices = novaLista;
        if (CalculadorDeIndices.isCompetenciaDiaria(listaDeIndices)) {
            return CalculadorDeIndices.calcularIndiceAcumuladoParaIndiceDiario(listaDeIndices, CalculadorDeIndices.isMesSubsequente(listaDeIndices), CalculadorDeIndices.isJAM(listaDeIndices));
        }
        Collections.sort(listaDeIndices);
        IndiceDeCalculo indiceAnterior = null;
        for (IndiceDeCalculo indiceDeCalculo : listaDeIndices) {
            if (Utils.nulo(indiceAnterior)) {
                if (ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.containsKey(indiceDeCalculo.getCompetencia())) {
                    indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice().divide(ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(indiceDeCalculo.getCompetencia()), Utils.CONTEXTO_MATEMATICO));
                } else {
                    indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice());
                }
            } else if (ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.containsKey(indiceDeCalculo.getCompetencia())) {
                indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice().divide(ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(indiceDeCalculo.getCompetencia()), Utils.CONTEXTO_MATEMATICO).multiply(indiceAnterior.getValorAcumulado(), Utils.CONTEXTO_MATEMATICO));
            } else {
                indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice().multiply(indiceAnterior.getValorAcumulado(), Utils.CONTEXTO_MATEMATICO));
            }
            indiceAnterior = indiceDeCalculo;
        }
        return Collections.unmodifiableList(listaDeIndices);
    }

    private static List<IndiceDeCalculo> calcularIndiceAcumuladoParaIndiceDiario(List<? extends IndiceDeCalculo> listaDeIndices, boolean isMesSubsequente, boolean isJAM) {
        Collections.sort(listaDeIndices);
        IndiceDeCalculo indiceAnterior = null;
        for (IndiceDeCalculo indiceDeCalculo : listaDeIndices) {
            if (Utils.nulo(indiceAnterior)) {
                indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice());
            } else {
                Date dataDeConversao = CalculadorDeIndices.encontrarCompetenciaDiariaParaConversaoDeMoedasUltrapassada(indiceAnterior.getCompetencia(), indiceDeCalculo.getCompetencia(), isMesSubsequente, isJAM);
                if (dataDeConversao != null) {
                    indiceAnterior.setValorAcumulado(indiceAnterior.getValorAcumulado().divide(ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.get(dataDeConversao), Utils.CONTEXTO_MATEMATICO));
                }
                indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice().multiply(indiceAnterior.getValorAcumulado(), Utils.CONTEXTO_MATEMATICO));
            }
            indiceAnterior = indiceDeCalculo;
        }
        return Collections.unmodifiableList(listaDeIndices);
    }

    public static List<IndiceDeCalculo> obterTabelaDeIndicesIgnorandoTaxasNegativas(List<? extends IndiceDeCalculo> listaDeIndices) {
        if (CalculadorDeIndices.isCompetenciaDiaria(listaDeIndices)) {
            return CalculadorDeIndices.calcularIndiceAcumuladoParaIndiceDiarioIgnorandoTaxasNegativas(listaDeIndices, CalculadorDeIndices.isMesSubsequente(listaDeIndices), CalculadorDeIndices.isJAM(listaDeIndices));
        }
        ArrayList<? extends IndiceDeCalculo> listaModificada = new ArrayList<IndiceDeCalculo>(listaDeIndices);
        Collections.sort(listaModificada);
        IndiceDeCalculo indiceAnterior = null;
        for (IndiceDeCalculo indiceDeCalculo : listaModificada) {
            if (Utils.nulo(indiceAnterior)) {
                if (indiceDeCalculo.getTaxa().compareTo(BigDecimal.ZERO) < 0) {
                    if (ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.containsKey(indiceDeCalculo.getCompetencia())) {
                        indiceDeCalculo.setValorAcumulado(BigDecimal.ONE.divide(ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(indiceDeCalculo.getCompetencia()), Utils.CONTEXTO_MATEMATICO));
                    } else {
                        indiceDeCalculo.setValorAcumulado(BigDecimal.ONE);
                    }
                } else if (ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.containsKey(indiceDeCalculo.getCompetencia())) {
                    indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice().divide(ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(indiceDeCalculo.getCompetencia()), Utils.CONTEXTO_MATEMATICO));
                } else {
                    indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice());
                }
            } else if (indiceDeCalculo.getTaxa().compareTo(BigDecimal.ZERO) < 0) {
                if (ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.containsKey(indiceDeCalculo.getCompetencia())) {
                    indiceDeCalculo.setValorAcumulado(BigDecimal.ONE.divide(ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(indiceDeCalculo.getCompetencia()), Utils.CONTEXTO_MATEMATICO).multiply(indiceAnterior.getValorAcumulado(), Utils.CONTEXTO_MATEMATICO));
                } else {
                    indiceDeCalculo.setValorAcumulado(BigDecimal.ONE.multiply(indiceAnterior.getValorAcumulado(), Utils.CONTEXTO_MATEMATICO));
                }
            } else if (ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.containsKey(indiceDeCalculo.getCompetencia())) {
                indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice().divide(ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(indiceDeCalculo.getCompetencia()), Utils.CONTEXTO_MATEMATICO).multiply(indiceAnterior.getValorAcumulado(), Utils.CONTEXTO_MATEMATICO));
            } else {
                indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice().multiply(indiceAnterior.getValorAcumulado(), Utils.CONTEXTO_MATEMATICO));
            }
            indiceAnterior = indiceDeCalculo;
        }
        return Collections.unmodifiableList(listaModificada);
    }

    private static List<IndiceDeCalculo> calcularIndiceAcumuladoParaIndiceDiarioIgnorandoTaxasNegativas(List<? extends IndiceDeCalculo> listaDeIndices, boolean isMesSubsequente, boolean isJAM) {
        ArrayList<? extends IndiceDeCalculo> listaModificada = new ArrayList<IndiceDeCalculo>(listaDeIndices);
        Collections.sort(listaModificada);
        IndiceDeCalculo indiceAnterior = null;
        for (IndiceDeCalculo indiceDeCalculo : listaModificada) {
            if (Utils.nulo(indiceAnterior)) {
                if (indiceDeCalculo.getTaxa().compareTo(BigDecimal.ZERO) < 0) {
                    indiceDeCalculo.setValorAcumulado(BigDecimal.ONE);
                } else {
                    indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice());
                }
            } else {
                Date dataDeConversao = CalculadorDeIndices.encontrarCompetenciaDiariaParaConversaoDeMoedasUltrapassada(indiceAnterior.getCompetencia(), indiceDeCalculo.getCompetencia(), isMesSubsequente, isJAM);
                if (dataDeConversao != null) {
                    indiceAnterior.setValorAcumulado(indiceAnterior.getValorAcumulado().divide(ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.get(dataDeConversao), Utils.CONTEXTO_MATEMATICO));
                }
                if (indiceDeCalculo.getTaxa().compareTo(BigDecimal.ZERO) < 0) {
                    indiceDeCalculo.setValorAcumulado(BigDecimal.ONE.multiply(indiceAnterior.getValorAcumulado(), Utils.CONTEXTO_MATEMATICO));
                } else {
                    indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorIndice().multiply(indiceAnterior.getValorAcumulado(), Utils.CONTEXTO_MATEMATICO));
                }
            }
            indiceAnterior = indiceDeCalculo;
        }
        return Collections.unmodifiableList(listaModificada);
    }

    public static List<IndiceDeCalculo> calcularIndiceAcumuladoComSomas(List<? extends IndiceDeCalculo> listaDeIndices, Boolean ignorarTaxaNegativa) {
        Collections.sort(listaDeIndices);
        IndiceDeCalculo indiceAnterior = null;
        BigDecimal fatorConversao = BigDecimal.ONE;
        for (IndiceDeCalculo indiceDeCalculo : listaDeIndices) {
            BigDecimal valorIndice = indiceDeCalculo.getValorIndice();
            if (ignorarTaxaNegativa.booleanValue() && indiceDeCalculo.getTaxa().compareTo(BigDecimal.ZERO) < 0) {
                valorIndice = BigDecimal.ONE;
            }
            if (indiceAnterior == null) {
                if (ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.containsKey(indiceDeCalculo.getCompetencia())) {
                    fatorConversao = Utils.multiplicar(fatorConversao, ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(indiceDeCalculo.getCompetencia()));
                }
                indiceDeCalculo.setValorAcumulado(valorIndice.divide(fatorConversao, Utils.CONTEXTO_MATEMATICO));
            } else {
                BigDecimal acumuladoSemConversao = Utils.multiplicar(indiceAnterior.getValorAcumulado(), fatorConversao);
                if (ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.containsKey(indiceDeCalculo.getCompetencia())) {
                    fatorConversao = Utils.multiplicar(fatorConversao, ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(indiceDeCalculo.getCompetencia()));
                }
                indiceDeCalculo.setValorAcumulado(Utils.dividir(Utils.subtrair(valorIndice, BigDecimal.ONE).add(acumuladoSemConversao, Utils.CONTEXTO_MATEMATICO), fatorConversao));
            }
            indiceAnterior = indiceDeCalculo;
        }
        return Collections.unmodifiableList(listaDeIndices);
    }

    public static List<IndiceDeCalculo> revisarConversaoInicial(List<? extends IndiceDeCalculo> tabelaDeIndices, Date dataLiquidacao) {
        Date dataConversao;
        if (tabelaDeIndices == null) {
            return new ArrayList<IndiceDeCalculo>();
        }
        if (tabelaDeIndices.isEmpty() || CalculadorDeIndices.isCompetenciaDiaria(tabelaDeIndices)) {
            return Collections.unmodifiableList(tabelaDeIndices);
        }
        IndiceDeCalculo indiceInicial = tabelaDeIndices.get(0);
        boolean desfazer = false;
        BigDecimal fatorConversao = BigDecimal.ONE;
        if (HelperDate.dateEquals(indiceInicial.getCompetencia(), HelperDate.getCurrentCompetence(dataLiquidacao).getDate()) && ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.containsKey(indiceInicial.getCompetencia()) && HelperDate.dateBefore(dataLiquidacao, dataConversao = ConversaoDeMoedas.encontrarDataDeConversaoParaMudancaDeMoedas(HelperDate.getCurrentCompetence(dataLiquidacao).getDate(), HelperDate.getCurrentCompetence(dataLiquidacao).lastDayOfTheMonth().getDate()))) {
            fatorConversao = ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.get(dataConversao);
            desfazer = true;
        }
        if (desfazer) {
            for (IndiceDeCalculo indiceDeCalculo : tabelaDeIndices) {
                indiceDeCalculo.setValorAcumulado(indiceDeCalculo.getValorAcumulado().multiply(fatorConversao, Utils.CONTEXTO_MATEMATICO));
            }
        }
        return Collections.unmodifiableList(tabelaDeIndices);
    }
}

