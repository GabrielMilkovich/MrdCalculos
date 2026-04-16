/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.constantes.JurosDoAjuizamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoPrecatorioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.TabelaDeJurosDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Atualizacao;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

public class ServicoAtualizacaoUtils {
    private static final int PERIODO_DA_GRACA = 2;
    private static final int DIA_31 = 31;
    private static final int DIA_3 = 3;
    private static final int ANO_2021 = 2021;
    private static final int ANO_2025 = 2025;
    private static final int DIA_2 = 2;

    public static BigDecimal encontrarTaxaDeJurosPrecatorio(Date dataUltimaAtualizacao, Date dataExpedicao, Date dataFinal) {
        Date dataInicialAposPeriodoDaGraca = HelperDate.getInstance(HelperDate.getInstance(dataExpedicao).getYear() + 2, 0, 1).getDate();
        Calculo calculo = new Calculo();
        calculo.getParametrosDeAtualizacao().setAplicarJurosFasePreJudicial(Boolean.FALSE);
        calculo.getParametrosDeAtualizacao().setJuros(JurosEnum.JUROS_UM_PORCENTO);
        calculo.getParametrosDeAtualizacao().setCombinarOutroJuros(Boolean.TRUE);
        calculo.setDataDeLiquidacao(dataUltimaAtualizacao);
        calculo.getParametrosDeAtualizacao().getListaDeCombinacaoDeJuros().clear();
        CombinacaoDeJuros primeiraCombinacao = new CombinacaoDeJuros();
        primeiraCombinacao.setParametrosDeAtualizacao(calculo.getParametrosDeAtualizacao());
        primeiraCombinacao.setOutroJuros(JurosEnum.SEM_JUROS);
        primeiraCombinacao.setApartirDeOutroJuros(dataExpedicao);
        calculo.getParametrosDeAtualizacao().getListaDeCombinacaoDeJuros().add(primeiraCombinacao);
        CombinacaoDeJuros segundaCombinacao = new CombinacaoDeJuros();
        segundaCombinacao.setParametrosDeAtualizacao(calculo.getParametrosDeAtualizacao());
        segundaCombinacao.setOutroJuros(JurosEnum.JUROS_POUPANCA);
        segundaCombinacao.setApartirDeOutroJuros(dataInicialAposPeriodoDaGraca);
        calculo.getParametrosDeAtualizacao().getListaDeCombinacaoDeJuros().add(segundaCombinacao);
        Date dataInicial = HelperDate.getInstance(dataUltimaAtualizacao).addDay(1).getDate();
        TabelaDeJurosDoCalculo tabelaDeJuros = new TabelaDeJurosDoCalculo(calculo, dataInicial, dataFinal);
        return tabelaDeJuros.calcularTaxaDeJurosPagamento(dataInicial, dataFinal, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, false);
    }

