/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.LogicoFuzzy;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.GrupoEsferaPrecatorioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.IndicePrecatorioTabelasUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ServicoAtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipcae.IndiceIPCAE;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tr.IndiceTR;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;

public class IndicePrecatorio {
    private static final Date DATA_FIM_TR_FEDERAL = HelperDate.getInstance(2013, 11, 31).getDate();
    private static final Date DATA_FIM_TR_NAO_FEDERAL = HelperDate.getInstance(2015, 2, 25).getDate();
    private static final int PEGAR_MES_AGOSTO = 2;

    public static BigDecimal encontrarIndiceCorrecaoPrecatorio(Date dataUltimaAtualizacao, Date dataExpedicao, Date dataFinal, boolean isFederal) {
        Date dataMudanca;
        BigDecimal indiceDeCorrecao = BigDecimal.ONE;
        Date dataFimTR = isFederal ? DATA_FIM_TR_FEDERAL : DATA_FIM_TR_NAO_FEDERAL;
        Date date = dataMudanca = HelperDate.dateAfter(dataExpedicao, dataFimTR) ? dataExpedicao : HelperDate.getInstance(dataFimTR).addDay(1).getDate();
        if (HelperDate.dateAfterOrEquals(dataUltimaAtualizacao, dataMudanca)) {
            List<IndiceIPCAE> indicesIPCAE = IndiceIPCAE.obterTabela(new Periodo(HelperDate.getInstance(dataUltimaAtualizacao).lastDayOfTheMonth().addDay(1).getDate(), dataFinal));
            return !indicesIPCAE.isEmpty() ? indicesIPCAE.get(indicesIPCAE.size() - 1).getValorAcumulado() : BigDecimal.ONE;
        }
        if (HelperDate.dateAfter(dataMudanca, dataFinal)) {
            List<IndiceTR> indicesTR = IndiceTR.obterTabela(new Periodo(HelperDate.getInstance(dataUltimaAtualizacao).lastDayOfTheMonth().addDay(1).getDate(), dataFinal));
            return !indicesTR.isEmpty() ? indicesTR.get(indicesTR.size() - 1).getValorAcumulado() : BigDecimal.ONE;
        }
        if (HelperDate.getInstance(dataMudanca).getDay() > 1) {
            List<IndiceTR> indicesTR = IndiceTR.obterTabela(new Periodo(HelperDate.getInstance(dataUltimaAtualizacao).lastDayOfTheMonth().addDay(1).getDate(), HelperDate.getInstance(dataMudanca).lastDayOfTheMonth().getDate()));
            List<IndiceIPCAE> indicesIPCAE = IndiceIPCAE.obterTabela(new Periodo(HelperDate.getCurrentCompetence(dataMudanca).getDate(), dataFinal));
            BigDecimal indiceTRMesMudanca = !indicesTR.isEmpty() ? indicesTR.get(0).getValorAcumulado() : BigDecimal.ONE;
            BigDecimal indicesAcumuladosSemMesMudancaIPCAE = indicesIPCAE.size() > 1 ? indicesIPCAE.get(indicesIPCAE.size() - 2).getValorAcumulado() : BigDecimal.ONE;
            BigDecimal indiceIPCAEMEsMudanca = !indicesIPCAE.isEmpty() ? Utils.dividir(indicesIPCAE.get(indicesIPCAE.size() - 1).getValorAcumulado(), indicesAcumuladosSemMesMudancaIPCAE) : BigDecimal.ONE;
            BigDecimal indicesAcumuladosSemMesMudancaTR = !indicesTR.isEmpty() ? Utils.dividir(indicesTR.get(indicesTR.size() - 1).getValorAcumulado(), indiceTRMesMudanca) : BigDecimal.ONE;
            HelperDate primeiroDiaMesMudanca = HelperDate.getCurrentCompetence(dataMudanca);
            HelperDate ultimoDiaMesMudanca = HelperDate.getInstance(dataMudanca).lastDayOfTheMonth();
            long qtdDiasUteis = primeiroDiaMesMudanca.totalWorkDaysWithoutFederalHolidaysFilter(ultimoDiaMesMudanca, LogicoFuzzy.FALSO);
            long qtdDiasTotal = 1L + HelperDate.countDays(primeiroDiaMesMudanca.getDate(), ultimoDiaMesMudanca.getDate());
            HelperDate ultimoDiaAntesDaMudanca = HelperDate.getInstance(dataMudanca).addDay(-1);
            long qtdDiasUteisAntesMudanca = primeiroDiaMesMudanca.totalWorkDaysWithoutFederalHolidaysFilter(ultimoDiaAntesDaMudanca, LogicoFuzzy.FALSO);
            long qtdDiasDepoisMudanca = 1L + HelperDate.countDays(dataMudanca, ultimoDiaMesMudanca.getDate());
            BigDecimal indiceDiarioMesMudancaTR = BigDecimal.valueOf(Math.pow(Math.pow(indiceTRMesMudanca.doubleValue(), 1.0 / (double)qtdDiasUteis), qtdDiasUteisAntesMudanca));
            BigDecimal indiceDiarioMesMudancaIPCAE = BigDecimal.valueOf(Math.pow(Math.pow(indiceIPCAEMEsMudanca.doubleValue(), 1.0 / (double)qtdDiasTotal), qtdDiasDepoisMudanca));
            BigDecimal indiceProporcional = Utils.multiplicar(indiceDiarioMesMudancaTR, indiceDiarioMesMudancaIPCAE);
            indiceDeCorrecao = Utils.multiplicar(indicesAcumuladosSemMesMudancaTR, indicesAcumuladosSemMesMudancaIPCAE);
            indiceDeCorrecao = Utils.multiplicar(indiceDeCorrecao, indiceProporcional);
        } else {
            List<IndiceTR> indicesTR = IndiceTR.obterTabela(new Periodo(HelperDate.getInstance(dataUltimaAtualizacao).lastDayOfTheMonth().addDay(1).getDate(), HelperDate.getInstance(dataMudanca).addDay(-1).getDate()));
            List<IndiceIPCAE> indicesIPCAE = IndiceIPCAE.obterTabela(new Periodo(dataMudanca, dataFinal));
            BigDecimal valorIndiceTR = !indicesTR.isEmpty() ? indicesTR.get(indicesTR.size() - 1).getValorAcumulado() : BigDecimal.ONE;
            BigDecimal valorIndiceIPCAE = !indicesIPCAE.isEmpty() ? indicesIPCAE.get(indicesIPCAE.size() - 1).getValorAcumulado() : BigDecimal.ONE;
            indiceDeCorrecao = Utils.multiplicar(valorIndiceTR, valorIndiceIPCAE);
        }
        return indiceDeCorrecao;
    }

