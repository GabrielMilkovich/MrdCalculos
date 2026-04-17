/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.juros.selicirpf;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculadorDeIndices;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeIndice;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.juros.selicirpf.JurosSelicIrpf;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class JurosSelicParaCorrecao
implements IndiceDeCalculo {
    private static final int DOIS_MESES_ANTES = -2;
    private static final int CEM = 100;
    private JurosSelicIrpf jurosSelicIrpf;

    public JurosSelicParaCorrecao(JurosSelicIrpf jurosSelicIrpf) {
        this.jurosSelicIrpf = jurosSelicIrpf;
    }

    @Override
    public Date getCompetencia() {
        return this.jurosSelicIrpf.getCompetenciaReferencia();
    }

    @Override
    public int compareTo(IndiceDeCalculo o) {
        return o.getCompetencia().compareTo(this.getCompetencia());
    }

    @Override
    public BigDecimal getValorIndice() {
        return this.getTaxa().divide(new BigDecimal(100), Utils.CONTEXTO_MATEMATICO).add(BigDecimal.ONE);
    }

    @Override
    public void setValorAcumulado(BigDecimal valorAcumulado) {
        this.jurosSelicIrpf.setTaxaAcumulada(valorAcumulado);
    }

    @Override
    public BigDecimal getValorAcumulado() {
        return this.jurosSelicIrpf.getTaxaAcumulada();
    }

    @Override
    public JurosSelicParaCorrecao clonar() {
        return new JurosSelicParaCorrecao(new JurosSelicIrpf().clonar(this.jurosSelicIrpf));
    }

    public static List<IndiceDeCalculo> obterTabelaParaCorrecao(Periodo periodo, Calculo calculo, Boolean ignorarTaxaNegativa, Boolean origemCalculo) {
        Date dataLiquidacao = Utils.naoNulo(calculo.getDataDeLiquidacao()) ? calculo.getDataDeLiquidacao() : HelperDate.getInstance().getDate();
        boolean incluirUmPorcentoCalculo = periodo.isPeriodoContemEsta(dataLiquidacao) || JurosSelicParaCorrecao.existirCombinacaoNoMes(dataLiquidacao, calculo) && HelperDate.dateEquals(HelperDate.getCurrentCompetence(periodo.getFinal()).getDate(), HelperDate.getCurrentCompetence(dataLiquidacao).getDate());
        boolean isAtualizacao = false;
        boolean isAtualizacaoDesdeOcorrencias = false;
        boolean origemCalculoInformada = origemCalculo != null && origemCalculo != false;
        Periodo periodoSelic = new Periodo(periodo.getInicial(), periodo.getFinal());
        if (!origemCalculoInformada && HelperDate.dateAfterOrEquals(periodo.getInicial(), dataLiquidacao) && JurosSelicParaCorrecao.isSelicIndiceNaLiquidacao(calculo)) {
            periodoSelic.setInicial(HelperDate.getCurrentCompetence(periodo.getInicial()).addDay(-1).setDay(1).getDate());
            periodoSelic.setFinal(HelperDate.getCurrentCompetence(periodo.getFinal()).addDay(-1).getDate());
            isAtualizacao = true;
        } else if (!origemCalculoInformada && HelperDate.dateAfterOrEquals(periodo.getInicial(), dataLiquidacao)) {
            periodoSelic.setInicial(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate());
            periodoSelic.setFinal(HelperDate.getCurrentCompetence(periodo.getFinal()).lastDayOfTheMonth().getDate());
            isAtualizacao = true;
        } else if (!origemCalculoInformada) {
            isAtualizacao = true;
            isAtualizacaoDesdeOcorrencias = true;
        }
        List<JurosSelicIrpf> listaJuros = JurosSelicIrpf.obterTabelaParaCorrecao(periodoSelic);
        ArrayList<JurosSelicParaCorrecao> listaParaCorrecao = new ArrayList<JurosSelicParaCorrecao>();
        List<IndiceDeCalculo> listaIndices = new ArrayList<IndiceDeCalculo>();
        Date dataMaxima = null;
        for (JurosSelicIrpf jurosSelicIrpf : listaJuros) {
            JurosSelicIrpf jurosAux;
            boolean desprezarTaxaDaLiquidacaoDaAtualizacao;
            boolean bl = desprezarTaxaDaLiquidacaoDaAtualizacao = isAtualizacao && HelperDate.dateEquals(HelperDate.getCurrentCompetence(calculo.getAtualizacao().getDataDeLiquidacao()).getDate(), jurosSelicIrpf.getCompetenciaReferencia()) && !JurosSelicParaCorrecao.isSelicIndiceNaLiquidacao(calculo);
            if (!isAtualizacao && HelperDate.dateEquals(HelperDate.getCurrentCompetence(dataLiquidacao).getDate(), jurosSelicIrpf.getCompetenciaReferencia()) || desprezarTaxaDaLiquidacaoDaAtualizacao) {
                if (!Utils.nulo(dataMaxima)) continue;
                dataMaxima = HelperDate.getCurrentCompetence(jurosSelicIrpf.getCompetenciaReferencia()).addMonth(-1).getDate();
                continue;
            }
            if (isAtualizacao && JurosSelicParaCorrecao.isSelicIndiceNaLiquidacao(calculo) && !isAtualizacaoDesdeOcorrencias) {
                jurosAux = new JurosSelicIrpf();
                jurosAux = jurosAux.clonar(jurosSelicIrpf);
                jurosAux.setCompetenciaReferencia(HelperDate.getCurrentCompetence(jurosSelicIrpf.getCompetenciaReferencia()).addMonth(1).getDate());
                jurosAux.setCompetencia(HelperDate.getCurrentCompetence(jurosSelicIrpf.getCompetencia()).addMonth(1).getDate());
                listaParaCorrecao.add(new JurosSelicParaCorrecao(jurosAux));
            } else {
                jurosAux = new JurosSelicIrpf();
                jurosAux = jurosAux.clonar(jurosSelicIrpf);
                listaParaCorrecao.add(new JurosSelicParaCorrecao(jurosAux));
            }
            if (!Utils.nulo(dataMaxima) && !HelperDate.dateAfter(jurosSelicIrpf.getCompetenciaReferencia(), dataMaxima)) continue;
            dataMaxima = jurosSelicIrpf.getCompetenciaReferencia();
        }
        boolean incluirUmPorcento = incluirUmPorcentoCalculo && !isAtualizacao && Utils.naoNulo(dataMaxima);
        boolean bl = incluirUmPorcento = incluirUmPorcento || isAtualizacao && !JurosSelicParaCorrecao.isSelicIndiceNaLiquidacao(calculo) && periodo.isPeriodoContemEsta(calculo.getAtualizacao().getDataDeLiquidacao());
        if (incluirUmPorcento) {
            JurosSelicIrpf jurosUmPorcento = new JurosSelicIrpf();
            jurosUmPorcento.setTaxa(BigDecimal.ONE);
            HelperDate dataMax = Utils.naoNulo(dataMaxima) ? HelperDate.getCurrentCompetence(dataMaxima).addMonth(1) : (isAtualizacao ? HelperDate.getCurrentCompetence(calculo.getAtualizacao().getDataDeLiquidacao()) : HelperDate.getCurrentCompetence(dataLiquidacao));
            jurosUmPorcento.setCompetenciaReferencia(dataMax.getDate());
            jurosUmPorcento.setCompetencia(dataMax.addMonth(-2).getDate());
            listaParaCorrecao.add(new JurosSelicParaCorrecao(jurosUmPorcento));
        }
        if (!listaParaCorrecao.isEmpty()) {
            listaIndices = CalculadorDeIndices.calcularIndiceAcumuladoComSomas(listaParaCorrecao, ignorarTaxaNegativa);
        }
        return listaIndices;
    }

    private static boolean isSelicIndiceNaLiquidacao(Calculo calculo) {
        boolean isSelic = false;
        ParametrosDeAtualizacao parametros = calculo.getParametrosDeAtualizacao();
        if (IndiceMonetarioEnum.SELIC.equals((Object)parametros.getIndiceTrabalhista())) {
            isSelic = true;
        }
        Date dataLiquidacao = calculo.getDataDeLiquidacao();
        if (parametros.getCombinarOutroIndice().booleanValue()) {
            for (CombinacaoDeIndice comb : parametros.getListaDeCombinacaoDeIndices()) {
                if (!HelperDate.dateBeforeOrEquals(comb.getApartirDeOutroIndice(), dataLiquidacao)) continue;
                isSelic = IndiceMonetarioEnum.SELIC.equals((Object)comb.getOutroIndiceTrabalhista());
            }
        }
        return isSelic;
    }

    private static boolean existirCombinacaoNoMes(Date competencia, Calculo calculo) {
        boolean existeCombinacao = false;
        ParametrosDeAtualizacao parametros = calculo.getParametrosDeAtualizacao();
        if (parametros.getCombinarOutroIndice().booleanValue()) {
            for (CombinacaoDeIndice comb : parametros.getListaDeCombinacaoDeIndices()) {
                if (!HelperDate.dateEquals(HelperDate.getCurrentCompetence(comb.getApartirDeOutroIndice()).getDate(), HelperDate.getCurrentCompetence(competencia).getDate())) continue;
                existeCombinacao = true;
                break;
            }
        }
        return existeCombinacao;
    }

    public static BigDecimal obterAcumuladoNo(Periodo periodo) {
        BigDecimal indiceAcumulado = BigDecimal.ONE;
        Periodo periodoSelic = new Periodo();
        periodoSelic.setInicial(HelperDate.getCurrentCompetence(periodo.getInicial()).addDay(-1).setDay(1).getDate());
        periodoSelic.setFinal(HelperDate.getCurrentCompetence(periodo.getFinal()).addDay(-1).getDate());
        List<JurosSelicIrpf> listaJuros = JurosSelicIrpf.obterTabelaParaCorrecao(periodoSelic);
        ArrayList<JurosSelicParaCorrecao> listaParaCorrecao = new ArrayList<JurosSelicParaCorrecao>();
        for (JurosSelicIrpf jurosSelicIrpf : listaJuros) {
            JurosSelicIrpf jurosAux = new JurosSelicIrpf();
            jurosAux = jurosAux.clonar(jurosSelicIrpf);
            jurosAux.setCompetenciaReferencia(HelperDate.getCurrentCompetence(jurosSelicIrpf.getCompetenciaReferencia()).addMonth(1).getDate());
            jurosAux.setCompetencia(HelperDate.getCurrentCompetence(jurosSelicIrpf.getCompetencia()).addMonth(1).getDate());
            listaParaCorrecao.add(new JurosSelicParaCorrecao(jurosAux));
        }
        List<Object> listaIndices = new ArrayList();
        if (!listaParaCorrecao.isEmpty()) {
            listaIndices = CalculadorDeIndices.calcularIndiceAcumuladoComSomas(listaParaCorrecao, Boolean.FALSE);
        }
        if (!listaIndices.isEmpty()) {
            for (int i = 1; i <= listaIndices.size(); ++i) {
                IndiceDeCalculo indice = (IndiceDeCalculo)listaIndices.get(listaIndices.size() - i);
                if (!HelperDate.dateAfter(HelperDate.getCurrentCompetence(indice.getCompetencia()).getDate(), HelperDate.getCurrentCompetence(periodo.getInicial()).getDate())) continue;
                indiceAcumulado = indice.getValorAcumulado();
                break;
            }
        }
        return indiceAcumulado;
    }

    @Override
    public BigDecimal getTaxa() {
        return this.jurosSelicIrpf.getTaxa();
    }
}