    public static BigDecimal encontrarTaxaDeJurosPrecatorioSIP(Date dataInicio, Date dataFinal, Date dataInicioAplicarEC1362025, Periodo periodoDaGraca) {
        CombinacaoDeJuros combinacao;
        Periodo periodoDaGracaRelativo = ServicoAtualizacaoUtils.montarPeriodoDaGracaRelativo(new Periodo(dataInicio, dataFinal), periodoDaGraca);
        Date agosto2001 = HelperDate.getInstance(2001, 7, 24).getDate();
        Date dezembro2021 = HelperDate.getInstance(2021, 11, 1).getDate();
        Date diaSeguinteAoFimDoPeriodoDaGraca = HelperDate.getInstance(periodoDaGracaRelativo.getFinal()).addDay(1).getDate();
        Calculo calculo = new Calculo();
        calculo.getParametrosDeAtualizacao().setAplicarJurosFasePreJudicial(Boolean.FALSE);
        calculo.getParametrosDeAtualizacao().setJuros(JurosEnum.JUROS_UM_PORCENTO);
        calculo.getParametrosDeAtualizacao().setCombinarOutroJuros(Boolean.TRUE);
        calculo.setDataDeLiquidacao(dataInicio);
        calculo.getParametrosDeAtualizacao().getListaDeCombinacaoDeJuros().clear();
        Set<CombinacaoDeJuros> combinacoes = new TreeSet<CombinacaoDeJuros>();
        CombinacaoDeJuros combinacaoEC1362025 = new CombinacaoDeJuros();
        combinacaoEC1362025.setParametrosDeAtualizacao(calculo.getParametrosDeAtualizacao());
        combinacaoEC1362025.setOutroJuros(JurosEnum.JUROS_PRECATORIO_EC_136_2025);
        combinacaoEC1362025.setApartirDeOutroJuros(dataInicioAplicarEC1362025);
        combinacoes.add(combinacaoEC1362025);
        if (HelperDate.dateBefore(dataInicio, agosto2001)) {
            if (HelperDate.dateBefore(dataInicio, periodoDaGracaRelativo.getInicial())) {
                combinacao = new CombinacaoDeJuros();
                combinacao.setParametrosDeAtualizacao(calculo.getParametrosDeAtualizacao());
                combinacao.setOutroJuros(JurosEnum.JUROS_PADRAO);
                combinacao.setApartirDeOutroJuros(dataInicio);
                combinacoes.add(combinacao);
            }
            if (HelperDate.dateBefore(periodoDaGracaRelativo.getFinal(), agosto2001)) {
                combinacao = new CombinacaoDeJuros();
                combinacao.setParametrosDeAtualizacao(calculo.getParametrosDeAtualizacao());
                combinacao.setOutroJuros(JurosEnum.JUROS_PADRAO);
                combinacao.setApartirDeOutroJuros(diaSeguinteAoFimDoPeriodoDaGraca);
                combinacoes.add(combinacao);
            }
        }
        if (HelperDate.dateAfterOrEquals(dataFinal, agosto2001)) {
            if (HelperDate.dateBefore(periodoDaGracaRelativo.getFinal(), agosto2001)) {
                combinacao = new CombinacaoDeJuros();
                combinacao.setParametrosDeAtualizacao(calculo.getParametrosDeAtualizacao());
                combinacao.setOutroJuros(JurosEnum.FAZENDA_PUBLICA);
                combinacao.setApartirDeOutroJuros(agosto2001);
                combinacoes.add(combinacao);
            } else {
                if (HelperDate.dateAfter(periodoDaGracaRelativo.getInicial(), agosto2001)) {
                    combinacao = new CombinacaoDeJuros();
                    combinacao.setParametrosDeAtualizacao(calculo.getParametrosDeAtualizacao());
                    combinacao.setOutroJuros(JurosEnum.FAZENDA_PUBLICA);
                    combinacao.setApartirDeOutroJuros(agosto2001);
                    combinacoes.add(combinacao);
                }
                if (HelperDate.dateBefore(periodoDaGracaRelativo.getFinal(), dezembro2021)) {
                    combinacao = new CombinacaoDeJuros();
                    combinacao.setParametrosDeAtualizacao(calculo.getParametrosDeAtualizacao());
                    combinacao.setOutroJuros(JurosEnum.FAZENDA_PUBLICA);
                    combinacao.setApartirDeOutroJuros(diaSeguinteAoFimDoPeriodoDaGraca);
                    combinacoes.add(combinacao);
                }
            }
        }
        CombinacaoDeJuros terceira = new CombinacaoDeJuros();
        terceira.setParametrosDeAtualizacao(calculo.getParametrosDeAtualizacao());
        terceira.setOutroJuros(JurosEnum.SEM_JUROS);
        terceira.setApartirDeOutroJuros(dezembro2021);
        combinacoes.add(terceira);
        combinacoes = combinacoes.stream().filter(c -> HelperDate.dateBeforeOrEquals(c.getApartirDeOutroJuros(), dataInicioAplicarEC1362025)).collect(Collectors.toCollection(TreeSet::new));
        for (CombinacaoDeJuros combinacao2 : combinacoes) {
            if (!HelperDate.dateEquals(combinacao2.getApartirDeOutroJuros(), periodoDaGracaRelativo.getInicial())) continue;
            combinacao2.setApartirDeOutroJuros(HelperDate.getInstance(periodoDaGracaRelativo.getFinal()).addDay(1).getDate());
        }
        CombinacaoDeJuros combinacaoPeriodoDaGraca = new CombinacaoDeJuros();
        combinacaoPeriodoDaGraca.setParametrosDeAtualizacao(calculo.getParametrosDeAtualizacao());
        combinacaoPeriodoDaGraca.setOutroJuros(JurosEnum.SEM_JUROS);
        combinacaoPeriodoDaGraca.setApartirDeOutroJuros(periodoDaGracaRelativo.getInicial());
        combinacoes.add(combinacaoPeriodoDaGraca);
        CombinacaoDeJuros ultimaCombinacao = (CombinacaoDeJuros)new ArrayList(combinacoes).get(combinacoes.size() - 1);
        Boolean hasJurosPrecatorioEC1362025 = combinacoes.stream().filter(c -> c.getOutroJuros() == JurosEnum.JUROS_PRECATORIO_EC_136_2025).count() > 0L;
        if (ultimaCombinacao.getOutroJuros() != JurosEnum.JUROS_PRECATORIO_EC_136_2025 && hasJurosPrecatorioEC1362025.booleanValue()) {
            CombinacaoDeJuros c5 = new CombinacaoDeJuros();
            c5.setOutroJuros(JurosEnum.JUROS_PRECATORIO_EC_136_2025);
            c5.setApartirDeOutroJuros(HelperDate.getInstance(periodoDaGracaRelativo.getFinal()).addDay(1).getDate());
            combinacoes.add(c5);
        }
        if (HelperDate.dateAfterOrEquals(dataInicioAplicarEC1362025, periodoDaGracaRelativo.getInicial()) && HelperDate.dateBeforeOrEquals(dataInicioAplicarEC1362025, periodoDaGracaRelativo.getFinal())) {
            for (CombinacaoDeJuros combinacao3 : combinacoes) {
                if (combinacao3.getOutroJuros() != JurosEnum.JUROS_PRECATORIO_EC_136_2025) continue;
                combinacao3.setApartirDeOutroJuros(HelperDate.getInstance(periodoDaGracaRelativo.getFinal()).addDay(1).getDate());
            }
        }
        calculo.getParametrosDeAtualizacao().setListaDeCombinacaoDeJuros(new TreeSet<CombinacaoDeJuros>(combinacoes));
        TabelaDeJurosDoCalculo tabelaDeJuros = new TabelaDeJurosDoCalculo(calculo, dataInicio, dataFinal);
        BigDecimal taxaJuros = tabelaDeJuros.calcularTaxaDeJurosPagamento(dataInicio, dataFinal, JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS, false, false);
        return taxaJuros;
    }