    public static List<Map<String, Periodo>> montarCombinacaoDeIndicesDeCorrecaoPrecatorioSIP(Periodo periodoAtualizacao, Periodo periodoDaGraca, Date dataInicioEC1362025, GrupoEsferaPrecatorioEnum esfera) {
        String ipcaeLabel = "IPCA-E";
        ArrayList<Map<String, Periodo>> todosOsIndices = new ArrayList<Map<String, Periodo>>();
        todosOsIndices.add(Collections.singletonMap("ORTN", new Periodo(HelperDate.getInstance("01/10/1900"), HelperDate.getInstance("28/02/1986"))));
        todosOsIndices.add(Collections.singletonMap("OTN", new Periodo(HelperDate.getInstance("01/03/1986"), HelperDate.getInstance("31/12/1988"))));
        todosOsIndices.add(Collections.singletonMap("IPC", new Periodo(HelperDate.getInstance("01/01/1989"), HelperDate.getInstance("28/02/1989"))));
        todosOsIndices.add(Collections.singletonMap("BTN", new Periodo(HelperDate.getInstance("01/03/1989"), HelperDate.getInstance("28/02/1990"))));
        todosOsIndices.add(Collections.singletonMap("IPC", new Periodo(HelperDate.getInstance("01/03/1990"), HelperDate.getInstance("28/02/1991"))));
        if (esfera == GrupoEsferaPrecatorioEnum.FEDERAL) {
            todosOsIndices.add(Collections.singletonMap("INPC", new Periodo(HelperDate.getInstance("01/03/1991"), HelperDate.getInstance("30/11/1991"))));
            todosOsIndices.add(Collections.singletonMap(ipcaeLabel, new Periodo(HelperDate.getInstance("01/12/1991"), HelperDate.getInstance("31/12/1991"))));
            todosOsIndices.add(Collections.singletonMap("UFIR", new Periodo(HelperDate.getInstance("01/01/1992"), HelperDate.getInstance("31/12/2000"))));
            todosOsIndices.add(Collections.singletonMap(ipcaeLabel, new Periodo(HelperDate.getInstance("01/01/2001"), HelperDate.getInstance("09/12/2009"))));
            todosOsIndices.add(Collections.singletonMap("TR", new Periodo(HelperDate.getInstance("10/12/2009"), HelperDate.getInstance("31/12/2013"))));
            todosOsIndices.add(Collections.singletonMap(ipcaeLabel, new Periodo(HelperDate.getInstance("01/01/2014"), HelperDate.getInstance("30/11/2021"))));
        } else {
            todosOsIndices.add(Collections.singletonMap("TR", new Periodo(HelperDate.getInstance("01/03/1991"), HelperDate.getInstance("30/06/2009"))));
            todosOsIndices.add(Collections.singletonMap(ipcaeLabel, new Periodo(HelperDate.getInstance("01/07/2009"), HelperDate.getInstance("09/12/2009"))));
            todosOsIndices.add(Collections.singletonMap("TR", new Periodo(HelperDate.getInstance("10/12/2009"), HelperDate.getInstance("25/03/2015"))));
            todosOsIndices.add(Collections.singletonMap(ipcaeLabel, new Periodo(HelperDate.getInstance("26/03/2015"), HelperDate.getInstance("30/11/2021"))));
        }
        todosOsIndices.add(Collections.singletonMap("SELIC Simples", new Periodo(HelperDate.getInstance("01/12/2021"), HelperDate.getInstance("31/12/2999"))));
        Date inicio = periodoAtualizacao.getInicial();
        Date fim = periodoAtualizacao.getFinal();
        Periodo periodoDaGracaRelativo = ServicoAtualizacaoUtils.montarPeriodoDaGracaRelativo(periodoAtualizacao, periodoDaGraca);
        ArrayList<Map> todosOsIndicesComEC1362025 = new ArrayList<Map>();
        Map<String, Periodo> periodoEC1362025 = Collections.singletonMap("Tabela EC 136/2025", new Periodo(HelperDate.getInstance(dataInicioEC1362025), HelperDate.getInstance("31/12/2999")));
        for (Map map : todosOsIndices) {
            Periodo indicePeriodo = (Periodo)map.values().iterator().next();
            if (indicePeriodo.isPeriodoContemEsta(dataInicioEC1362025)) {
                if (HelperDate.dateEquals(dataInicioEC1362025, indicePeriodo.getInicial())) {
                    todosOsIndicesComEC1362025.add(periodoEC1362025);
                    break;
                }
                indicePeriodo.setFinal(HelperDate.getInstance(dataInicioEC1362025).addDay(-1).getDate());
                todosOsIndicesComEC1362025.add(map);
                todosOsIndicesComEC1362025.add(periodoEC1362025);
                break;
            }
            todosOsIndicesComEC1362025.add(map);
        }
        ArrayList<Map<String, Periodo>> indicesCombinados = new ArrayList<Map<String, Periodo>>();
        todosOsIndicesComEC1362025.forEach(mapInd -> {
            String indiceNome = (String)mapInd.keySet().iterator().next();
            Periodo indicePeriodo = (Periodo)mapInd.values().iterator().next();
            if (HelperDate.getInstance(inicio).between(indicePeriodo.getInicial(), indicePeriodo.getFinal()) && HelperDate.getInstance(fim).between(indicePeriodo.getInicial(), indicePeriodo.getFinal())) {
                Map<String, Periodo> paraIncluir = Collections.singletonMap(indiceNome, new Periodo(inicio, fim));
                IndicePrecatorio.adicionarPeriodoIndiceConsiderandoPeriodoDaGraca(indicesCombinados, paraIncluir, periodoDaGracaRelativo);
            } else if (HelperDate.getInstance(inicio).between(indicePeriodo.getInicial(), indicePeriodo.getFinal())) {
                Map<String, Periodo> paraIncluir = Collections.singletonMap(indiceNome, new Periodo(inicio, indicePeriodo.getFinal()));
                IndicePrecatorio.adicionarPeriodoIndiceConsiderandoPeriodoDaGraca(indicesCombinados, paraIncluir, periodoDaGracaRelativo);
            } else if (HelperDate.getInstance(fim).between(indicePeriodo.getInicial(), indicePeriodo.getFinal())) {
                Map<String, Periodo> paraIncluir = Collections.singletonMap(indiceNome, new Periodo(indicePeriodo.getInicial(), fim));
                IndicePrecatorio.adicionarPeriodoIndiceConsiderandoPeriodoDaGraca(indicesCombinados, paraIncluir, periodoDaGracaRelativo);
            } else if (HelperDate.dateBefore(inicio, indicePeriodo.getInicial()) && HelperDate.dateAfter(fim, indicePeriodo.getFinal())) {
                Map<String, Periodo> paraIncluir = Collections.singletonMap(indiceNome, indicePeriodo);
                IndicePrecatorio.adicionarPeriodoIndiceConsiderandoPeriodoDaGraca(indicesCombinados, paraIncluir, periodoDaGracaRelativo);
            }
        });
        if (HelperDate.dateBeforeOrEquals(periodoDaGracaRelativo.getInicial(), fim)) {
            if (HelperDate.dateAfter(dataInicioEC1362025, periodoDaGracaRelativo.getInicial()) && HelperDate.dateBeforeOrEquals(dataInicioEC1362025, periodoDaGracaRelativo.getFinal())) {
                Periodo periodo = new Periodo(periodoDaGracaRelativo.getInicial(), HelperDate.getInstance(dataInicioEC1362025).addDay(-1).getDate());
                Periodo periodoDepois = new Periodo(dataInicioEC1362025, periodoDaGracaRelativo.getFinal());
                indicesCombinados.add(Collections.singletonMap("IPCA-E (Per\u00edodo da Gra\u00e7a)", periodo));
                indicesCombinados.add(Collections.singletonMap("Tabela EC 136/2025 (Per\u00edodo da Gra\u00e7a)", periodoDepois));
            } else if (HelperDate.dateAfter(dataInicioEC1362025, periodoDaGracaRelativo.getFinal())) {
                indicesCombinados.add(Collections.singletonMap("IPCA-E (Per\u00edodo da Gra\u00e7a)", periodoDaGracaRelativo));
            } else {
                indicesCombinados.add(Collections.singletonMap("Tabela EC 136/2025 (Per\u00edodo da Gra\u00e7a)", periodoDaGracaRelativo));
            }
        }
        IndicePrecatorio.ordenarIndicesCombinados(indicesCombinados);
        return indicesCombinados;
    }

