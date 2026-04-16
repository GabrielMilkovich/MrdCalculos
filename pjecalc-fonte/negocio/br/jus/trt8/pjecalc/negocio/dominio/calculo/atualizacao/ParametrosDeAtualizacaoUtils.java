/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeIndice;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ExcecaoDeJurosDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.justificativa.JustificativaParametrosAtualizacaoUtils;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.SortedSet;
import java.util.TreeSet;

public class ParametrosDeAtualizacaoUtils {
    public static void verificarInformacoesDeJuros(ParametrosDeAtualizacao parametrosDeAtualizacao) {
        if (Utils.nulo(parametrosDeAtualizacao.getJurosPadrao())) {
            return;
        }
        List<ExcecaoDeJurosDaAtualizacao> excecoes = ExcecaoDeJurosDaAtualizacao.obterPeriodoDeExcecaoDeJurosDaAtualizacao(parametrosDeAtualizacao);
        if (parametrosDeAtualizacao.getJurosPadrao().booleanValue() && parametrosDeAtualizacao.getEntePublico().booleanValue()) {
            ParametrosDeAtualizacaoUtils.adicionarExcecoesParaDuasTabelas(excecoes, parametrosDeAtualizacao);
            parametrosDeAtualizacao.setCombinarOutroJuros(Boolean.TRUE);
        } else if (parametrosDeAtualizacao.getJurosPadrao().booleanValue()) {
            parametrosDeAtualizacao.setCombinarOutroJuros(ParametrosDeAtualizacaoUtils.adicionarExcecoesParaUnicaTabela(excecoes, JurosEnum.JUROS_PADRAO, parametrosDeAtualizacao));
        } else if (parametrosDeAtualizacao.getEntePublico().booleanValue()) {
            parametrosDeAtualizacao.setCombinarOutroJuros(ParametrosDeAtualizacaoUtils.adicionarExcecoesParaUnicaTabela(excecoes, JurosEnum.FAZENDA_PUBLICA, parametrosDeAtualizacao));
        } else {
            parametrosDeAtualizacao.setJuros(JurosEnum.SEM_JUROS);
        }
        parametrosDeAtualizacao.setOutroJuros(null);
        parametrosDeAtualizacao.setApartirDeOutroJuros(null);
        parametrosDeAtualizacao.setJurosPadrao(null);
        parametrosDeAtualizacao.setEntePublico(null);
        parametrosDeAtualizacao.setApertirDe(null);
    }