    public static List<Map<String, Periodo>> montarCombinacaoDeJurosPrecatorioSIP(Periodo periodoAtualizacao, Periodo periodoDaGraca, Date dataInicioEC1362025) {
        ArrayList<Map<String, Periodo>> todos = new ArrayList<Map<String, Periodo>>();
        todos.add(Collections.singletonMap("Juros Padr\u00e3o", new Periodo(HelperDate.getInstance("01/10/1900"), HelperDate.getInstance("23/08/2001"))));
        todos.add(Collections.singletonMap("Fazenda P\u00fablica", new Periodo(HelperDate.getInstance("24/08/2001"), HelperDate.getInstance("30/11/2021"))));
        todos.add(Collections.singletonMap("Sem Juros", new Periodo(HelperDate.getInstance("01/12/2021"), HelperDate.getInstance("31/12/2999"))));
        Date inicio = periodoAtualizacao.getInicial();
        Date fim = periodoAtualizacao.getFinal();
        Periodo periodoDaGracaRelativo = ServicoAtualizacaoUtils.montarPeriodoDaGracaRelativo(periodoAtualizacao, periodoDaGraca);
        ArrayList<Map> todosComEC1362025 = new ArrayList<Map>();
        Map<String, Periodo> periodoEC1362025 = Collections.singletonMap("Tabela EC 136/2025", new Periodo(HelperDate.getInstance(dataInicioEC1362025), HelperDate.getInstance("31/12/2999")));
        for (Map map : todos) {
            Periodo indicePeriodo = (Periodo)map.values().iterator().next();
            if (indicePeriodo.isPeriodoContemEsta(dataInicioEC1362025)) {
                if (HelperDate.dateEquals(dataInicioEC1362025, indicePeriodo.getInicial())) {
                    todosComEC1362025.add(periodoEC1362025);
                    break;
                }
                indicePeriodo.setFinal(HelperDate.getInstance(dataInicioEC1362025).addDay(-1).getDate());
                todosComEC1362025.add(map);
                todosComEC1362025.add(periodoEC1362025);
                break;
            }
            todosComEC1362025.add(map);
        }
        ArrayList<Map<String, Periodo>> indicesCombinados = new ArrayList<Map<String, Periodo>>();
        todosComEC1362025.forEach(mapInd -> {
            String indiceNome = (String)mapInd.keySet().iterator().next();
            Periodo indicePeriodo = (Periodo)mapInd.values().iterator().next();
            if (HelperDate.getInstance(inicio).between(indicePeriodo.getInicial(), indicePeriodo.getFinal()) && HelperDate.getInstance(fim).between(indicePeriodo.getInicial(), indicePeriodo.getFinal())) {
                Map<String, Periodo> paraIncluir = Collections.singletonMap(indiceNome, new Periodo(inicio, fim));
                ServicoAtualizacaoUtils.adicionarPeriodoJurosConsiderandoPeriodoDaGraca(indicesCombinados, paraIncluir, periodoDaGracaRelativo);
            } else if (HelperDate.getInstance(inicio).between(indicePeriodo.getInicial(), indicePeriodo.getFinal())) {
                Map<String, Periodo> paraIncluir = Collections.singletonMap(indiceNome, new Periodo(inicio, indicePeriodo.getFinal()));
                ServicoAtualizacaoUtils.adicionarPeriodoJurosConsiderandoPeriodoDaGraca(indicesCombinados, paraIncluir, periodoDaGracaRelativo);
            } else if (HelperDate.getInstance(fim).between(indicePeriodo.getInicial(), indicePeriodo.getFinal())) {
                Map<String, Periodo> paraIncluir = Collections.singletonMap(indiceNome, new Periodo(indicePeriodo.getInicial(), fim));
                ServicoAtualizacaoUtils.adicionarPeriodoJurosConsiderandoPeriodoDaGraca(indicesCombinados, paraIncluir, periodoDaGracaRelativo);
            } else if (HelperDate.dateBefore(inicio, indicePeriodo.getInicial()) && HelperDate.dateAfter(fim, indicePeriodo.getFinal())) {
                Map<String, Periodo> paraIncluir = Collections.singletonMap(indiceNome, indicePeriodo);
                ServicoAtualizacaoUtils.adicionarPeriodoJurosConsiderandoPeriodoDaGraca(indicesCombinados, paraIncluir, periodoDaGracaRelativo);
            }
        });
        if (HelperDate.dateBeforeOrEquals(periodoDaGracaRelativo.getInicial(), fim)) {
            indicesCombinados.add(Collections.singletonMap("Sem Juros (Per\u00edodo da Gra\u00e7a)", periodoDaGracaRelativo));
        }
        Collections.sort(indicesCombinados, (o1, o2) -> {
            Date o1DtInicial = ((Periodo)o1.values().iterator().next()).getInicial();
            Date o2DtInicial = ((Periodo)o2.values().iterator().next()).getInicial();
            return o1DtInicial.compareTo(o2DtInicial);
        });
        return indicesCombinados;
    }