    private static void ordenarIndicesCombinados(List<Map<String, Periodo>> indicesCombinados) {
        Collections.sort(indicesCombinados, (o1, o2) -> {
            Date o1DtInicial = ((Periodo)o1.values().iterator().next()).getInicial();
            Date o2DtInicial = ((Periodo)o2.values().iterator().next()).getInicial();
            return o1DtInicial.compareTo(o2DtInicial);
        });
    }

    private static void adicionarPeriodoIndiceConsiderandoPeriodoDaGraca(List<Map<String, Periodo>> indices, Map<String, Periodo> paraIncluir, Periodo periodoDaGraca) {
        boolean periodoDaGracaAbrandeTodoOPeriodoDoIndice;
        String nome = paraIncluir.keySet().iterator().next();
        Periodo periodo = paraIncluir.values().iterator().next();
        boolean inicioPGForaDoPeriodo = false;
        boolean finalPGForaDoPeriodo = false;
        if (HelperDate.getInstance(periodoDaGraca.getInicial()).between(periodo.getInicial(), periodo.getFinal())) {
            if (HelperDate.dateAfter(periodoDaGraca.getInicial(), periodo.getInicial())) {
                indices.add(Collections.singletonMap(nome, new Periodo(periodo.getInicial(), HelperDate.getInstance(periodoDaGraca.getInicial()).addDay(-1).getDate())));
            }
        } else {
            inicioPGForaDoPeriodo = true;
        }
        if (HelperDate.getInstance(periodoDaGraca.getFinal()).between(periodo.getInicial(), periodo.getFinal())) {
            if (HelperDate.dateBefore(periodoDaGraca.getFinal(), periodo.getFinal())) {
                indices.add(Collections.singletonMap(nome, new Periodo(HelperDate.getInstance(periodoDaGraca.getFinal()).addDay(1).getDate(), periodo.getFinal())));
            }
        } else {
            finalPGForaDoPeriodo = true;
        }
        boolean bl = periodoDaGracaAbrandeTodoOPeriodoDoIndice = HelperDate.dateBeforeOrEquals(periodoDaGraca.getInicial(), periodo.getInicial()) && HelperDate.dateAfterOrEquals(periodoDaGraca.getFinal(), periodo.getFinal());
        if (inicioPGForaDoPeriodo && finalPGForaDoPeriodo && !periodoDaGracaAbrandeTodoOPeriodoDoIndice) {
            indices.add(paraIncluir);
        }
    }

