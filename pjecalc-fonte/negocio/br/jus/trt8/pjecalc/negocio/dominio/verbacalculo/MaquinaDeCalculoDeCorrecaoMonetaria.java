/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.LogicoFuzzy;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeIndice;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class MaquinaDeCalculoDeCorrecaoMonetaria
implements Serializable {
    private static final long serialVersionUID = 9199995946228033439L;
    private static final BigDecimal INDICE_UM_PORCENTO = new BigDecimal("1.01");
    private static final String MASCARA_DIA = "ddMMyyyy";
    private static final int DIARIA_NAODIARIA = 2;
    private static final int NAODIARIA_DIARIA = 3;
    private static final int NAODIARIA_NAODIARIA = 4;
    private TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria;
    private IndiceMonetarioEnum indice;
    private IndiceMonetarioEnum outroIndice;
    private Date dataAPartirDeOutroIndice;
    private ServicoDeCalculo servicoDeCalculo;
    private HelperDate competencia = HelperDate.getInstance();

    public MaquinaDeCalculoDeCorrecaoMonetaria(TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria) {
        this.tabelaDeCorrecaoMonetaria = tabelaDeCorrecaoMonetaria;
        this.indice = tabelaDeCorrecaoMonetaria.getIndice();
        this.outroIndice = tabelaDeCorrecaoMonetaria.getOutroIndice();
        this.dataAPartirDeOutroIndice = tabelaDeCorrecaoMonetaria.getDataAPartirDeOutroIndice();
        this.servicoDeCalculo = ServicoDeCalculo.getInstancia();
    }

    public BigDecimal encontrarIndiceProporcionalMesMudanca(HelperDate competenciaMesDaMudanca, BigDecimal indiceOutrosIndicesMesMudanca, BigDecimal indiceIndicesMesMudanca, Set<CombinacaoDeIndice> combinacoesAdicionaisNoMesmoMes) {
        BigDecimal indiceProporcional;
        boolean isIndiceSELIC = IndiceMonetarioEnum.SELIC.equals((Object)this.indice);
        boolean isOutroIndiceSELIC = IndiceMonetarioEnum.SELIC.equals((Object)this.outroIndice);
        boolean isIndiceTR = IndiceMonetarioEnum.TR.equals((Object)this.indice);
        boolean isOutroIndiceTR = IndiceMonetarioEnum.TR.equals((Object)this.outroIndice);
        HelperDate primeiroDiaMesMudanca = competenciaMesDaMudanca.clone();
        HelperDate ultimoDiaMesMudanca = competenciaMesDaMudanca.lastDayOfTheMonth();
        long qtdDiasUteis = primeiroDiaMesMudanca.totalWorkDaysWithoutFederalHolidaysFilter(ultimoDiaMesMudanca, LogicoFuzzy.FALSO);
        long qtdDiasTotal = 1L + HelperDate.countDays(primeiroDiaMesMudanca.getDate(), ultimoDiaMesMudanca.getDate());
        if (!combinacoesAdicionaisNoMesmoMes.isEmpty()) {
            long qtdDiasDepoisMudanca = 1L + HelperDate.countDays(this.dataAPartirDeOutroIndice, ultimoDiaMesMudanca.getDate());
            if (isOutroIndiceTR) {
                HelperDate periodoTR = HelperDate.getInstance(this.dataAPartirDeOutroIndice);
                qtdDiasDepoisMudanca = periodoTR.totalWorkDaysWithoutFederalHolidaysFilter(ultimoDiaMesMudanca, LogicoFuzzy.FALSO);
            }
            long qtdDias = isOutroIndiceTR ? qtdDiasUteis : qtdDiasTotal;
            indiceProporcional = BigDecimal.valueOf(Math.pow(Math.pow(indiceOutrosIndicesMesMudanca.doubleValue(), 1.0 / (double)qtdDias), qtdDiasDepoisMudanca));
            HelperDate dataFimAux = HelperDate.getInstance(this.dataAPartirDeOutroIndice).addDay(-1);
            for (CombinacaoDeIndice comb : combinacoesAdicionaisNoMesmoMes) {
                long qtdDiasComb = 1L + HelperDate.countDays(comb.getApartirDeOutroIndice(), dataFimAux.getDate());
                qtdDias = qtdDiasTotal;
                if (IndiceMonetarioEnum.TR.equals((Object)comb.getOutroIndiceTrabalhista())) {
                    qtdDiasComb = HelperDate.getInstance(comb.getApartirDeOutroIndice()).totalWorkDaysWithoutFederalHolidaysFilter(dataFimAux, LogicoFuzzy.FALSO);
                    qtdDias = qtdDiasUteis;
                }
                List<? extends IndiceDeCalculo> indicesComb = this.tabelaDeCorrecaoMonetaria.obterIndicesDeCalculo(comb.getOutroIndiceTrabalhista(), new Periodo(primeiroDiaMesMudanca.getDate(), ultimoDiaMesMudanca.getDate()));
                BigDecimal indiceComb = BigDecimal.ONE;
                if (Utils.naoNulo(indicesComb) && !indicesComb.isEmpty()) {
                    indiceComb = indicesComb.get(0).getValorIndice();
                }
                if (IndiceMonetarioEnum.SELIC.equals((Object)comb.getOutroIndiceTrabalhista()) && HelperDate.dateEquals(competenciaMesDaMudanca.getDate(), this.servicoDeCalculo.obterCalculoAberto().getDataDeLiquidacao())) {
                    indiceComb = INDICE_UM_PORCENTO;
                }
                indiceProporcional = Utils.multiplicar(indiceProporcional, BigDecimal.valueOf(Math.pow(Math.pow(indiceComb.doubleValue(), 1.0 / (double)qtdDias), qtdDiasComb)));
                dataFimAux = HelperDate.getInstance(comb.getApartirDeOutroIndice()).addDay(-1);
            }
            long qtdDiasAntesMudanca = 1L + HelperDate.countDays(primeiroDiaMesMudanca.getDate(), dataFimAux.getDate());
            if (isIndiceTR && !HelperDate.dateEquals(primeiroDiaMesMudanca.getDate(), dataFimAux.getDate())) {
                qtdDiasAntesMudanca = primeiroDiaMesMudanca.totalWorkDaysWithoutFederalHolidaysFilter(dataFimAux, LogicoFuzzy.FALSO);
            }
            qtdDias = isIndiceTR ? qtdDiasUteis : qtdDiasTotal;
            indiceProporcional = Utils.multiplicar(indiceProporcional, BigDecimal.valueOf(Math.pow(Math.pow(indiceIndicesMesMudanca.doubleValue(), 1.0 / (double)qtdDias), qtdDiasAntesMudanca)));
        } else {
            BigDecimal fatorConversaoMesMudanca;
            long qtdDiasAntesMudanca = HelperDate.countDays(primeiroDiaMesMudanca.getDate(), this.dataAPartirDeOutroIndice);
            if (isIndiceTR && !HelperDate.dateEquals(primeiroDiaMesMudanca.getDate(), this.dataAPartirDeOutroIndice)) {
                HelperDate ultimoDiaAntesDaMudanca = HelperDate.getInstance(this.dataAPartirDeOutroIndice).addDay(-1);
                qtdDiasAntesMudanca = primeiroDiaMesMudanca.totalWorkDaysWithoutFederalHolidaysFilter(ultimoDiaAntesDaMudanca, LogicoFuzzy.FALSO);
            }
            long qtdDiasDepoisMudanca = 1L + HelperDate.countDays(this.dataAPartirDeOutroIndice, ultimoDiaMesMudanca.getDate());
            if (isOutroIndiceTR) {
                HelperDate periodoTR = HelperDate.getInstance(this.dataAPartirDeOutroIndice);
                qtdDiasDepoisMudanca = periodoTR.totalWorkDaysWithoutFederalHolidaysFilter(ultimoDiaMesMudanca, LogicoFuzzy.FALSO);
            }
            if (isIndiceSELIC && HelperDate.dateEquals(competenciaMesDaMudanca.getDate(), this.servicoDeCalculo.obterCalculoAberto().getDataDeLiquidacao())) {
                fatorConversaoMesMudanca = Utils.dividir(BigDecimal.ONE, this.tabelaDeCorrecaoMonetaria.tratarConversaoSemCorrecaoMensal(HelperDate.getCurrentCompetence(this.dataAPartirDeOutroIndice), BigDecimal.ONE));
                indiceIndicesMesMudanca = Utils.multiplicar(INDICE_UM_PORCENTO, fatorConversaoMesMudanca);
            }
            if (isOutroIndiceSELIC && HelperDate.dateEquals(competenciaMesDaMudanca.getDate(), HelperDate.getCurrentCompetence(this.servicoDeCalculo.obterCalculoAberto().getDataDeLiquidacao()).getDate())) {
                fatorConversaoMesMudanca = Utils.dividir(BigDecimal.ONE, this.tabelaDeCorrecaoMonetaria.tratarConversaoSemCorrecaoMensal(HelperDate.getCurrentCompetence(this.dataAPartirDeOutroIndice), BigDecimal.ONE));
                indiceOutrosIndicesMesMudanca = Utils.multiplicar(INDICE_UM_PORCENTO, fatorConversaoMesMudanca);
            }
            long qtdDias = isIndiceTR ? qtdDiasUteis : qtdDiasTotal;
            BigDecimal indiceDiarioIndicesMesMudanca = BigDecimal.valueOf(Math.pow(Math.pow(indiceIndicesMesMudanca.doubleValue(), 1.0 / (double)qtdDias), qtdDiasAntesMudanca));
            qtdDias = isOutroIndiceTR ? qtdDiasUteis : qtdDiasTotal;
            BigDecimal indiceDiarioOutrosIndicesMesMudanca = BigDecimal.valueOf(Math.pow(Math.pow(indiceOutrosIndicesMesMudanca.doubleValue(), 1.0 / (double)qtdDias), qtdDiasDepoisMudanca));
            indiceProporcional = Utils.multiplicar(indiceDiarioIndicesMesMudanca, indiceDiarioOutrosIndicesMesMudanca);
        }
        return indiceProporcional;
    }

    public boolean verificarSeExisteIndiceDiarioNas(Set<CombinacaoDeIndice> combinacoesAdicionaisNoMesmoMes) {
        for (CombinacaoDeIndice comb : combinacoesAdicionaisNoMesmoMes) {
            if (!this.tabelaDeCorrecaoMonetaria.isIndiceDiario(comb.getOutroIndiceTrabalhista())) continue;
            return true;
        }
        return false;
    }

    public Map<String, BigDecimal> preencherTabelaDiariaDoMesDasCombinacoes(int tipo, Periodo periodo, HelperDate competenciaMesDaMudanca, BigDecimal indiceOutrosIndicesMesMudanca, BigDecimal indiceIndicesMesMudanca, Set<CombinacaoDeIndice> combinacoesAdicionaisNoMesmoMes, BigDecimal indiceAcumuladoDepoisDoMesDaMudanca) {
        BigDecimal indiceAcumulado;
        HashMap<String, BigDecimal> tabelaDoMes = new HashMap<String, BigDecimal>();
        HelperDate primeiroDiaMesMudanca = competenciaMesDaMudanca.clone();
        HelperDate ultimoDiaMesMudanca = competenciaMesDaMudanca.lastDayOfTheMonth();
        long qtdDias = competenciaMesDaMudanca.daysInMonth();
        if (tipo == 4 || tipo == 2) {
            BigDecimal indiceDiarioMesMudancaOutrosIndices = BigDecimal.valueOf(Math.pow(indiceOutrosIndicesMesMudanca.doubleValue(), 1.0 / (double)qtdDias));
            if (HelperDate.dateBefore(periodo.getFinal(), ultimoDiaMesMudanca.getDate())) {
                ultimoDiaMesMudanca = HelperDate.getInstance(periodo.getFinal());
            }
            indiceAcumulado = indiceAcumuladoDepoisDoMesDaMudanca;
            for (long qtdDiasDepoisMudanca = 1L + HelperDate.countDays(this.dataAPartirDeOutroIndice, ultimoDiaMesMudanca.getDate()); qtdDiasDepoisMudanca > 0L; --qtdDiasDepoisMudanca) {
                indiceAcumulado = Utils.multiplicar(indiceAcumulado, indiceDiarioMesMudancaOutrosIndices);
                tabelaDoMes.put(this.competencia.setDate(ultimoDiaMesMudanca.getDate()).format(MASCARA_DIA), indiceAcumulado);
                ultimoDiaMesMudanca.addDay(-1);
            }
        } else {
            indiceAcumulado = indiceOutrosIndicesMesMudanca;
        }
        HelperDate dataFimAux = HelperDate.getInstance(this.dataAPartirDeOutroIndice).addDay(-1);
        for (CombinacaoDeIndice comb : combinacoesAdicionaisNoMesmoMes) {
            if (HelperDate.dateAfter(comb.getApartirDeOutroIndice(), periodo.getFinal())) continue;
            if (HelperDate.dateAfter(dataFimAux.getDate(), periodo.getFinal())) {
                dataFimAux = HelperDate.getInstance(periodo.getFinal());
            }
            if (this.tabelaDeCorrecaoMonetaria.isIndiceDiario(comb.getOutroIndiceTrabalhista())) {
                indiceAcumulado = this.tratarCasoIndiceDiarioNaCombinao(tabelaDoMes, indiceAcumulado, dataFimAux, comb);
            } else {
                long qtdDiasComb = 1L + HelperDate.countDays(comb.getApartirDeOutroIndice(), dataFimAux.getDate());
                List<? extends IndiceDeCalculo> indicesComb = this.tabelaDeCorrecaoMonetaria.obterIndicesDeCalculo(comb.getOutroIndiceTrabalhista(), new Periodo(primeiroDiaMesMudanca.getDate(), ultimoDiaMesMudanca.getDate()));
                BigDecimal indiceComb = BigDecimal.ONE;
                if (Utils.naoNulo(indicesComb) && !indicesComb.isEmpty()) {
                    indiceComb = indicesComb.get(0).getValorIndice();
                }
                if (IndiceMonetarioEnum.SELIC.equals((Object)comb.getOutroIndiceTrabalhista()) && HelperDate.dateEquals(competenciaMesDaMudanca.getDate(), this.servicoDeCalculo.obterCalculoAberto().getDataDeLiquidacao())) {
                    indiceComb = BigDecimal.ONE;
                }
                BigDecimal indiceDiarioComb = BigDecimal.valueOf(Math.pow(indiceComb.doubleValue(), 1.0 / (double)qtdDias));
                while (qtdDiasComb > 0L) {
                    indiceAcumulado = Utils.multiplicar(indiceAcumulado, indiceDiarioComb);
                    tabelaDoMes.put(this.competencia.setDate(dataFimAux.getDate()).format(MASCARA_DIA), indiceAcumulado);
                    --qtdDiasComb;
                    dataFimAux.addDay(-1);
                }
            }
            dataFimAux = HelperDate.getInstance(comb.getApartirDeOutroIndice()).addDay(-1);
        }
        if (tipo == 4 || tipo == 3) {
            BigDecimal indiceDiarioMesMudancaIndices = BigDecimal.valueOf(Math.pow(indiceIndicesMesMudanca.doubleValue(), 1.0 / (double)qtdDias));
            for (long qtdDiasAntesMudanca = 1L + HelperDate.countDays(primeiroDiaMesMudanca.getDate(), dataFimAux.getDate()); qtdDiasAntesMudanca > 0L; --qtdDiasAntesMudanca) {
                indiceAcumulado = Utils.multiplicar(indiceAcumulado, indiceDiarioMesMudancaIndices);
                tabelaDoMes.put(this.competencia.setDate(dataFimAux.getDate()).format(MASCARA_DIA), indiceAcumulado);
                dataFimAux.addDay(-1);
            }
        }
        return tabelaDoMes;
    }

    private BigDecimal tratarCasoIndiceDiarioNaCombinao(Map<String, BigDecimal> tabelaDoMes, BigDecimal indiceAcumulado, HelperDate dataFimAux, CombinacaoDeIndice comb) {
        List<? extends IndiceDeCalculo> indicesComb = this.tabelaDeCorrecaoMonetaria.obterIndicesDeCalculo(comb.getOutroIndiceTrabalhista(), new Periodo(comb.getApartirDeOutroIndice(), dataFimAux.getDate()));
        for (IndiceDeCalculo indiceDeCalculo : indicesComb) {
            if (!Utils.naoNulo(indiceDeCalculo)) continue;
            BigDecimal valorIndice = indiceDeCalculo.getValorAcumulado().multiply(indiceAcumulado, Utils.CONTEXTO_MATEMATICO);
            tabelaDoMes.put(this.competencia.setDate(indiceDeCalculo.getCompetencia()).format(MASCARA_DIA), valorIndice);
        }
        HelperDate ultimoDiaComIndice = HelperDate.getInstance(comb.getApartirDeOutroIndice());
        while (!HelperDate.dateAfter(ultimoDiaComIndice.getDate(), dataFimAux.getDate())) {
            if (Utils.naoNulo(tabelaDoMes.get(this.competencia.setDate(ultimoDiaComIndice.getDate()).format(MASCARA_DIA)))) {
                indiceAcumulado = tabelaDoMes.get(this.competencia.setDate(ultimoDiaComIndice.getDate()).format(MASCARA_DIA));
                break;
            }
            ultimoDiaComIndice.addDay(1);
        }
        return indiceAcumulado;
    }

    public void ajustarTabelaSelicFazenda(Map<String, BigDecimal> tabela, Periodo periodoDaTabela) {
        BigDecimal valorInicial;
        Date competenciaInicial = HelperDate.getCurrentCompetence(periodoDaTabela.getInicial()).getDate();
        Date competenciaPosteriorAInicial = HelperDate.getCurrentCompetence(periodoDaTabela.getInicial()).addMonth(1).setDay(1).getDate();
        Date competenciaFinal = HelperDate.getCurrentCompetence(periodoDaTabela.getFinal()).getDate();
        BigDecimal taxaMesFinal = Utils.subtrair(tabela.get(this.competencia.setDate(competenciaFinal).format(MASCARA_DIA)), BigDecimal.ONE);
        BigDecimal ajusteFinal = BigDecimal.ZERO;
        if (this.isSelicFazendaSemCombinacaoNoMesDe(competenciaFinal) && Utils.naoNulo(taxaMesFinal)) {
            BigDecimal fator = Utils.dividir(BigDecimal.valueOf(HelperDate.getInstance(periodoDaTabela.getFinal()).getDay()), BigDecimal.valueOf(HelperDate.getInstance(competenciaFinal).lastDayOfTheMonth().getDay()));
            ajusteFinal = Utils.subtrair(taxaMesFinal, Utils.multiplicar(taxaMesFinal, fator));
        }
        BigDecimal conversaoMesInicial = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(competenciaInicial, competenciaFinal);
        BigDecimal conversaoMesPosteriorAInicial = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(competenciaPosteriorAInicial, competenciaFinal);
        BigDecimal taxaMesInicial = Utils.subtrair(Utils.dividir(conversaoMesInicial, tabela.get(this.competencia.setDate(competenciaInicial).format(MASCARA_DIA))), Utils.dividir(conversaoMesPosteriorAInicial, tabela.get(this.competencia.setDate(competenciaPosteriorAInicial).format(MASCARA_DIA))));
        BigDecimal ajusteInicial = BigDecimal.ZERO;
        if (this.isSelicFazendaSemCombinacaoNoMesDe(competenciaInicial) && Utils.naoNulo(taxaMesInicial)) {
            BigDecimal fator = Utils.dividir(BigDecimal.valueOf(HelperDate.getInstance(periodoDaTabela.getInicial()).getDay()), BigDecimal.valueOf(HelperDate.getInstance(competenciaInicial).lastDayOfTheMonth().getDay()));
            ajusteInicial = Utils.multiplicar(taxaMesInicial, fator);
        }
        if (BigDecimal.ZERO.compareTo(ajusteFinal) < 0) {
            SimpleDateFormat formatador = new SimpleDateFormat(MASCARA_DIA);
            for (Map.Entry<String, BigDecimal> entrada : tabela.entrySet()) {
                BigDecimal fatorConversao = BigDecimal.ONE;
                try {
                    fatorConversao = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(formatador.parse(entrada.getKey()), competenciaFinal);
                }
                catch (ParseException pe) {
                    fatorConversao = BigDecimal.ONE;
                }
                tabela.put(entrada.getKey(), Utils.subtrair(entrada.getValue(), Utils.multiplicar(ajusteFinal, fatorConversao)));
            }
        }
        if (BigDecimal.ZERO.compareTo(ajusteInicial) < 0 && Utils.naoNulo(valorInicial = tabela.get(this.competencia.setDate(competenciaInicial).format(MASCARA_DIA)))) {
            tabela.put(this.competencia.setDate(competenciaInicial).format(MASCARA_DIA), Utils.subtrair(valorInicial, Utils.multiplicar(ajusteInicial, conversaoMesInicial)));
        }
    }

    private boolean isSelicFazendaSemCombinacaoNoMesDe(Date dataDoMes) {
        boolean isSelic = false;
        boolean temCombinacaoNoMes = false;
        Date dataInicioDoMes = HelperDate.getCurrentCompetence(dataDoMes).getDate();
        Date dataFimDoMes = HelperDate.getCurrentCompetence(dataDoMes).lastDayOfTheMonth().getDate();
        Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
        ParametrosDeAtualizacao parametros = calculo.getParametrosDeAtualizacao();
        if (IndiceMonetarioEnum.SELIC_FAZENDA.equals((Object)parametros.getIndiceTrabalhista())) {
            isSelic = true;
        }
        if (parametros.getCombinarOutroIndice().booleanValue()) {
            for (CombinacaoDeIndice comb : parametros.getListaDeCombinacaoDeIndices()) {
                if (!HelperDate.dateBefore(comb.getApartirDeOutroIndice(), dataFimDoMes)) continue;
                isSelic = IndiceMonetarioEnum.SELIC_FAZENDA.equals((Object)comb.getOutroIndiceTrabalhista());
                temCombinacaoNoMes = HelperDate.dateAfterOrEquals(comb.getApartirDeOutroIndice(), dataInicioDoMes);
            }
        }
        return isSelic && !temCombinacaoNoMes;
    }
}