    private static void adicionarPeriodoJurosConsiderandoPeriodoDaGraca(List<Map<String, Periodo>> tabelasJuros, Map<String, Periodo> paraIncluir, Periodo periodoDaGraca) {
        boolean periodoDaGracaAbrandeTodoOPeriodoDoIndice;
        String nome = paraIncluir.keySet().iterator().next();
        Periodo periodo = paraIncluir.values().iterator().next();
        boolean inicioPGForaDoPeriodo = false;
        boolean finalPGForaDoPeriodo = false;
        if (HelperDate.getInstance(periodoDaGraca.getInicial()).between(periodo.getInicial(), periodo.getFinal())) {
            if (HelperDate.dateAfter(periodoDaGraca.getInicial(), periodo.getInicial())) {
                tabelasJuros.add(Collections.singletonMap(nome, new Periodo(periodo.getInicial(), HelperDate.getInstance(periodoDaGraca.getInicial()).addDay(-1).getDate())));
            }
        } else {
            inicioPGForaDoPeriodo = true;
        }
        if (HelperDate.getInstance(periodoDaGraca.getFinal()).between(periodo.getInicial(), periodo.getFinal())) {
            if (HelperDate.dateBefore(periodoDaGraca.getFinal(), periodo.getFinal())) {
                tabelasJuros.add(Collections.singletonMap(nome, new Periodo(HelperDate.getInstance(periodoDaGraca.getFinal()).addDay(1).getDate(), periodo.getFinal())));
            }
        } else {
            finalPGForaDoPeriodo = true;
        }
        boolean bl = periodoDaGracaAbrandeTodoOPeriodoDoIndice = HelperDate.dateBeforeOrEquals(periodoDaGraca.getInicial(), periodo.getInicial()) && HelperDate.dateAfterOrEquals(periodoDaGraca.getFinal(), periodo.getFinal());
        if (inicioPGForaDoPeriodo && finalPGForaDoPeriodo && !periodoDaGracaAbrandeTodoOPeriodoDoIndice) {
            tabelasJuros.add(paraIncluir);
        }
    }