    public static BigDecimal encontrarIndiceCorrecaoPrecatorioSIP(Periodo periodoAtualizacao, Periodo periodoDaGraca, Date dataInicioAplicarEC1362025, GrupoEsferaPrecatorioEnum esfera, boolean paraCorrecaoDeJuros) {
        BigDecimal indiceAntesAplicarEC1362025 = BigDecimal.ONE;
        BigDecimal indiceAPartirDaAplicarEC1362025 = BigDecimal.ONE;
        if (periodoAtualizacao.isPeriodoContemEsta(dataInicioAplicarEC1362025)) {
            if (!HelperDate.dateEquals(periodoAtualizacao.getInicial(), dataInicioAplicarEC1362025)) {
                Date diaAnteriorAoInicioAplicarEC1362025 = HelperDate.getInstance(dataInicioAplicarEC1362025).addDay(-1).getDate();
                Periodo periodoAtualizacaoRelativoAntesEC1362025 = new Periodo(periodoAtualizacao.getInicial(), diaAnteriorAoInicioAplicarEC1362025);
                indiceAntesAplicarEC1362025 = IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIPAntesDaEC1362025(periodoAtualizacaoRelativoAntesEC1362025, periodoDaGraca, esfera);
            }
            Periodo periodoAtualizacaoRelativoAPartirDaEC1362025 = new Periodo(dataInicioAplicarEC1362025, periodoAtualizacao.getFinal());
            indiceAPartirDaAplicarEC1362025 = IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIPAPartirDaEC1362025(periodoAtualizacaoRelativoAPartirDaEC1362025, periodoDaGraca, paraCorrecaoDeJuros);
        } else {
            if (periodoAtualizacao.isDataMaiorQueFinal(dataInicioAplicarEC1362025)) {
                indiceAntesAplicarEC1362025 = IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIPAntesDaEC1362025(periodoAtualizacao, periodoDaGraca, esfera);
            }
            if (periodoAtualizacao.isDataMenorQueIncial(dataInicioAplicarEC1362025)) {
                indiceAPartirDaAplicarEC1362025 = IndicePrecatorio.encontrarIndiceCorrecaoPrecatorioSIPAPartirDaEC1362025(periodoAtualizacao, periodoDaGraca, paraCorrecaoDeJuros);
            }
        }
        return Utils.multiplicar(indiceAntesAplicarEC1362025, indiceAPartirDaAplicarEC1362025);
    }

