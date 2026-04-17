/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeIndice;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

public class TabelaDeCorrecaoMonetariaUtils {
    private static final int DOIS = 2;

    protected static IndiceMonetarioEnum verificarSeExisteIndiceUnicoNaDemissao(Calculo calculo) {
        IndiceMonetarioEnum indice = calculo.getParametrosDeAtualizacao().getIndiceTrabalhista();
        ParametrosDeAtualizacao parametros = calculo.getParametrosDeAtualizacao();
        if (parametros.getCombinarOutroIndice().booleanValue()) {
            for (CombinacaoDeIndice comb : parametros.getListaDeCombinacaoDeIndices()) {
                if (HelperDate.dateBefore(HelperDate.getCurrentCompetence(comb.getApartirDeOutroIndice()).getDate(), HelperDate.getCurrentCompetence(calculo.getDataDemissao()).getDate())) {
                    indice = comb.getOutroIndiceTrabalhista();
                    continue;
                }
                if (!HelperDate.dateEquals(HelperDate.getCurrentCompetence(comb.getApartirDeOutroIndice()).getDate(), HelperDate.getCurrentCompetence(calculo.getDataDemissao()).getDate())) break;
                indice = null;
                break;
            }
        }
        return indice;
    }

    protected static Set<CombinacaoDeIndice> encontrarCombinacoesAdicionaisNoMesmoMes(CombinacaoDeIndice segundaDoMes, Set<CombinacaoDeIndice> combinacoesDeIndices) {
        TreeSet<CombinacaoDeIndice> combinacoesNoMesmoMes = new TreeSet<CombinacaoDeIndice>();
        Date mesDaCombinacao = HelperDate.getCurrentCompetence(segundaDoMes.getApartirDeOutroIndice()).getDate();
        for (CombinacaoDeIndice comb : combinacoesDeIndices) {
            if (!HelperDate.dateEquals(mesDaCombinacao, HelperDate.getCurrentCompetence(comb.getApartirDeOutroIndice()).getDate()) || !HelperDate.dateBefore(comb.getApartirDeOutroIndice(), segundaDoMes.getApartirDeOutroIndice())) continue;
            combinacoesNoMesmoMes.add(comb);
        }
        return combinacoesNoMesmoMes;
    }

    protected static boolean isAte(int mes, int ano, HelperDate competenciaDaOcorrencia) {
        if (competenciaDaOcorrencia.getYear() > ano) {
            return false;
        }
        if (competenciaDaOcorrencia.getYear() < ano) {
            return true;
        }
        return competenciaDaOcorrencia.getMonth() <= mes;
    }

    protected static BigDecimal encontrarIndiceAcumuladoAposMudanca(List<? extends IndiceDeCalculo> outrosIndices) {
        BigDecimal indiceAcumuladoDepoisDoMesDaMudanca = BigDecimal.ONE;
        for (int sizeAuxiliar = outrosIndices.size(); sizeAuxiliar > 1; --sizeAuxiliar) {
            if (!Utils.naoNulo(outrosIndices.get(sizeAuxiliar - 2))) continue;
            indiceAcumuladoDepoisDoMesDaMudanca = outrosIndices.get(sizeAuxiliar - 2).getValorAcumulado();
            break;
        }
        return indiceAcumuladoDepoisDoMesDaMudanca;
    }

    public static boolean verificarSeExisteIndiceDiarioNaCombinacao(Calculo calculo) {
        TabelaDeCorrecaoMonetaria tabela = new TabelaDeCorrecaoMonetaria();
        IndiceMonetarioEnum indice = calculo.getParametrosDeAtualizacao().getIndiceTrabalhista();
        Boolean existeIndiceDiario = tabela.isIndiceDiario(indice);
        if (existeIndiceDiario.booleanValue()) {
            return Boolean.TRUE;
        }
        ParametrosDeAtualizacao parametros = calculo.getParametrosDeAtualizacao();
        if (parametros.getCombinarOutroIndice().booleanValue()) {
            for (CombinacaoDeIndice comb : parametros.getListaDeCombinacaoDeIndices()) {
                if (!tabela.isIndiceDiario(comb.getOutroIndiceTrabalhista())) continue;
                existeIndiceDiario = Boolean.TRUE;
                break;
            }
        }
        return existeIndiceDiario != null ? existeIndiceDiario : Boolean.FALSE;
    }

    public static BigDecimal tratarConversaoMoedaNaCombinacaoComSelic(BigDecimal fator, IndiceDeCalculo indice, Date dataCombinacao) {
        BigDecimal fatorConversao = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(indice.getCompetencia(), HelperDate.getCurrentCompetence(dataCombinacao).addDay(-1).getDate());
        BigDecimal valorIndice = Utils.dividir(indice.getValorAcumulado(), fatorConversao);
        valorIndice = Utils.subtrair(Utils.somar(valorIndice, fator), BigDecimal.ONE);
        valorIndice = Utils.multiplicar(valorIndice, fatorConversao);
        return valorIndice;
    }
}