    public static Periodo montarPeriodoDaGraca(Atualizacao atualizacao) {
        if (atualizacao.getDataInicioPeriodoDaGraca() != null && atualizacao.getDataFimPeriodoDaGraca() != null) {
            return new Periodo(atualizacao.getDataInicioPeriodoDaGraca(), atualizacao.getDataFimPeriodoDaGraca());
        }
        return null;
    }

    public static Periodo montarPeriodoDaGracaRelativo(Periodo periodoAtualizacao, Periodo periodoDaGraca) {
        Date inicio = periodoAtualizacao.getInicial();
        Date fim = periodoAtualizacao.getFinal();
        if (periodoDaGraca == null) {
            Date dataForaDeContexto = HelperDate.getInstance("01/01/1900").getDate();
            return new Periodo(dataForaDeContexto, dataForaDeContexto);
        }
        Periodo periodoDaGracaRelativo = new Periodo(periodoDaGraca.getInicial(), periodoDaGraca.getFinal());
        if (HelperDate.dateAfter(periodoDaGraca.getInicial(), fim) || HelperDate.dateBefore(periodoDaGraca.getFinal(), inicio)) {
            return periodoDaGracaRelativo;
        }
        if (HelperDate.dateBefore(periodoDaGraca.getInicial(), inicio)) {
            periodoDaGracaRelativo.setInicial(inicio);
        }
        Date inicioTabelaIPCAE = HelperDate.getInstance("01/01/1992").getDate();
        if (HelperDate.dateBefore(periodoDaGraca.getInicial(), inicioTabelaIPCAE) && HelperDate.dateAfterOrEquals(periodoDaGraca.getFinal(), inicioTabelaIPCAE)) {
            periodoDaGracaRelativo.setInicial(inicioTabelaIPCAE);
        }
        if (HelperDate.dateAfter(periodoDaGraca.getFinal(), fim)) {
            periodoDaGracaRelativo.setFinal(fim);
        }
        return periodoDaGracaRelativo;
    }

    public static Periodo encontrarPeriodoDaGraca(Date dataExpedicao, TipoPrecatorioEnum tipo) {
        if (tipo == TipoPrecatorioEnum.PRE) {
            HelperDate inicio = HelperDate.getInstance(dataExpedicao);
            HelperDate abril25 = HelperDate.getInstance(2025, 3, 3);
            if (HelperDate.dateAfterOrEquals(dataExpedicao, abril25.getDate())) {
                if (inicio.getMonth() > 1 || inicio.getMonth() == 1 && inicio.getDay() >= 2) {
                    inicio.addYear(1);
                }
                inicio.setMonth(1);
                inicio.setDay(2);
                HelperDate fim = HelperDate.getInstance(inicio.getDate()).setDay(31).setMonth(11).addYear(1);
                return new Periodo(inicio, fim);
            }
            HelperDate julho21 = HelperDate.getInstance(2021, 6, 2);
            if (HelperDate.dateAfterOrEquals(dataExpedicao, julho21.getDate())) {
                if (inicio.getMonth() > 3 || inicio.getMonth() == 3 && inicio.getDay() > 2) {
                    inicio.addYear(1);
                }
                inicio.setMonth(3);
                inicio.setDay(3);
            } else {
                if (inicio.getMonth() > 6 || inicio.getMonth() == 6 && inicio.getDay() > 1) {
                    inicio.addYear(1);
                }
                inicio.setMonth(6);
                inicio.setDay(2);
            }
            HelperDate fim = HelperDate.getInstance(inicio.getDate()).setDay(31).setMonth(11).addYear(1);
            return new Periodo(inicio, fim);
        }
        HelperDate inicio = HelperDate.getInstance(dataExpedicao).addDay(1);
        while (!inicio.isWorkDayWithoutSaturdaysOrFederalHolidays()) {
            inicio.addDay(1);
        }
        int dois = 2;
        HelperDate fim = HelperDate.getInstance(inicio.getDate()).addMonth(2).addDay(-1);
        while (!fim.isWorkDayWithoutSaturdaysOrFederalHolidays()) {
            fim.addDay(1);
        }
        return new Periodo(inicio, fim);
    }
}