    private static BigDecimal encontrarIndiceCorrecaoPrecatorioSIPAntesDaEC1362025(Periodo periodoAtualizacao, Periodo periodoDaGraca, GrupoEsferaPrecatorioEnum esfera) {
        boolean somentePeriodoDaGraca;
        Periodo periodoDaGracaRelativo = ServicoAtualizacaoUtils.montarPeriodoDaGracaRelativo(periodoAtualizacao, periodoDaGraca);
        boolean inicioPeriodoDaGracaDentroPeriodoAtualizacao = HelperDate.getInstance(periodoDaGracaRelativo.getInicial()).between(periodoAtualizacao.getInicial(), periodoAtualizacao.getFinal());
        boolean finalPeriodoDaGracaDentroPeriodoAtualizacao = HelperDate.getInstance(periodoDaGracaRelativo.getFinal()).between(periodoAtualizacao.getInicial(), periodoAtualizacao.getFinal());
        boolean semPeriodoDaGraca = HelperDate.dateAfter(periodoDaGracaRelativo.getInicial(), periodoAtualizacao.getFinal()) || HelperDate.dateBefore(periodoDaGracaRelativo.getFinal(), periodoAtualizacao.getInicial());
        boolean bl = somentePeriodoDaGraca = HelperDate.dateBeforeOrEquals(periodoDaGracaRelativo.getInicial(), periodoAtualizacao.getInicial()) && HelperDate.dateAfterOrEquals(periodoDaGracaRelativo.getFinal(), periodoAtualizacao.getFinal());
        if (somentePeriodoDaGraca) {
            return IndicePrecatorioTabelasUtils.calcularIndicePeriodoDaGraca(periodoDaGracaRelativo.getInicial(), periodoDaGracaRelativo.getFinal(), esfera);
        }
        if (semPeriodoDaGraca) {
            return IndicePrecatorioTabelasUtils.obterIndiceDaTabela(periodoAtualizacao.getInicial(), periodoAtualizacao.getFinal(), esfera);
        }
        BigDecimal indicePeriodoAntes = BigDecimal.ONE;
        BigDecimal indicePeriodoDepois = BigDecimal.ONE;
        BigDecimal indicePeriodoDaGraca = BigDecimal.ONE;
        boolean temPeriodoSelicNaCombinacaoAntes = false;
        if (inicioPeriodoDaGracaDentroPeriodoAtualizacao) {
            Periodo periodoAntes = new Periodo(periodoAtualizacao.getInicial(), HelperDate.getInstance(periodoDaGracaRelativo.getInicial()).addDay(-1).getDate());
            indicePeriodoAntes = IndicePrecatorioTabelasUtils.obterIndiceDaTabela(periodoAntes.getInicial(), periodoAntes.getFinal(), esfera);
            if (HelperDate.dateAfterOrEquals(periodoAntes.getFinal(), IndicePrecatorioTabelasUtils.DATA_INICIO_COMBINACAO_SELIC)) {
                temPeriodoSelicNaCombinacaoAntes = true;
            }
        }
        if (finalPeriodoDaGracaDentroPeriodoAtualizacao && HelperDate.dateBefore(periodoDaGracaRelativo.getFinal(), periodoAtualizacao.getFinal())) {
            Periodo periodoDepois = new Periodo(HelperDate.getInstance(periodoDaGracaRelativo.getFinal()).addDay(1).getDate(), periodoAtualizacao.getFinal());
            indicePeriodoDepois = IndicePrecatorioTabelasUtils.obterIndiceDaTabela(periodoDepois.getInicial(), periodoDepois.getFinal(), esfera);
        }
        indicePeriodoDaGraca = IndicePrecatorioTabelasUtils.calcularIndicePeriodoDaGraca(periodoDaGracaRelativo.getInicial(), periodoDaGracaRelativo.getFinal(), esfera);
        if (temPeriodoSelicNaCombinacaoAntes) {
            return Utils.multiplicar(indicePeriodoDepois, Utils.somar(Utils.subtrair(indicePeriodoAntes, BigDecimal.ONE), indicePeriodoDaGraca));
        }
        return Utils.multiplicar(Utils.multiplicar(indicePeriodoAntes, indicePeriodoDepois), indicePeriodoDaGraca);
    }