    private static void adicionarExcecoesParaDuasTabelas(List<ExcecaoDeJurosDaAtualizacao> excecoes, ParametrosDeAtualizacao parametrosDeAtualizacao) {
        parametrosDeAtualizacao.setJuros(JurosEnum.JUROS_PADRAO);
        Date dataProximo = null;
        for (ExcecaoDeJurosDaAtualizacao excecao : excecoes) {
            if (Utils.naoNulo(dataProximo) && !HelperDate.dateEquals(excecao.getDataInicio(), dataProximo)) {
                JurosEnum proximaTabela = JurosEnum.JUROS_PADRAO;
                if (HelperDate.dateAfterOrEquals(dataProximo, parametrosDeAtualizacao.getApertirDe())) {
                    proximaTabela = JurosEnum.FAZENDA_PUBLICA;
                }
                parametrosDeAtualizacao.setOutroJuros(proximaTabela);
                parametrosDeAtualizacao.setApartirDeOutroJuros(dataProximo);
                ParametrosDeAtualizacaoUtils.adicionarOutroJuros(parametrosDeAtualizacao);
            }
            if (HelperDate.dateEquals(excecao.getDataInicio(), parametrosDeAtualizacao.getCalculo().getDataAjuizamento())) {
                parametrosDeAtualizacao.setJuros(JurosEnum.SEM_JUROS);
            } else if (Utils.nulo(dataProximo) || !HelperDate.dateEquals(excecao.getDataInicio(), dataProximo)) {
                if ((Utils.nulo(dataProximo) || HelperDate.dateBefore(dataProximo, parametrosDeAtualizacao.getApertirDe())) && HelperDate.dateAfter(excecao.getDataInicio(), parametrosDeAtualizacao.getApertirDe())) {
                    parametrosDeAtualizacao.setOutroJuros(JurosEnum.FAZENDA_PUBLICA);
                    parametrosDeAtualizacao.setApartirDeOutroJuros(parametrosDeAtualizacao.getApertirDe());
                    ParametrosDeAtualizacaoUtils.adicionarOutroJuros(parametrosDeAtualizacao);
                }
                parametrosDeAtualizacao.setOutroJuros(JurosEnum.SEM_JUROS);
                parametrosDeAtualizacao.setApartirDeOutroJuros(excecao.getDataInicio());
                ParametrosDeAtualizacaoUtils.adicionarOutroJuros(parametrosDeAtualizacao);
            }
            dataProximo = HelperDate.getInstance(excecao.getDataFim()).addDay(1).getDate();
        }
        Date date = dataProximo = Utils.nulo(dataProximo) ? parametrosDeAtualizacao.getApertirDe() : dataProximo;
        if (HelperDate.dateAfterOrEquals(dataProximo, parametrosDeAtualizacao.getApertirDe())) {
            parametrosDeAtualizacao.setOutroJuros(JurosEnum.FAZENDA_PUBLICA);
            parametrosDeAtualizacao.setApartirDeOutroJuros(dataProximo);
            ParametrosDeAtualizacaoUtils.adicionarOutroJuros(parametrosDeAtualizacao);
        } else {
            parametrosDeAtualizacao.setOutroJuros(JurosEnum.JUROS_PADRAO);
            parametrosDeAtualizacao.setApartirDeOutroJuros(dataProximo);
            ParametrosDeAtualizacaoUtils.adicionarOutroJuros(parametrosDeAtualizacao);
            parametrosDeAtualizacao.setOutroJuros(JurosEnum.FAZENDA_PUBLICA);
            parametrosDeAtualizacao.setApartirDeOutroJuros(parametrosDeAtualizacao.getApertirDe());
            ParametrosDeAtualizacaoUtils.adicionarOutroJuros(parametrosDeAtualizacao);
        }
    }

    private static void adicionarOutroJuros(ParametrosDeAtualizacao parametrosDeAtualizacao) {
        CombinacaoDeJuros juros = new CombinacaoDeJuros();
        juros.setApartirDeOutroJuros(parametrosDeAtualizacao.getApartirDeOutroJuros());
        juros.setOutroJuros(parametrosDeAtualizacao.getOutroJuros());
        juros.setParametrosDeAtualizacao(parametrosDeAtualizacao);
        juros.validar();
        parametrosDeAtualizacao.getListaDeCombinacaoDeJuros().add(juros);
    }

    private static Boolean adicionarExcecoesParaUnicaTabela(List<ExcecaoDeJurosDaAtualizacao> excecoes, JurosEnum tabelaJuros, ParametrosDeAtualizacao parametrosDeAtualizacao) {
        Boolean houveCombinacao = Boolean.FALSE;
        parametrosDeAtualizacao.setJuros(tabelaJuros);
        Date dataProximo = null;
        for (ExcecaoDeJurosDaAtualizacao excecao : excecoes) {
            if (Utils.naoNulo(dataProximo) && !HelperDate.dateEquals(excecao.getDataInicio(), dataProximo)) {
                parametrosDeAtualizacao.setOutroJuros(tabelaJuros);
                parametrosDeAtualizacao.setApartirDeOutroJuros(dataProximo);
                ParametrosDeAtualizacaoUtils.adicionarOutroJuros(parametrosDeAtualizacao);
            }
            if (HelperDate.dateEquals(excecao.getDataInicio(), parametrosDeAtualizacao.getCalculo().getDataAjuizamento())) {
                parametrosDeAtualizacao.setJuros(JurosEnum.SEM_JUROS);
            } else if (Utils.nulo(dataProximo) || !HelperDate.dateEquals(excecao.getDataInicio(), dataProximo)) {
                parametrosDeAtualizacao.setOutroJuros(JurosEnum.SEM_JUROS);
                parametrosDeAtualizacao.setApartirDeOutroJuros(excecao.getDataInicio());
                ParametrosDeAtualizacaoUtils.adicionarOutroJuros(parametrosDeAtualizacao);
            }
            dataProximo = HelperDate.getInstance(excecao.getDataFim()).addDay(1).getDate();
        }
        if (Utils.naoNulo(dataProximo)) {
            parametrosDeAtualizacao.setOutroJuros(tabelaJuros);
            parametrosDeAtualizacao.setApartirDeOutroJuros(dataProximo);
            ParametrosDeAtualizacaoUtils.adicionarOutroJuros(parametrosDeAtualizacao);
            houveCombinacao = Boolean.TRUE;
        }
        return houveCombinacao;
    }

