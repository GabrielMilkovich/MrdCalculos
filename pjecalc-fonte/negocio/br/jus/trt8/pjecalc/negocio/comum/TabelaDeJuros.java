/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.jboss.seam.annotations.Logger
 *  org.jboss.seam.log.Log
 */
package br.jus.trt8.pjecalc.negocio.comum;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.PeriodoDeJuros;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.JurosDoAjuizamentoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.JurosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeJurosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeDeJurosBaseEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicDiaria;
import br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicFazenda;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTDiario;
import br.jus.trt8.pjecalc.negocio.dominio.juros.JurosBase;
import br.jus.trt8.pjecalc.negocio.dominio.juros.fazendapublica.JurosFazendaPublica;
import br.jus.trt8.pjecalc.negocio.dominio.juros.padrao.JurosPadrao;
import br.jus.trt8.pjecalc.negocio.dominio.juros.precatorios.JurosPrecatorioEC1362025;
import br.jus.trt8.pjecalc.negocio.dominio.juros.selicirpf.JurosSelicIrpf;
import br.jus.trt8.pjecalc.negocio.dominio.juros.taxalegal.JurosTaxaLegal;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.jboss.seam.annotations.Logger;
import org.jboss.seam.log.Log;

public abstract class TabelaDeJuros
implements Serializable {
    public static final String ALIQUOTA_MEIO_PORCENTO = "0.5";
    public static final String ALIQUOTA_ZERO_TRINTA_TRES = "0.0333333";
    private static final long serialVersionUID = 1L;
    private static final int PRIMEIRO_PERIODO_FALTANTE = 1;
    private static final int PRIMEIRO_PERIODO_JUROS = 1;
    private static final Date PRIMEIRO_MARCO_1991 = HelperDate.getInstance(1991, 2, 1).getDate();
    private static final Date PRIMEIRO_JANEIRO_2001 = HelperDate.getInstance(2001, 0, 1).getDate();
    @Logger
    private Log log;
    private Calculo calculo;
    private Date dataEvento;
    private PeriodoDeJuros periodoDeJurosInicial;
    private Periodo periodoDeJuros;
    private Date dataInicialDeJuros;

    public TabelaDeJuros(Calculo calculo) {
        this.calculo = calculo;
        this.periodoDeJuros = new Periodo(calculo.getParametrosDeAtualizacao().getAplicarJurosFasePreJudicial() != false ? HelperDate.getCurrentCompetence(calculo.getDataAdmissao()).getDate() : HelperDate.getCurrentCompetence(calculo.getDataAjuizamento()).getDate(), HelperDate.getInstance(calculo.getDataDeLiquidacao()).removeTime().getDate());
        this.carregarPeriodosDeJurosTotalComCombinacoes();
    }

    public TabelaDeJuros(Calculo calculo, Date dataInicialParaCalculo, Date dataFinalParaCalculo) {
        this.calculo = calculo;
        this.dataEvento = dataFinalParaCalculo;
        this.periodoDeJuros = new Periodo(HelperDate.getInstance(dataInicialParaCalculo).removeTime().getDate(), HelperDate.getInstance(dataFinalParaCalculo).removeTime().getDate());
        this.carregarPeriodosDeJurosTotalComCombinacoes();
    }

    private PeriodoDeJuros criarPeriodoDeJuros(PeriodoDeJuros periodoDeJurosAnterior, Date dataInicial, Date dataFinal, BigDecimal aliquota, TipoDeQuantidadeDeJurosBaseEnum tipoDeQuantidade, TipoDeJurosEnum tipoDeJuros, JurosEnum tabelaJuros) {
        PeriodoDeJuros periodoDeJuros = new PeriodoDeJuros(dataInicial, dataFinal, aliquota, tipoDeQuantidade, tipoDeJuros, JurosEnum.FAZENDA_PUBLICA.equals((Object)tabelaJuros) || JurosEnum.JUROS_POUPANCA.equals((Object)tabelaJuros), tabelaJuros);
        if (Utils.nulo(periodoDeJurosAnterior)) {
            this.periodoDeJurosInicial = periodoDeJuros;
        } else {
            periodoDeJurosAnterior.setProximoPeriodo(periodoDeJuros);
        }
        return periodoDeJuros;
    }

    protected void carregarPeriodosDeJurosTotalComCombinacoes() {
        JurosEnum tabelaAtual = this.calculo.getParametrosDeAtualizacao().getJuros();
        JurosEnum proximaTabela = null;
        Date dataInicio = this.periodoDeJuros.getInicial();
        Date dataAPartirDe = null;
        PeriodoDeJuros periodoDeJurosAnterior = null;
        Date primeiraDataAPartirDeAposFimDeJuros = null;
        for (CombinacaoDeJuros combinacao : this.calculo.getParametrosDeAtualizacao().getListaDeCombinacaoDeJuros()) {
            proximaTabela = combinacao.getOutroJuros();
            dataAPartirDe = combinacao.getApartirDeOutroJuros();
            if (HelperDate.dateBeforeOrEquals(dataAPartirDe, dataInicio)) {
                tabelaAtual = proximaTabela;
                continue;
            }
            if (HelperDate.dateAfter(dataAPartirDe, this.periodoDeJuros.getFinal())) {
                primeiraDataAPartirDeAposFimDeJuros = dataAPartirDe;
                break;
            }
            periodoDeJurosAnterior = this.montarPeriodo(periodoDeJurosAnterior, tabelaAtual, dataInicio, HelperDate.getInstance(dataAPartirDe).addDay(-1).getDate(), true);
            dataInicio = dataAPartirDe;
            tabelaAtual = proximaTabela;
        }
        boolean temCombinacaoNoMesmoMes = Utils.naoNulo(primeiraDataAPartirDeAposFimDeJuros) && HelperDate.dateEquals(HelperDate.getCurrentCompetence(this.periodoDeJuros.getFinal()).getDate(), HelperDate.getCurrentCompetence(primeiraDataAPartirDeAposFimDeJuros).getDate());
        periodoDeJurosAnterior = this.montarPeriodo(periodoDeJurosAnterior, tabelaAtual, dataInicio, this.periodoDeJuros.getFinal(), temCombinacaoNoMesmoMes);
    }

    private PeriodoDeJuros montarPeriodo(PeriodoDeJuros periodoDeJurosAnterior, JurosEnum tabelaAtual, Date dataInicial, Date dataFinal, boolean comMudanca) {
        Date dataInicioPesquisa;
        PeriodoDeJuros periodoMontado = periodoDeJurosAnterior;
        if (JurosEnum.SEM_JUROS.equals((Object)tabelaAtual)) {
            periodoMontado = this.criarPeriodoDeJuros(periodoDeJurosAnterior, dataInicial, dataFinal, BigDecimal.ZERO, TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
        }
        if (JurosEnum.JUROS_MEIO_PORCENTO.equals((Object)tabelaAtual)) {
            periodoMontado = this.criarPeriodoDeJuros(periodoDeJurosAnterior, dataInicial, dataFinal, new BigDecimal(ALIQUOTA_MEIO_PORCENTO), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
        }
        if (JurosEnum.JUROS_ZERO_TRINTA_TRES.equals((Object)tabelaAtual)) {
            periodoMontado = this.criarPeriodoDeJuros(periodoDeJurosAnterior, dataInicial, dataFinal, new BigDecimal(ALIQUOTA_ZERO_TRINTA_TRES), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
        }
        if (JurosEnum.JUROS_UM_PORCENTO.equals((Object)tabelaAtual)) {
            periodoMontado = this.criarPeriodoDeJuros(periodoDeJurosAnterior, dataInicial, dataFinal, BigDecimal.ONE, TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaAtual);
        }
        if (JurosEnum.JUROS_POUPANCA.equals((Object)tabelaAtual) || JurosEnum.FAZENDA_PUBLICA.equals((Object)tabelaAtual)) {
            periodoMontado = this.montarPeriodosDa(this.getListaDeJurosFazendaPublica(dataInicial, dataFinal), periodoDeJurosAnterior, dataInicial, dataFinal, tabelaAtual);
        }
        if (JurosEnum.JUROS_PADRAO.equals((Object)tabelaAtual)) {
            periodoMontado = this.montarPeriodosDa(this.getListaDeJurosPadrao(dataInicial, dataFinal), periodoDeJurosAnterior, dataInicial, dataFinal, tabelaAtual);
        }
        if (JurosEnum.JUROS_PRECATORIO_EC_136_2025.equals((Object)tabelaAtual)) {
            periodoMontado = this.montarPeriodosJurosPrecatorioEC1362025(JurosPrecatorioEC1362025.obterTabela(new Periodo(dataInicial, dataFinal)), periodoDeJurosAnterior, tabelaAtual);
        }
        if (JurosEnum.TAXA_LEGAL.equals((Object)tabelaAtual)) {
            periodoMontado = this.montarPeriodosTaxaLegal(JurosTaxaLegal.obterTabela(new Periodo(dataInicial, dataFinal)), periodoDeJurosAnterior, tabelaAtual);
        }
        if (JurosEnum.SELIC.equals((Object)tabelaAtual)) {
            dataInicioPesquisa = dataInicial;
            if (HelperDate.dateAfter(this.periodoDeJuros.getInicial(), this.calculo.getDataDeLiquidacao()) && this.isSelicIndiceNaLiquidacao()) {
                dataInicioPesquisa = HelperDate.getCurrentCompetence(dataInicial).addDay(-1).setDay(1).getDate();
            }
            periodoMontado = this.montarPeriodosSelicDa(this.getListaDeJurosSelic(dataInicioPesquisa, dataFinal), periodoDeJurosAnterior, dataInicial, dataFinal, tabelaAtual, comMudanca);
        }
        if (JurosEnum.TRD_SIMPLES.equals((Object)tabelaAtual) || JurosEnum.TRD_COMPOSTOS.equals((Object)tabelaAtual)) {
            Date diaAposAjuizamento;
            dataInicioPesquisa = dataInicial;
            if (!this.calculo.getParametrosDeAtualizacao().getAplicarJurosFasePreJudicial().booleanValue() && HelperDate.dateBefore(dataInicioPesquisa, diaAposAjuizamento = HelperDate.getInstance(this.calculo.getDataAjuizamento()).addDay(1).getDate())) {
                dataInicioPesquisa = diaAposAjuizamento;
            }
            if (HelperDate.dateBefore(dataInicioPesquisa, PRIMEIRO_MARCO_1991)) {
                dataInicioPesquisa = PRIMEIRO_MARCO_1991;
            }
            periodoMontado = this.montarPeriodosTRD(IndiceTabelaUnicaJTDiario.obterTabela(new Periodo(dataInicioPesquisa, dataFinal)), periodoDeJurosAnterior, tabelaAtual);
        }
        if (JurosEnum.SELIC_BACEN.equals((Object)tabelaAtual)) {
            periodoMontado = this.montarPeriodosSelicBacen(IndiceSelicDiaria.obterTabela(new Periodo(dataInicial, dataFinal)), periodoDeJurosAnterior, tabelaAtual);
        }
        if (JurosEnum.SELIC_FAZENDA.equals((Object)tabelaAtual)) {
            periodoMontado = this.montarPeriodosSelicFazenda(IndiceSelicFazenda.obterTabela(new Periodo(dataInicial, dataFinal)), periodoDeJurosAnterior, dataInicial, dataFinal, tabelaAtual, comMudanca);
        }
        return periodoMontado;
    }

    private PeriodoDeJuros montarPeriodosTRD(List<IndiceTabelaUnicaJTDiario> tabelaUnicaDiaria, PeriodoDeJuros periodoDeJurosAnterior, JurosEnum tabela) {
        for (IndiceTabelaUnicaJTDiario indice : tabelaUnicaDiaria) {
            BigDecimal taxaSimples = Utils.multiplicar(indice.getTaxa(), BigDecimal.valueOf(HelperDate.getInstance(indice.getCompetencia()).lastDayOfTheMonth().getDay()));
            BigDecimal taxaComposta = Utils.somar(Utils.obterPercentualPara(indice.getTaxa()), BigDecimal.ONE);
            periodoDeJurosAnterior = this.criarPeriodoDeJuros(periodoDeJurosAnterior, indice.getCompetencia(), indice.getCompetencia(), JurosEnum.TRD_SIMPLES.equals((Object)tabela) ? taxaSimples : taxaComposta, TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabela);
        }
        return periodoDeJurosAnterior;
    }

    private PeriodoDeJuros montarPeriodosTaxaLegal(List<JurosTaxaLegal> tabelaJurosTaxaLegal, PeriodoDeJuros periodoDeJurosAnterior, JurosEnum tabela) {
        for (JurosTaxaLegal taxaJuros : tabelaJurosTaxaLegal) {
            BigDecimal taxaSimples = Utils.multiplicar(taxaJuros.getTaxa(), BigDecimal.valueOf(HelperDate.getInstance(taxaJuros.getCompetencia()).lastDayOfTheMonth().getDay()));
            periodoDeJurosAnterior = this.criarPeriodoDeJuros(periodoDeJurosAnterior, taxaJuros.getCompetencia(), taxaJuros.getCompetencia(), taxaSimples, TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabela);
        }
        return periodoDeJurosAnterior;
    }

    private PeriodoDeJuros montarPeriodosJurosPrecatorioEC1362025(List<JurosPrecatorioEC1362025> tabelaJurosPrecatorioEC1362025, PeriodoDeJuros periodoDeJurosAnterior, JurosEnum tabela) {
        for (JurosPrecatorioEC1362025 taxaJuros : tabelaJurosPrecatorioEC1362025) {
            BigDecimal taxaSimples = Utils.multiplicar(taxaJuros.getTaxa(), BigDecimal.valueOf(HelperDate.getInstance(taxaJuros.getCompetencia()).lastDayOfTheMonth().getDay()));
            periodoDeJurosAnterior = this.criarPeriodoDeJuros(periodoDeJurosAnterior, taxaJuros.getCompetencia(), taxaJuros.getCompetencia(), taxaSimples, TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabela);
        }
        return periodoDeJurosAnterior;
    }

    private PeriodoDeJuros montarPeriodosSelicBacen(List<IndiceSelicDiaria> tabelaSelicDiaria, PeriodoDeJuros periodoDeJurosAnterior, JurosEnum tabela) {
        for (IndiceSelicDiaria indice : tabelaSelicDiaria) {
            BigDecimal taxa = Utils.somar(Utils.obterPercentualPara(indice.getTaxa()), BigDecimal.ONE);
            periodoDeJurosAnterior = this.criarPeriodoDeJuros(periodoDeJurosAnterior, indice.getCompetencia(), indice.getCompetencia(), taxa, TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabela);
        }
        return periodoDeJurosAnterior;
    }

    private PeriodoDeJuros montarPeriodosSelicFazenda(List<IndiceSelicFazenda> tabelaSelicFazenda, PeriodoDeJuros periodoDeJurosAnterior, Date dataInicial, Date dataFinal, JurosEnum tabela, boolean comMudanca) {
        int size = tabelaSelicFazenda.size();
        for (int i = size - 1; i >= 0; --i) {
            Date dataInicio = tabelaSelicFazenda.get(i).getCompetencia();
            if (HelperDate.dateAfter(dataInicial, dataInicio)) {
                dataInicio = dataInicial;
            }
            Date dataFim = HelperDate.getInstance(tabelaSelicFazenda.get(i).getCompetencia()).lastDayOfTheMonth().getDate();
            if (comMudanca && HelperDate.dateBefore(dataFinal, dataFim)) {
                dataFim = dataFinal;
            }
            periodoDeJurosAnterior = this.criarPeriodoDeJuros(periodoDeJurosAnterior, dataInicio, dataFim, tabelaSelicFazenda.get(i).getTaxa(), TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabela);
        }
        return periodoDeJurosAnterior;
    }

    private PeriodoDeJuros montarPeriodosDa(List<? extends JurosBase> listaDeJuros, PeriodoDeJuros periodoDeJurosAnterior, Date dataInicial, Date dataFinal, JurosEnum tabelaJuros) {
        int quantidadeJuros = listaDeJuros.size();
        int count = 1;
        Date dataFinalTotalPeriodo = dataFinal;
        for (JurosBase jurosBase : listaDeJuros) {
            if (count > 1 || Utils.nulo(periodoDeJurosAnterior)) {
                dataInicial = jurosBase.getDataInicio();
            }
            dataFinal = count == quantidadeJuros && (Utils.nulo(jurosBase.getDataFim()) || HelperDate.dateAfter(jurosBase.getDataFim(), dataFinalTotalPeriodo)) ? dataFinalTotalPeriodo : jurosBase.getDataFim();
            periodoDeJurosAnterior = this.criarPeriodoDeJuros(periodoDeJurosAnterior, Utils.naoNulo(periodoDeJurosAnterior) ? dataInicial : jurosBase.getDataInicio(), dataFinal, jurosBase.getAliquota(), jurosBase.getTipoDeQuantidade(), jurosBase.getTipoDeJuros(), tabelaJuros);
            ++count;
        }
        return periodoDeJurosAnterior;
    }

    private PeriodoDeJuros montarPeriodosSelicDa(List<JurosSelicIrpf> listaDeJuros, PeriodoDeJuros periodoDeJurosAnterior, Date dataInicial, Date dataFinal, JurosEnum tabelaJuros, boolean comMudanca) {
        BigDecimal taxa;
        if (HelperDate.dateAfter(dataInicial, dataFinal)) {
            return periodoDeJurosAnterior;
        }
        boolean isAtualizacao = HelperDate.dateAfter(this.periodoDeJuros.getInicial(), this.calculo.getDataDeLiquidacao());
        int count = 1;
        Date dataFinalTotalPeriodo = dataFinal;
        boolean manterDataInicialNoInicioDaAtualizacao = HelperDate.dateEquals(HelperDate.getInstance(dataInicial).addDay(-1).getDate(), this.calculo.getDataDeLiquidacao()) && this.isSelicIndiceNaLiquidacao() && this.existirCombinacaoNoMes(this.calculo.getDataDeLiquidacao());
        boolean mesJaConsideradoEmEventoAnteriorDaAtualizacao = isAtualizacao && HelperDate.dateAfter(HelperDate.getInstance(dataInicial).addDay(-1).getDate(), this.calculo.getDataDeLiquidacao()) && !this.existirCombinacaoNoMes(dataInicial) && HelperDate.getInstance(dataInicial).getDay() > 1;
        boolean mesJaConsideradoNoCalculo = isAtualizacao && HelperDate.dateEquals(HelperDate.getInstance(dataInicial).addDay(-1).getDate(), this.calculo.getDataDeLiquidacao()) && this.isSelicIndiceNaLiquidacao();
        mesJaConsideradoNoCalculo = mesJaConsideradoNoCalculo && !this.existirCombinacaoNoMes(this.calculo.getDataDeLiquidacao()) && HelperDate.dateEquals(HelperDate.getCurrentCompetence(dataInicial).getDate(), HelperDate.getCurrentCompetence(this.calculo.getDataDeLiquidacao()).getDate());
        for (JurosSelicIrpf juros : listaDeJuros) {
            Date dataInicioJuros = HelperDate.getCurrentCompetence(juros.getCompetenciaReferencia()).setDay(1).getDate();
            Date dataFinalJuros = HelperDate.getCurrentCompetence(juros.getCompetenciaReferencia()).lastDayOfTheMonth().getDate();
            boolean taxasPraFrente = isAtualizacao && this.isSelicIndiceNaLiquidacao();
            boolean bl = taxasPraFrente = taxasPraFrente && (!this.existirCombinacaoNoMes(this.calculo.getDataDeLiquidacao()) || !HelperDate.dateEquals(HelperDate.getCurrentCompetence(dataInicial).getDate(), HelperDate.getCurrentCompetence(this.calculo.getDataDeLiquidacao()).getDate()));
            if (taxasPraFrente) {
                dataInicioJuros = HelperDate.getCurrentCompetence(juros.getCompetenciaReferencia()).setDay(1).addMonth(1).setDay(1).getDate();
                dataFinalJuros = HelperDate.getCurrentCompetence(juros.getCompetenciaReferencia()).setDay(1).addMonth(1).lastDayOfTheMonth().getDate();
            }
            if (HelperDate.dateAfter(dataInicioJuros, dataFinalTotalPeriodo)) break;
            if (mesJaConsideradoEmEventoAnteriorDaAtualizacao || mesJaConsideradoNoCalculo) {
                mesJaConsideradoEmEventoAnteriorDaAtualizacao = false;
                mesJaConsideradoNoCalculo = false;
                continue;
            }
            if (count > 1 || Utils.nulo(periodoDeJurosAnterior) && !manterDataInicialNoInicioDaAtualizacao) {
                dataInicial = dataInicioJuros;
            }
            dataFinal = dataFinalJuros;
            if (comMudanca && HelperDate.dateEquals(HelperDate.getCurrentCompetence(dataFinal).getDate(), HelperDate.getCurrentCompetence(dataFinalTotalPeriodo).getDate())) {
                dataFinal = dataFinalTotalPeriodo;
            }
            taxa = juros.getTaxa();
            if (HelperDate.dateEquals(this.periodoDeJuros.getFinal(), this.calculo.getDataDeLiquidacao()) && HelperDate.dateEquals(HelperDate.getCurrentCompetence(this.periodoDeJuros.getFinal()).getDate(), HelperDate.getCurrentCompetence(dataFinal).getDate()) || manterDataInicialNoInicioDaAtualizacao && HelperDate.dateEquals(HelperDate.getCurrentCompetence(this.calculo.getDataDeLiquidacao()).getDate(), HelperDate.getCurrentCompetence(dataFinal).getDate())) {
                taxa = BigDecimal.ONE;
            }
            if (isAtualizacao && !this.isSelicIndiceNaLiquidacao() && HelperDate.dateEquals(this.periodoDeJuros.getFinal(), this.calculo.getAtualizacao().getDataDeLiquidacao()) && HelperDate.dateEquals(HelperDate.getCurrentCompetence(this.periodoDeJuros.getFinal()).getDate(), HelperDate.getCurrentCompetence(dataFinal).getDate())) {
                taxa = BigDecimal.ONE;
            }
            periodoDeJurosAnterior = this.criarPeriodoDeJuros(periodoDeJurosAnterior, Utils.naoNulo(periodoDeJurosAnterior) || manterDataInicialNoInicioDaAtualizacao ? dataInicial : dataInicioJuros, dataFinal, taxa, TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaJuros);
            ++count;
        }
        if (HelperDate.dateBefore(dataFinal, dataFinalTotalPeriodo)) {
            List<Periodo> periodosFaltantes = HelperDate.breakInMonths(HelperDate.getCurrentCompetence(dataFinal).addMonth(1).getDate(), HelperDate.getCurrentCompetence(dataFinalTotalPeriodo).lastDayOfTheMonth().getDate());
            boolean faltanteIncluiLiquidacao = this.verificarSeFaltanteIncluiLiquidacao(periodosFaltantes);
            int contadorPeriodo = 1;
            for (Periodo p : periodosFaltantes) {
                if (HelperDate.dateEquals(HelperDate.getCurrentCompetence(p.getFinal()).getDate(), HelperDate.getCurrentCompetence(dataFinalTotalPeriodo).getDate()) && this.existirCombinacaoNoMes(p.getInicial())) {
                    p.setFinal(dataFinalTotalPeriodo);
                }
                taxa = BigDecimal.ZERO;
                if (faltanteIncluiLiquidacao && contadorPeriodo == 1) {
                    taxa = BigDecimal.ONE;
                }
                if (isAtualizacao && !this.isSelicIndiceNaLiquidacao() && HelperDate.dateEquals(this.periodoDeJuros.getFinal(), this.calculo.getAtualizacao().getDataDeLiquidacao()) && HelperDate.dateEquals(HelperDate.getCurrentCompetence(this.periodoDeJuros.getFinal()).getDate(), p.getInicial())) {
                    taxa = BigDecimal.ONE;
                }
                periodoDeJurosAnterior = this.criarPeriodoDeJuros(periodoDeJurosAnterior, p.getInicial(), p.getFinal(), taxa, TipoDeQuantidadeDeJurosBaseEnum.FRACAO, TipoDeJurosEnum.SIMPLES, tabelaJuros);
                ++contadorPeriodo;
            }
        }
        return periodoDeJurosAnterior;
    }

    private boolean verificarSeFaltanteIncluiLiquidacao(List<Periodo> periodosFaltantes) {
        boolean incluiLiquidacao = false;
        for (Periodo p : periodosFaltantes) {
            if (!HelperDate.dateEquals(this.periodoDeJuros.getFinal(), this.calculo.getDataDeLiquidacao()) || !HelperDate.dateEquals(HelperDate.getCurrentCompetence(this.periodoDeJuros.getFinal()).getDate(), p.getInicial())) continue;
            incluiLiquidacao = true;
        }
        return incluiLiquidacao;
    }

    private boolean existirCombinacaoNoMes(Date competencia) {
        boolean existeCombinacao = false;
        ParametrosDeAtualizacao parametros = this.getCalculo().getParametrosDeAtualizacao();
        if (parametros.getCombinarOutroJuros().booleanValue()) {
            for (CombinacaoDeJuros comb : parametros.getListaDeCombinacaoDeJuros()) {
                if (!HelperDate.dateEquals(HelperDate.getCurrentCompetence(comb.getApartirDeOutroJuros()).getDate(), HelperDate.getCurrentCompetence(competencia).getDate())) continue;
                existeCombinacao = true;
                break;
            }
        }
        return existeCombinacao;
    }

    protected List<? extends JurosBase> getListaDeJurosPadrao(Date dataInicial, Date dataFinal) {
        return JurosPadrao.obterPeriodoDeJurosBase(dataInicial, dataFinal);
    }

    protected List<? extends JurosBase> getListaDeJurosFazendaPublica(Date dataInicial, Date dataFinal) {
        return JurosFazendaPublica.obterPeriodoDeJurosBase(dataInicial, dataFinal);
    }

    protected List<JurosSelicIrpf> getListaDeJurosSelic(Date dataInicial, Date dataFinal) {
        return JurosSelicIrpf.obterTabelaParaJurosMora(dataInicial, dataFinal);
    }

    protected List<? extends JurosBase> getListaDeJurosFazendaPublicaComDataInicialDelimitada(Date dataInicial, Date dataFinal) {
        List<JurosFazendaPublica> jurossBase = JurosFazendaPublica.obterPeriodoDeJurosBase(dataInicial, dataFinal);
        if (jurossBase != null && !jurossBase.isEmpty() && dataInicial != null) {
            ((JurosBase)jurossBase.get(0)).setDataInicio(dataInicial);
        }
        return jurossBase;
    }

    protected PeriodoDeJuros getPeriodoDeJurosInicial() {
        return this.periodoDeJurosInicial;
    }

    protected JurosDoAjuizamentoEnum getTipoDeJurosDoAjuizamento() {
        return JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS;
    }

    protected Date calcularDataInicialDoPrimeiroPeriodoDeJuros(Date dataInicialParaCalculo, Date dataFimVencimentoOcorrencia) {
        if (JurosDoAjuizamentoEnum.OCORRENCIAS_VENCIDAS.equals((Object)this.getTipoDeJurosDoAjuizamento())) {
            HelperDate dataInicial = HelperDate.getInstance(dataInicialParaCalculo).lastDayOfTheMonth();
            if (this.calculo.getParametrosDeAtualizacao().getAplicarJurosFasePreJudicial().booleanValue() && Utils.naoNulo(dataFimVencimentoOcorrencia)) {
                this.setDataInicialDeJuros(dataFimVencimentoOcorrencia);
                return HelperDate.getInstance(dataFimVencimentoOcorrencia).addDay(1).getDate();
            }
            if (this.calculo.getParametrosDeAtualizacao().getAplicarJurosFasePreJudicial().booleanValue()) {
                this.setDataInicialDeJuros(dataInicial.getDate());
                return dataInicial.setDay(1).addMonth(1).setDay(1).getDate();
            }
            if (Utils.nulo(this.calculo.getDataAjuizamento()) || dataInicial.greaterThenOrEquals(this.calculo.getDataAjuizamento())) {
                if (Utils.naoNulo(dataFimVencimentoOcorrencia) && HelperDate.dateBeforeOrEquals(dataFimVencimentoOcorrencia, this.calculo.getDataAjuizamento())) {
                    this.setDataInicialDeJuros(this.calculo.getDataAjuizamento());
                    return HelperDate.getInstance(this.calculo.getDataAjuizamento()).addDay(1).getDate();
                }
                this.setDataInicialDeJuros(dataInicial.getDate());
                return dataInicial.setDay(1).addMonth(1).setDay(1).getDate();
            }
        }
        this.setDataInicialDeJuros(this.calculo.getDataAjuizamento());
        return HelperDate.getInstance(this.calculo.getDataAjuizamento()).addDay(1).getDate();
    }

    protected PeriodoDeJuros buscarPeriodoDeJuros(Date data) {
        PeriodoDeJuros periodoDeJuros = this.getPeriodoDeJurosInicial();
        HelperDate hdDataFinal = HelperDate.getInstance();
        while (Utils.naoNulo(periodoDeJuros)) {
            hdDataFinal.setDate(periodoDeJuros.getDataFinal());
            if (hdDataFinal.greaterThenOrEquals(data)) {
                return periodoDeJuros;
            }
            periodoDeJuros = periodoDeJuros.getProximoPeriodo();
        }
        return null;
    }

    protected Calculo getCalculo() {
        return this.calculo;
    }

    public static boolean validarTabelasDeJurosPorPeriodo(JurosEnum juros, Periodo periodo) {
        List<Object> tabela = new ArrayList();
        switch (juros) {
            case SEM_JUROS: {
                return true;
            }
            case JUROS_POUPANCA: 
            case FAZENDA_PUBLICA: {
                tabela = JurosFazendaPublica.obterPeriodoDeJurosBase(periodo.getInicial(), periodo.getFinal());
                break;
            }
            case JUROS_UM_PORCENTO: 
            case JUROS_ZERO_TRINTA_TRES: 
            case JUROS_MEIO_PORCENTO: {
                return HelperDate.dateAfterOrEquals(periodo.getInicial(), PRIMEIRO_JANEIRO_2001);
            }
            case JUROS_PADRAO: {
                tabela = JurosPadrao.obterPeriodoDeJurosBase(periodo.getInicial(), periodo.getFinal());
                break;
            }
            case SELIC_FAZENDA: {
                tabela = IndiceSelicFazenda.obterTabela(periodo);
                break;
            }
            case SELIC: {
                tabela = JurosSelicIrpf.obterTabelaParaJurosMora(periodo.getInicial(), periodo.getFinal());
                break;
            }
            case SELIC_BACEN: {
                tabela = IndiceSelicDiaria.obterTabela(periodo);
                break;
            }
            case TAXA_LEGAL: {
                tabela = JurosTaxaLegal.obterTabela(periodo);
                break;
            }
            case TRD_COMPOSTOS: 
            case TRD_SIMPLES: {
                tabela = IndiceTabelaUnicaJTDiario.obterTabela(periodo);
                break;
            }
            default: {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0031, "Tabela de juros '" + juros.getNome() + "' n\u00e3o dispon\u00edvel para essa vers\u00e3o"));
            }
        }
        return !tabela.isEmpty();
    }

    public PeriodoDeJuros calcularPeriodosDeJuros(Date data, Date dataFimVencimentoOcorrencia, boolean projetarData, boolean isMultaHonorario) {
        boolean isAtualizacao = HelperDate.dateAfter(this.periodoDeJuros.getInicial(), this.calculo.getDataDeLiquidacao());
        Date dataInicial = data;
        if (projetarData) {
            dataInicial = this.calcularDataInicialDoPrimeiroPeriodoDeJuros(data, dataFimVencimentoOcorrencia);
        } else {
            this.setDataInicialDeJuros(HelperDate.getInstance(data).addDay(-1).getDate());
        }
        PeriodoDeJuros periodoDeJuros = this.buscarPeriodoDeJuros(dataInicial);
        if (Utils.naoNulo(periodoDeJuros)) {
            boolean isSelicComMudanca;
            PeriodoDeJuros periodoInicial = periodoDeJuros.clone();
            boolean bl = isSelicComMudanca = this.isSelicIndiceNaLiquidacao() && this.existirCombinacaoNoMes(this.calculo.getDataDeLiquidacao());
            if ((!JurosEnum.SELIC.equals((Object)periodoDeJuros.getTabelaJuros()) || isSelicComMudanca || isMultaHonorario) && HelperDate.getInstance(dataInicial).greaterThenOrEquals(periodoInicial.getDataInicial())) {
                periodoInicial.setDataInicial(dataInicial);
            } else if (!isAtualizacao && JurosEnum.SELIC.equals((Object)periodoDeJuros.getTabelaJuros()) && HelperDate.dateEquals(HelperDate.getInstance(dataInicial).addDay(-1).getDate(), this.calculo.getDataAjuizamento())) {
                boolean isVencimentoNoAjuizamento;
                boolean bl2 = isVencimentoNoAjuizamento = Utils.naoNulo(dataFimVencimentoOcorrencia) && HelperDate.dateEquals(HelperDate.getCurrentCompetence(dataFimVencimentoOcorrencia).getDate(), HelperDate.getCurrentCompetence(this.calculo.getDataAjuizamento()).getDate());
                if (isVencimentoNoAjuizamento && !this.existirCombinacaoNoMes(this.calculo.getDataAjuizamento()) && !HelperDate.dateEquals(HelperDate.getCurrentCompetence(this.calculo.getDataAjuizamento()).lastDayOfTheMonth().getDate(), this.calculo.getDataAjuizamento())) {
                    return periodoDeJuros.getProximoPeriodo();
                }
                periodoInicial.setDataInicial(dataInicial);
            } else if (!isAtualizacao && JurosEnum.SELIC.equals((Object)periodoDeJuros.getTabelaJuros()) && HelperDate.getInstance(dataInicial).getDay() > 1 && !isMultaHonorario) {
                return periodoDeJuros.getProximoPeriodo();
            }
            periodoInicial.setProximoPeriodo(periodoDeJuros.getProximoPeriodo());
            return periodoInicial;
        }
        return null;
    }

    public PeriodoDeJuros calcularPeriodosDeJurosDoPagamento(Date data, Date dataFimVencimentoOcorrencia, boolean projetarData, boolean isMultaHonorario) {
        PeriodoDeJuros periodoDeJuros = this.calcularPeriodosDeJuros(data, dataFimVencimentoOcorrencia, projetarData, isMultaHonorario);
        if (Utils.naoNulos(periodoDeJuros, dataFimVencimentoOcorrencia) && HelperDate.dateAfter(periodoDeJuros.getDataFinal(), dataFimVencimentoOcorrencia) && !JurosEnum.SELIC.equals((Object)periodoDeJuros.getTabelaJuros())) {
            periodoDeJuros.setDataFinal(dataFimVencimentoOcorrencia);
        }
        return periodoDeJuros;
    }

    public BigDecimal calcularTaxaDeJuros(Date data) {
        return this.calcularTaxaDeJuros(data, null, true, false);
    }

    public BigDecimal calcularTaxaDeJurosDaAtualizacao(Date data) {
        return this.calcularTaxaDeJurosDaAtualizacao(data, null, true);
    }

    public Date getDataInicialDeJuros() {
        return this.dataInicialDeJuros;
    }

    public void setDataInicialDeJuros(Date dataInicialDeJuros) {
        this.dataInicialDeJuros = dataInicialDeJuros;
    }

    private boolean isJurosCompostos(JurosEnum tabelaDeJuros) {
        return JurosEnum.TRD_COMPOSTOS.equals((Object)tabelaDeJuros) || JurosEnum.SELIC_BACEN.equals((Object)tabelaDeJuros);
    }

    public BigDecimal calcularTaxaDeJuros(Date data, Date dataFimVencimentoOcorrencia, boolean projetarData, boolean isMultaHonorario) {
        Date diaAposDataInicioJuros;
        BigDecimal totalDeTaxa = BigDecimal.ZERO;
        PeriodoDeJuros periodoInicial = this.calcularPeriodosDeJuros(data, dataFimVencimentoOcorrencia, projetarData, isMultaHonorario);
        Date date = diaAposDataInicioJuros = this.getDataInicialDeJuros() == null ? null : HelperDate.getInstance(this.getDataInicialDeJuros()).addDay(1).getDate();
        if (Utils.nulo(periodoInicial)) {
            return totalDeTaxa;
        }
        BigDecimal acumuladoComposto = null;
        while (periodoInicial != null) {
            boolean isInicioAntesDoVencimento;
            boolean bl = isInicioAntesDoVencimento = Utils.naoNulo(diaAposDataInicioJuros) && HelperDate.dateBefore(periodoInicial.getDataInicial(), diaAposDataInicioJuros);
            if (isInicioAntesDoVencimento && HelperDate.dateAfterOrEquals(periodoInicial.getDataFinal(), diaAposDataInicioJuros)) {
                periodoInicial.setDataInicial(diaAposDataInicioJuros);
            } else if (isInicioAntesDoVencimento) {
                if (Utils.naoNulo(acumuladoComposto)) {
                    totalDeTaxa = totalDeTaxa.add(Utils.multiplicar(Utils.subtrair(acumuladoComposto, BigDecimal.ONE), Utils.CEM), Utils.CONTEXTO_MATEMATICO);
                    acumuladoComposto = null;
                }
                periodoInicial = periodoInicial.getProximoPeriodo();
                continue;
            }
            if (HelperDate.dateAfter(periodoInicial.getDataFinal(), this.calculo.getDataDeLiquidacao())) {
                PeriodoDeJuros periodoAuxiliar = periodoInicial.clone();
                periodoAuxiliar.setDataFinal(this.isSelicIndiceNaLiquidacao() ? HelperDate.getCurrentCompetence(this.calculo.getDataDeLiquidacao()).lastDayOfTheMonth().getDate() : this.calculo.getDataDeLiquidacao());
                if (this.isJurosCompostos(periodoInicial.getTabelaJuros())) {
                    acumuladoComposto = acumuladoComposto == null ? BigDecimal.ONE : acumuladoComposto;
                    acumuladoComposto = Utils.multiplicar(acumuladoComposto, periodoAuxiliar.getAliquota(), acumuladoComposto);
                } else {
                    totalDeTaxa = totalDeTaxa.add(periodoAuxiliar.getTaxa(), Utils.CONTEXTO_MATEMATICO);
                }
            } else if (this.isJurosCompostos(periodoInicial.getTabelaJuros())) {
                acumuladoComposto = acumuladoComposto == null ? BigDecimal.ONE : acumuladoComposto;
                acumuladoComposto = Utils.multiplicar(acumuladoComposto, periodoInicial.getAliquota(), acumuladoComposto);
            } else {
                totalDeTaxa = totalDeTaxa.add(periodoInicial.getTaxa(), Utils.CONTEXTO_MATEMATICO);
            }
            JurosEnum anterior = periodoInicial.getTabelaJuros();
            if ((periodoInicial = periodoInicial.getProximoPeriodo()) != null && anterior.equals((Object)periodoInicial.getTabelaJuros()) || !Utils.naoNulo(acumuladoComposto)) continue;
            totalDeTaxa = totalDeTaxa.add(Utils.multiplicar(Utils.subtrair(acumuladoComposto, BigDecimal.ONE), Utils.CEM), Utils.CONTEXTO_MATEMATICO);
            acumuladoComposto = null;
        }
        return totalDeTaxa;
    }

    public BigDecimal calcularTaxaDeJurosDaAtualizacao(Date data, Date dataFimVencimentoOcorrencia, boolean projetarData) {
        BigDecimal totalDeTaxa = BigDecimal.ZERO;
        PeriodoDeJuros periodoInicial = this.calcularPeriodosDeJurosDoPagamento(data, dataFimVencimentoOcorrencia, projetarData, false);
        if (Utils.naoNulo(periodoInicial)) {
            while (Utils.naoNulo(periodoInicial)) {
                if (HelperDate.dateAfter(periodoInicial.getDataFinal(), this.dataEvento)) {
                    PeriodoDeJuros periodoAuxiliar = periodoInicial.clone();
                    periodoAuxiliar.setDataFinal(this.dataEvento);
                    totalDeTaxa = totalDeTaxa.add(periodoAuxiliar.getTaxa(), Utils.CONTEXTO_MATEMATICO);
                } else {
                    totalDeTaxa = totalDeTaxa.add(periodoInicial.getTaxa(), Utils.CONTEXTO_MATEMATICO);
                }
                periodoInicial = periodoInicial.getProximoPeriodo();
            }
        }
        return totalDeTaxa;
    }

    public BigDecimal calcularTaxaDeJurosPagamento(Date data, Date dataFinal, boolean projetarData, boolean isMultaHonorario) {
        BigDecimal totalDeTaxa = BigDecimal.ZERO;
        Date dataDeInicio = data;
        PeriodoDeJuros periodoInicial = this.calcularPeriodosDeJurosDoPagamento(dataDeInicio, dataFinal, projetarData, isMultaHonorario);
        BigDecimal acumuladoComposto = null;
        while (periodoInicial != null) {
            if (!JurosEnum.SELIC.equals((Object)periodoInicial.getTabelaJuros()) && HelperDate.dateAfter(periodoInicial.getDataFinal(), dataFinal)) {
                PeriodoDeJuros periodoAuxiliar = periodoInicial.clone();
                periodoAuxiliar.setDataFinal(dataFinal);
                if (this.isJurosCompostos(periodoInicial.getTabelaJuros())) {
                    acumuladoComposto = acumuladoComposto == null ? BigDecimal.ONE : acumuladoComposto;
                    acumuladoComposto = Utils.multiplicar(acumuladoComposto, periodoAuxiliar.getAliquota(), acumuladoComposto);
                } else {
                    totalDeTaxa = totalDeTaxa.add(periodoAuxiliar.getTaxa(), Utils.CONTEXTO_MATEMATICO);
                }
            } else if (this.isJurosCompostos(periodoInicial.getTabelaJuros())) {
                acumuladoComposto = acumuladoComposto == null ? BigDecimal.ONE : acumuladoComposto;
                acumuladoComposto = Utils.multiplicar(acumuladoComposto, periodoInicial.getAliquota(), acumuladoComposto);
            } else {
                totalDeTaxa = totalDeTaxa.add(periodoInicial.getTaxa(), Utils.CONTEXTO_MATEMATICO);
            }
            JurosEnum anterior = periodoInicial.getTabelaJuros();
            if ((periodoInicial = periodoInicial.getProximoPeriodo()) != null && anterior.equals((Object)periodoInicial.getTabelaJuros()) || !Utils.naoNulo(acumuladoComposto)) continue;
            totalDeTaxa = totalDeTaxa.add(Utils.multiplicar(Utils.subtrair(acumuladoComposto, BigDecimal.ONE), Utils.CEM), Utils.CONTEXTO_MATEMATICO);
            acumuladoComposto = null;
        }
        return totalDeTaxa;
    }

    private boolean isSelicIndiceNaLiquidacao() {
        boolean ehSelic = false;
        ParametrosDeAtualizacao parametros = this.getCalculo().getParametrosDeAtualizacao();
        if (JurosEnum.SELIC.equals((Object)parametros.getJuros())) {
            ehSelic = true;
        }
        Date dataLiquidacao = this.getCalculo().getDataDeLiquidacao();
        if (parametros.getCombinarOutroJuros().booleanValue()) {
            for (CombinacaoDeJuros comb : parametros.getListaDeCombinacaoDeJuros()) {
                if (!HelperDate.dateBeforeOrEquals(comb.getApartirDeOutroJuros(), dataLiquidacao)) continue;
                ehSelic = JurosEnum.SELIC.equals((Object)comb.getOutroJuros());
            }
        }
        return ehSelic;
    }

    public boolean isSelicIndiceNoAjuizamentoSemCombinacao() {
        return TabelaDeJuros.isSelicIndiceNoAjuizamentoSemCombinacao(this.getCalculo().getParametrosDeAtualizacao(), this.getCalculo().getDataAjuizamento());
    }

    public static boolean isSelicIndiceNoAjuizamentoSemCombinacao(ParametrosDeAtualizacao parametros, Date dataAjuizamento) {
        boolean isSelic = false;
        boolean temCombinacao = false;
        if (JurosEnum.SELIC.equals((Object)parametros.getJuros())) {
            isSelic = true;
        }
        if (parametros.getCombinarOutroJuros().booleanValue()) {
            for (CombinacaoDeJuros comb : parametros.getListaDeCombinacaoDeJuros()) {
                if (HelperDate.dateBeforeOrEquals(comb.getApartirDeOutroJuros(), dataAjuizamento)) {
                    isSelic = JurosEnum.SELIC.equals((Object)comb.getOutroJuros());
                }
                if (!HelperDate.dateEquals(HelperDate.getCurrentCompetence(dataAjuizamento).getDate(), HelperDate.getCurrentCompetence(comb.getApartirDeOutroJuros()).getDate())) continue;
                temCombinacao = true;
            }
        }
        return isSelic && !temCombinacao;
    }

    public void limpar() {
        this.periodoDeJurosInicial = null;
    }

    public Periodo getPeriodoDeJuros() {
        return this.periodoDeJuros;
    }

    public void imprimirPeriodosDeJuros() {
        PeriodoDeJuros periodoInicial = this.periodoDeJurosInicial;
        if (Utils.naoNulo(periodoInicial)) {
            while (Utils.naoNulo(periodoInicial)) {
                this.log.info((Object)String.format("%s - %s, %s, %s", HelperDate.getInstance(periodoInicial.getDataInicial()).format("dd/MM/yyyy"), HelperDate.getInstance(periodoInicial.getDataFinal()).format("dd/MM/yyyy"), Utils.naoNulo(periodoInicial.getTaxa()) ? periodoInicial.getTaxa().toString() : "", Utils.naoNulo(periodoInicial.getMeses()) ? periodoInicial.getMeses().toString() : ""), new Object[0]);
                periodoInicial = periodoInicial.getProximoPeriodo();
            }
        }
    }
}