    private static BigDecimal encontrarIndiceCorrecaoPrecatorioSIPAPartirDaEC1362025(Periodo periodoAtualizacao, Periodo periodoDaGraca, boolean paraCorrecaoDeJuros) {
        boolean somentePeriodoDaGraca;
        Periodo periodoDaGracaRelativo = ServicoAtualizacaoUtils.montarPeriodoDaGracaRelativo(periodoAtualizacao, periodoDaGraca);
        boolean inicioPeriodoDaGracaDentroPeriodoAtualizacao = HelperDate.getInstance(periodoDaGracaRelativo.getInicial()).between(periodoAtualizacao.getInicial(), periodoAtualizacao.getFinal());
        boolean finalPeriodoDaGracaDentroPeriodoAtualizacao = HelperDate.getInstance(periodoDaGracaRelativo.getFinal()).between(periodoAtualizacao.getInicial(), periodoAtualizacao.getFinal());
        boolean semPeriodoDaGraca = HelperDate.dateAfter(periodoDaGracaRelativo.getInicial(), periodoAtualizacao.getFinal()) || HelperDate.dateBefore(periodoDaGracaRelativo.getFinal(), periodoAtualizacao.getInicial());
        boolean bl = somentePeriodoDaGraca = HelperDate.dateBeforeOrEquals(periodoDaGracaRelativo.getInicial(), periodoAtualizacao.getInicial()) && HelperDate.dateAfterOrEquals(periodoDaGracaRelativo.getFinal(), periodoAtualizacao.getFinal());
        if (somentePeriodoDaGraca) {
            return IndicePrecatorioTabelasUtils.calcularIndicePeriodoDaGracaEC1362025(periodoDaGracaRelativo.getInicial(), periodoDaGracaRelativo.getFinal(), paraCorrecaoDeJuros);
        }
        if (semPeriodoDaGraca) {
            return IndicePrecatorioTabelasUtils.obterIndiceDaTabelaEC1362025(periodoAtualizacao.getInicial(), periodoAtualizacao.getFinal(), paraCorrecaoDeJuros);
        }
        BigDecimal indicePeriodoAntes = BigDecimal.ONE;
        BigDecimal indicePeriodoDepois = BigDecimal.ONE;
        BigDecimal indicePeriodoDaGraca = BigDecimal.ONE;
        if (inicioPeriodoDaGracaDentroPeriodoAtualizacao && !HelperDate.dateEquals(periodoAtualizacao.getInicial(), periodoDaGracaRelativo.getInicial())) {
            Periodo periodoAntes = new Periodo(periodoAtualizacao.getInicial(), HelperDate.getInstance(periodoDaGracaRelativo.getInicial()).addDay(-1).getDate());
            indicePeriodoAntes = IndicePrecatorioTabelasUtils.obterIndiceDaTabelaEC1362025(periodoAntes.getInicial(), periodoAntes.getFinal(), paraCorrecaoDeJuros);
        }
        if (finalPeriodoDaGracaDentroPeriodoAtualizacao && HelperDate.dateBefore(periodoDaGracaRelativo.getFinal(), periodoAtualizacao.getFinal())) {
            Periodo periodoDepois = new Periodo(HelperDate.getInstance(periodoDaGracaRelativo.getFinal()).addDay(1).getDate(), periodoAtualizacao.getFinal());
            indicePeriodoDepois = IndicePrecatorioTabelasUtils.obterIndiceDaTabelaEC1362025(periodoDepois.getInicial(), periodoDepois.getFinal(), paraCorrecaoDeJuros);
        }
        indicePeriodoDaGraca = IndicePrecatorioTabelasUtils.calcularIndicePeriodoDaGracaEC1362025(periodoDaGracaRelativo.getInicial(), periodoDaGracaRelativo.getFinal(), paraCorrecaoDeJuros);
        return Utils.multiplicar(Utils.multiplicar(indicePeriodoAntes, indicePeriodoDepois), indicePeriodoDaGraca);
    }
}