    public static SortedSet<CombinacaoDeIndice> montarAsCombinacoesDeIndices(ParametrosDeAtualizacao parametrosDeAtualizacao, Date fimDoPeriodoDeCorrecao) {
        TreeSet<CombinacaoDeIndice> combinacoesDeIndices = new TreeSet<CombinacaoDeIndice>();
        for (CombinacaoDeIndice c : parametrosDeAtualizacao.getListaDeCombinacaoDeIndices()) {
            if (!HelperDate.dateBeforeOrEquals(c.getApartirDeOutroIndice(), HelperDate.getCurrentCompetence(fimDoPeriodoDeCorrecao).lastDayOfTheMonth().getDate())) continue;
            combinacoesDeIndices.add(c);
        }
        IndiceMonetarioEnum anterior = parametrosDeAtualizacao.getIndiceTrabalhista();
        HashSet<CombinacaoDeIndice> paraRemover = new HashSet<CombinacaoDeIndice>();
        for (CombinacaoDeIndice c : combinacoesDeIndices) {
            if (anterior != null && anterior.equals((Object)c.getOutroIndiceTrabalhista())) {
                paraRemover.add(c);
            }
            anterior = c.getOutroIndiceTrabalhista();
        }
        combinacoesDeIndices.removeAll(paraRemover);
        return combinacoesDeIndices;
    }

    public static String gerarMensagemDeUltimoIndice(ParametrosDeAtualizacao parametrosDeAtualizacao, Date dataLiquidacao) {
        Date dataFimDeCorrecao = dataLiquidacao;
        IndiceMonetarioEnum indice = parametrosDeAtualizacao.getIndiceTrabalhista();
        if (parametrosDeAtualizacao.getCombinarOutroIndice().booleanValue()) {
            for (CombinacaoDeIndice comb : parametrosDeAtualizacao.getListaDeCombinacaoDeIndices()) {
                if (HelperDate.dateBeforeOrEquals(comb.getApartirDeOutroIndice(), dataLiquidacao) && !IndiceMonetarioEnum.SEM_CORRECAO.equals((Object)comb.getOutroIndiceTrabalhista())) {
                    indice = comb.getOutroIndiceTrabalhista();
                    dataFimDeCorrecao = dataLiquidacao;
                }
                if (!HelperDate.dateBeforeOrEquals(comb.getApartirDeOutroIndice(), dataLiquidacao) || !IndiceMonetarioEnum.SEM_CORRECAO.equals((Object)comb.getOutroIndiceTrabalhista())) continue;
                dataFimDeCorrecao = HelperDate.getInstance(comb.getApartirDeOutroIndice()).addDay(-1).getDate();
            }
        }
        return JustificativaParametrosAtualizacaoUtils.prepararTextoUltimoIndiceDisponivelDe(indice, dataFimDeCorrecao);
    }

    public static IndiceMonetarioEnum encontrarIndiceCorrecaoDa(Date data, ParametrosDeAtualizacao parametrosDeAtualizacao) {
        IndiceMonetarioEnum indice = parametrosDeAtualizacao.getIndiceTrabalhista();
        if (parametrosDeAtualizacao.getCombinarOutroIndice().booleanValue()) {
            for (CombinacaoDeIndice comb : parametrosDeAtualizacao.getListaDeCombinacaoDeIndices()) {
                if (!HelperDate.dateBeforeOrEquals(comb.getApartirDeOutroIndice(), data)) break;
                indice = comb.getOutroIndiceTrabalhista();
            }
        }
        return indice;
    }
}

