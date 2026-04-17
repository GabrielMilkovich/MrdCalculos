/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculadorDeIndices;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndicesAcumuladosEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.OcorrenciaDePagamentoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.CombinacaoDeIndice;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceSemCorrecao;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.dfp.IndiceDevedorFazenda;
import br.jus.trt8.pjecalc.negocio.dominio.indices.igpm.IndiceIGPM;
import br.jus.trt8.pjecalc.negocio.dominio.indices.inpc.IndiceINPC;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipc.IndiceIPC;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipca.IndiceIPCA;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipcae.IndiceIPCAE;
import br.jus.trt8.pjecalc.negocio.dominio.indices.ipcatr.IndiceIPCAETR;
import br.jus.trt8.pjecalc.negocio.dominio.indices.it.IndiceIndebitoTributario;
import br.jus.trt8.pjecalc.negocio.dominio.indices.jam.IndiceJAM;
import br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicDiaria;
import br.jus.trt8.pjecalc.negocio.dominio.indices.selic.IndiceSelicFazenda;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaDebitoTrabalhista;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTDiario;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tabelaunica.IndiceTabelaUnicaJTMensal;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tr.IndiceTR;
import br.jus.trt8.pjecalc.negocio.dominio.juros.selicirpf.JurosSelicParaCorrecao;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CreditosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculoDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetariaUtils;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

public class TabelaDeCorrecaoMonetaria {
    private static final int DIAS_A_MAIS_VENCIMENTO_RESCISORIAS = 10;
    private static final int DIARIA_DIARIA = 1;
    private static final int DIARIA_NAODIARIA = 2;
    private static final int NAODIARIA_DIARIA = 3;
    private static final int NAODIARIA_NAODIARIA = 4;
    private static final int ANO_1986 = 1986;
    private static final int ANO_1989 = 1989;
    private static final int ANO_1991 = 1991;
    private static final int ANO_1993 = 1993;
    private static final int ANO_1994 = 1994;
    private static final String MASCARA_DIA = "ddMMyyyy";
    private HelperDate competencia = HelperDate.getInstance();
    private Map<String, BigDecimal> tabela;
    private IndicesAcumuladosEnum indicesAcumulados;
    private OcorrenciaDePagamentoEnum ocorrenciaDePagamento;
    private IndiceMonetarioEnum indice;
    private Boolean ignorarTaxaCorrecaoNegativa;
    private Boolean indiceDiario;
    private HelperDate dataFinalDoPeriodo = HelperDate.getInstance();
    private Boolean ehMultaFGTS;
    private boolean ehOcorrenciaSeguroDesemprego;
    private boolean isFixoMesVencimento;
    private Date dataAPartirDeOutroIndice;
    private IndiceMonetarioEnum outroIndice;
    private boolean isIndiceTrabalhista;
    private boolean outroIndiceEhDiario;
    private ServicoDeCalculo servicoDeCalculo;
    private ParametrosDeAtualizacao parametrosAtualizacao;
    private Periodo periodoDaTabelaAtual;
    private MaquinaDeCalculoDeCorrecaoMonetaria maquinaDeCalculoDeCorrecaoMonetaria;
    private Boolean origemCalculo;
    private Date dataLiquidacao;
    private Boolean existeIndiceDiarioNaCombinacao;

    public TabelaDeCorrecaoMonetaria() {
    }

    public TabelaDeCorrecaoMonetaria(IndiceMonetarioEnum indice, IndicesAcumuladosEnum indicesAcumulados, Boolean ignorarTaxaCorrecaoNegativa) {
        this(indice, indicesAcumulados, null, ignorarTaxaCorrecaoNegativa);
    }

    public TabelaDeCorrecaoMonetaria(boolean isIndiceTrabalhista, IndiceMonetarioEnum indice, IndicesAcumuladosEnum indicesAcumulados, Boolean ignorarTaxaCorrecaoNegativa) {
        this(isIndiceTrabalhista, indice, indicesAcumulados, null, ignorarTaxaCorrecaoNegativa);
    }

    public TabelaDeCorrecaoMonetaria(boolean isIndiceTrabalhista, IndiceMonetarioEnum indice, IndicesAcumuladosEnum indicesAcumulados, OcorrenciaDePagamentoEnum ocorrenciaDePagamento, Boolean ignorarTaxaCorrecaoNegativa) {
        this.servicoDeCalculo = ServicoDeCalculo.getInstancia();
        this.tabela = new HashMap<String, BigDecimal>();
        this.indice = indice;
        this.indicesAcumulados = indicesAcumulados;
        this.ocorrenciaDePagamento = ocorrenciaDePagamento;
        this.ignorarTaxaCorrecaoNegativa = ignorarTaxaCorrecaoNegativa;
        this.ehMultaFGTS = false;
        this.ehOcorrenciaSeguroDesemprego = false;
        this.isIndiceTrabalhista = isIndiceTrabalhista;
        this.indiceDiario = this.isIndiceDiario(indice);
        this.origemCalculo = null;
        this.isFixoMesVencimento = false;
    }

    public TabelaDeCorrecaoMonetaria(IndiceMonetarioEnum indice, IndicesAcumuladosEnum indicesAcumulados, OcorrenciaDePagamentoEnum ocorrenciaDePagamento, Boolean ignorarTaxaCorrecaoNegativa) {
        this(Boolean.TRUE, indice, indicesAcumulados, ocorrenciaDePagamento, ignorarTaxaCorrecaoNegativa);
    }

    public void marcaComoMultaFGTS() {
        this.ehMultaFGTS = true;
    }

    public void marcaComoCorrecaoSeguroDesemprego() {
        this.ehOcorrenciaSeguroDesemprego = true;
    }

    public void marcaInicioFixoMesVencimento() {
        this.isFixoMesVencimento = true;
    }

    public void excluirCompetencia(HelperDate competencia) {
        if (Utils.naoNulo(this.tabela.get(competencia.format(MASCARA_DIA)))) {
            this.tabela.remove(competencia.format(MASCARA_DIA));
        }
    }

    protected List<? extends IndiceDeCalculo> obterIndicesDeCalculo(IndiceMonetarioEnum indiceMonetario, Periodo periodo) {
        if (Utils.nulo((Object)indiceMonetario)) {
            return new ArrayList();
        }
        Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
        List<? extends IndiceDeCalculo> tabelaDeIndices = this.obterTabelaDeIndicesPorPeriodo(calculo, indiceMonetario, periodo);
        Date dataLiquidacao = Utils.naoNulo(this.dataLiquidacao) ? this.dataLiquidacao : (IndicesAcumuladosEnum.ATUALIZACAO_CALCULO.equals((Object)this.indicesAcumulados) ? calculo.getAtualizacao().getDataDeLiquidacao() : calculo.getDataDeLiquidacao());
        tabelaDeIndices = CalculadorDeIndices.revisarConversaoInicial(tabelaDeIndices, dataLiquidacao);
        if (this.ignorarTaxaCorrecaoNegativa.booleanValue() && !IndiceMonetarioEnum.SELIC.equals((Object)indiceMonetario) && !IndiceMonetarioEnum.SELIC_FAZENDA.equals((Object)indiceMonetario)) {
            tabelaDeIndices = CalculadorDeIndices.obterTabelaDeIndicesIgnorandoTaxasNegativas(tabelaDeIndices);
        }
        return tabelaDeIndices;
    }

    public List<? extends IndiceDeCalculo> obterTabelaDeIndicesPorPeriodo(Calculo calculo, IndiceMonetarioEnum indiceMonetario, Periodo periodo) {
        switch (indiceMonetario) {
            case SEM_CORRECAO: {
                return IndiceSemCorrecao.obterTabela(periodo);
            }
            case IGPM: {
                return IndiceIGPM.obterTabela(periodo);
            }
            case INPC: {
                return IndiceINPC.obterTabela(periodo);
            }
            case IPC: {
                return IndiceIPC.obterTabela(periodo);
            }
            case IPCA: {
                return IndiceIPCA.obterTabela(periodo);
            }
            case IPCAE: {
                return IndiceIPCAE.obterTabela(periodo);
            }
            case TABELA_DEVEDOR_FAZENDA: {
                return IndiceDevedorFazenda.obterTabela(periodo);
            }
            case TABELA_INDEBITO_TRIBUTARIO: {
                return IndiceIndebitoTributario.obterTabela(periodo);
            }
            case IPCAETR: {
                return IndiceIPCAETR.obterTabela(periodo);
            }
            case TABELA_UNICA_JT_DIARIO: {
                return IndiceTabelaUnicaJTDiario.obterTabela(periodo);
            }
            case TABELA_UNICA_JT_MENSAL: {
                return IndiceTabelaUnicaJTMensal.obterTabela(periodo);
            }
            case TUACDT: {
                return IndiceTabelaUnicaDebitoTrabalhista.obterTabela(periodo);
            }
            case TR: {
                return IndiceTR.obterTabela(periodo);
            }
            case JAM: {
                return IndiceJAM.obterTabela(periodo);
            }
            case SELIC: {
                return JurosSelicParaCorrecao.obterTabelaParaCorrecao(periodo, calculo, this.ignorarTaxaCorrecaoNegativa, this.origemCalculo);
            }
            case SELIC_BACEN: {
                return IndiceSelicDiaria.obterTabela(periodo);
            }
            case SELIC_FAZENDA: {
                return IndiceSelicFazenda.obterTabela(periodo);
            }
        }
        throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0031, "Tabela de \u00edndices '" + indiceMonetario.getNome() + "' n\u00e3o dispon\u00edvel para essa vers\u00e3o"));
    }

    public void carregarTabelaTrabalhistaCombinadaParaFgts(Periodo periodo, Calculo calculo) {
        this.carregarTabela(periodo);
        Periodo mesDaDemissao = new Periodo(HelperDate.getCurrentCompetence(calculo.getDataDemissao()).getDate(), HelperDate.getInstance(calculo.getDataDemissao()).lastDayOfTheMonth().getDate());
        IndiceMonetarioEnum indiceUnicoNoMesDaDemissao = TabelaDeCorrecaoMonetariaUtils.verificarSeExisteIndiceUnicoNaDemissao(calculo);
        List<Object> indices = new ArrayList();
        if (mesDaDemissao.isPeriodoContemEsta(periodo.getInicial()) && Utils.naoNulo((Object)indiceUnicoNoMesDaDemissao) && !(indices = this.obterIndicesDeCalculo(indiceUnicoNoMesDaDemissao, mesDaDemissao)).isEmpty()) {
            IndiceDeCalculo indiceMesDemissao = (IndiceDeCalculo)indices.get(0);
            long qtdDias = mesDaDemissao.totalDeDias();
            BigDecimal indiceDiarioTrabalhistaMesDemissao = new BigDecimal(Math.pow(indiceMesDemissao.getValorIndice().doubleValue(), 1.0 / (double)qtdDias));
            long qtdDiasDepoisMudanca = HelperDate.countDays(periodo.getInicial(), mesDaDemissao.getFinal()) + 1L;
            BigDecimal indiceTrabalhistaAcumulado = this.tabela.get(this.competencia.setDate(HelperDate.getInstance(mesDaDemissao.getFinal()).addDay(1).getDate()).format(MASCARA_DIA));
            if (Utils.nulo(indiceTrabalhistaAcumulado)) {
                indiceTrabalhistaAcumulado = BigDecimal.ONE;
            }
            HelperDate ultimoDiaMesDemissao = HelperDate.getInstance(mesDaDemissao.getFinal());
            while (qtdDiasDepoisMudanca > 0L) {
                indiceTrabalhistaAcumulado = Utils.multiplicar(indiceTrabalhistaAcumulado, indiceDiarioTrabalhistaMesDemissao);
                this.tabela.put(this.competencia.setDate(ultimoDiaMesDemissao.getDate()).format(MASCARA_DIA), indiceTrabalhistaAcumulado);
                --qtdDiasDepoisMudanca;
                ultimoDiaMesDemissao.addDay(-1);
            }
        }
    }

    protected boolean isIndiceDiario(IndiceMonetarioEnum indice) {
        return IndiceMonetarioEnum.JAM.equals((Object)indice) || IndiceMonetarioEnum.TABELA_UNICA_JT_DIARIO.equals((Object)indice) || IndiceMonetarioEnum.SELIC_BACEN.equals((Object)indice) || IndiceMonetarioEnum.TUACDT.equals((Object)indice);
    }

    public void carregarTabela(Periodo periodo) {
        if (Utils.naoNulo(this.periodoDaTabelaAtual)) {
            if (HelperDate.dateEquals(periodo.getFinal(), this.periodoDaTabelaAtual.getFinal()) && HelperDate.dateAfterOrEquals(periodo.getInicial(), this.periodoDaTabelaAtual.getInicial())) {
                return;
            }
            this.tabela = new HashMap<String, BigDecimal>();
            this.periodoDaTabelaAtual = periodo;
        } else {
            this.periodoDaTabelaAtual = periodo;
        }
        this.parametrosAtualizacao = this.servicoDeCalculo.obterCalculoAberto().getParametrosDeAtualizacao();
        List<Object> outrosIndices = new ArrayList();
        List<Object> indices = new ArrayList();
        boolean montarTabelaCombinada = false;
        indices = this.obterIndicesDeCalculo(this.indice, periodo);
        if (!this.isIndiceTrabalhista || !this.parametrosAtualizacao.getCombinarOutroIndice().booleanValue()) {
            this.montarTabela(periodo, indices, outrosIndices, montarTabelaCombinada, new TreeSet<CombinacaoDeIndice>());
            this.dataFinalDoPeriodo.setDate(periodo.getFinal());
            this.maquinaDeCalculoDeCorrecaoMonetaria.ajustarTabelaSelicFazenda(this.tabela, this.periodoDaTabelaAtual);
            return;
        }
        this.outroIndice = this.parametrosAtualizacao.getOutroIndiceTrabalhista();
        this.dataAPartirDeOutroIndice = this.parametrosAtualizacao.getApartirDeOutroIndice();
        TreeSet combinacoesDeIndices = (TreeSet)ParametrosDeAtualizacaoUtils.montarAsCombinacoesDeIndices(this.parametrosAtualizacao, this.periodoDaTabelaAtual.getFinal());
        if (!(this.outroIndice != null && this.dataAPartirDeOutroIndice != null || combinacoesDeIndices.isEmpty())) {
            this.outroIndice = ((CombinacaoDeIndice)combinacoesDeIndices.iterator().next()).getOutroIndiceTrabalhista();
            this.dataAPartirDeOutroIndice = ((CombinacaoDeIndice)combinacoesDeIndices.iterator().next()).getApartirDeOutroIndice();
        }
        montarTabelaCombinada = true;
        if (combinacoesDeIndices.size() == 1) {
            if (HelperDate.dateBefore(HelperDate.getCurrentCompetence(periodo.getInicial()).getDate(), this.dataAPartirDeOutroIndice)) {
                this.outroIndiceEhDiario = this.isIndiceDiario(this.outroIndice);
                outrosIndices = this.obterIndicesDeCalculo(this.outroIndice, new Periodo(this.dataAPartirDeOutroIndice, periodo.getFinal()));
                indices = this.obterIndicesDeCalculo(this.indice, new Periodo(periodo.getInicial(), HelperDate.getInstance(this.dataAPartirDeOutroIndice).addDay(-1).getDate()));
            } else {
                montarTabelaCombinada = false;
                indices = this.obterIndicesDeCalculo(this.outroIndice, periodo);
            }
            this.montarTabela(periodo, indices, outrosIndices, montarTabelaCombinada, new TreeSet<CombinacaoDeIndice>());
        } else if (combinacoesDeIndices.size() > 1) {
            CombinacaoDeIndice anterior = null;
            int numeroCombinacoesParaIgnorar = 0;
            for (CombinacaoDeIndice ind : combinacoesDeIndices.descendingSet()) {
                if (numeroCombinacoesParaIgnorar > 0) {
                    anterior = ind;
                    --numeroCombinacoesParaIgnorar;
                    continue;
                }
                CombinacaoDeIndice proximo = combinacoesDeIndices.lower(ind);
                Set<CombinacaoDeIndice> combinacoesAdicionaisNoMesmoMes = TabelaDeCorrecaoMonetariaUtils.encontrarCombinacoesAdicionaisNoMesmoMes(ind, combinacoesDeIndices);
                numeroCombinacoesParaIgnorar = combinacoesAdicionaisNoMesmoMes.size();
                for (int i = 0; i < numeroCombinacoesParaIgnorar; ++i) {
                    proximo = combinacoesDeIndices.lower(proximo);
                }
                this.indice = proximo == null ? this.parametrosAtualizacao.getIndiceTrabalhista() : proximo.getOutroIndiceTrabalhista();
                this.outroIndice = ind.getOutroIndiceTrabalhista();
                this.dataAPartirDeOutroIndice = ind.getApartirDeOutroIndice();
                this.indiceDiario = this.isIndiceDiario(this.indice);
                this.outroIndiceEhDiario = this.isIndiceDiario(this.outroIndice);
                this.montarTabelaCombinada(outrosIndices, indices, proximo, anterior, periodo, combinacoesAdicionaisNoMesmoMes);
                anterior = ind;
            }
        } else {
            montarTabelaCombinada = false;
            this.montarTabela(periodo, indices, outrosIndices, montarTabelaCombinada, new TreeSet<CombinacaoDeIndice>());
        }
        this.dataFinalDoPeriodo.setDate(periodo.getFinal());
        if (Utils.naoNulo(this.maquinaDeCalculoDeCorrecaoMonetaria)) {
            this.maquinaDeCalculoDeCorrecaoMonetaria.ajustarTabelaSelicFazenda(this.tabela, this.periodoDaTabelaAtual);
        }
    }

    private void montarTabelaCombinada(List<? extends IndiceDeCalculo> outrosIndices, List<? extends IndiceDeCalculo> indices, CombinacaoDeIndice proximo, CombinacaoDeIndice anterior, Periodo periodo, Set<CombinacaoDeIndice> combinacoesAdicionaisNoMesmoMes) {
        Periodo pIndice = new Periodo(proximo == null ? periodo.getInicial() : proximo.getApartirDeOutroIndice(), HelperDate.getInstance(this.dataAPartirDeOutroIndice).addDay(-1).getDate());
        Periodo pOutroIndice = new Periodo(this.dataAPartirDeOutroIndice, anterior == null ? periodo.getFinal() : HelperDate.getInstance(anterior.getApartirDeOutroIndice()).addDay(-1).getDate());
        if (pIndice.getFinal().before(this.periodoDaTabelaAtual.getInicial()) || pIndice.getInicial().after(this.periodoDaTabelaAtual.getFinal())) {
            indices = new ArrayList<IndiceDeCalculo>();
        } else {
            pIndice.setInicial(pIndice.getInicial().before(this.periodoDaTabelaAtual.getInicial()) ? this.periodoDaTabelaAtual.getInicial() : pIndice.getInicial());
            pIndice.setFinal(pIndice.getFinal().after(this.periodoDaTabelaAtual.getFinal()) ? this.periodoDaTabelaAtual.getFinal() : pIndice.getFinal());
            indices = this.obterIndicesDeCalculo(this.indice, pIndice);
        }
        if (pOutroIndice.getFinal().before(this.periodoDaTabelaAtual.getInicial()) || pOutroIndice.getInicial().after(this.periodoDaTabelaAtual.getFinal())) {
            outrosIndices = new ArrayList<IndiceDeCalculo>();
        } else {
            pOutroIndice.setInicial(pOutroIndice.getInicial().before(this.periodoDaTabelaAtual.getInicial()) ? this.periodoDaTabelaAtual.getInicial() : pOutroIndice.getInicial());
            pOutroIndice.setFinal(pOutroIndice.getFinal().after(this.periodoDaTabelaAtual.getFinal()) ? this.periodoDaTabelaAtual.getFinal() : pOutroIndice.getFinal());
            outrosIndices = this.obterIndicesDeCalculo(this.outroIndice, pOutroIndice);
        }
        Periodo periodoMontado = new Periodo(pIndice.getInicial(), pOutroIndice.getFinal());
        if (!indices.isEmpty() && outrosIndices.isEmpty()) {
            periodoMontado = new Periodo(pIndice.getInicial(), pIndice.getFinal());
        } else if (indices.isEmpty() && !outrosIndices.isEmpty()) {
            periodoMontado = new Periodo(pOutroIndice.getInicial(), pOutroIndice.getFinal());
        }
        if (!indices.isEmpty() || !outrosIndices.isEmpty()) {
            this.montarTabela(periodoMontado, indices, outrosIndices, true, combinacoesAdicionaisNoMesmoMes);
        }
    }

    private void montarTabela(Periodo periodo, List<? extends IndiceDeCalculo> indices, List<? extends IndiceDeCalculo> outrosIndices, boolean montarTabelaCombinada, Set<CombinacaoDeIndice> combinacoesAdicionaisNoMesmoMes) {
        this.maquinaDeCalculoDeCorrecaoMonetaria = new MaquinaDeCalculoDeCorrecaoMonetaria(this);
        if (montarTabelaCombinada) {
            if (this.indiceDiario.booleanValue() && !this.outroIndiceEhDiario) {
                this.combinarIndiceDiarioComOutroIndiceNaoDiario(periodo, indices, outrosIndices, combinacoesAdicionaisNoMesmoMes);
            } else if (!this.indiceDiario.booleanValue() && this.outroIndiceEhDiario) {
                this.combinarIndiceNaoDiarioComOutroIndiceDiario(periodo, indices, outrosIndices, combinacoesAdicionaisNoMesmoMes);
            } else if (this.indiceDiario.booleanValue()) {
                this.combinarIndiceDiarioComOutroIndiceDiario(periodo, indices, outrosIndices, combinacoesAdicionaisNoMesmoMes);
            } else {
                this.combinarIndiceNaoDiarioComOutroIndiceNaoDiario(periodo, indices, outrosIndices, combinacoesAdicionaisNoMesmoMes, this.maquinaDeCalculoDeCorrecaoMonetaria.verificarSeExisteIndiceDiarioNas(combinacoesAdicionaisNoMesmoMes));
            }
        } else {
            for (IndiceDeCalculo indiceDeCalculo : indices) {
                if (!Utils.naoNulo(indiceDeCalculo)) continue;
                this.tabela.put(this.competencia.setDate(indiceDeCalculo.getCompetencia()).format(MASCARA_DIA), indiceDeCalculo.getValorAcumulado());
            }
        }
    }

    /*
     * WARNING - void declaration
     */
    private void combinarIndiceNaoDiarioComOutroIndiceNaoDiario(Periodo periodo, List<? extends IndiceDeCalculo> indices, List<? extends IndiceDeCalculo> outrosIndices, Set<CombinacaoDeIndice> combinacoesAdicionaisNoMesmoMes, boolean existeIndiceDiarioNasCombinacoesAdicionais) {
        BigDecimal acumuladoAPartirDoMesDaMudanca;
        int size = outrosIndices.size();
        HelperDate competenciaMesDaMudanca = HelperDate.getCurrentCompetence(this.dataAPartirDeOutroIndice);
        BigDecimal indiceAcumuladoDepoisDoMesDaMudanca = TabelaDeCorrecaoMonetariaUtils.encontrarIndiceAcumuladoAposMudanca(outrosIndices);
        boolean isIndiceSELIC = IndiceMonetarioEnum.SELIC.equals((Object)this.indice) || IndiceMonetarioEnum.SELIC_FAZENDA.equals((Object)this.indice);
        boolean isOutroIndiceSELIC = IndiceMonetarioEnum.SELIC.equals((Object)this.outroIndice) || IndiceMonetarioEnum.SELIC_FAZENDA.equals((Object)this.outroIndice);
        BigDecimal indiceOutrosIndicesMesMudanca = BigDecimal.ONE;
        if (!outrosIndices.isEmpty() && Utils.naoNulo(outrosIndices.get(size - 1)) && isOutroIndiceSELIC) {
            BigDecimal fatorConversaoDuranteSelic = BigDecimal.ONE;
            if (HelperDate.dateEquals(competenciaMesDaMudanca.getDate(), this.dataAPartirDeOutroIndice)) {
                fatorConversaoDuranteSelic = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(outrosIndices.get(size - 1).getCompetencia(), outrosIndices.get(0).getCompetencia());
            }
            indiceOutrosIndicesMesMudanca = Utils.multiplicar(outrosIndices.get(size - 1).getValorIndice(), fatorConversaoDuranteSelic);
        } else if (!outrosIndices.isEmpty() && Utils.naoNulo(outrosIndices.get(size - 1))) {
            indiceOutrosIndicesMesMudanca = Utils.dividir(outrosIndices.get(size - 1).getValorAcumulado(), indiceAcumuladoDepoisDoMesDaMudanca);
        } else {
            BigDecimal fatorConversaoMesMudanca = Utils.dividir(BigDecimal.ONE, this.tratarConversaoSemCorrecaoMensal(HelperDate.getCurrentCompetence(this.dataAPartirDeOutroIndice), BigDecimal.ONE));
            indiceOutrosIndicesMesMudanca = Utils.multiplicar(indiceOutrosIndicesMesMudanca, fatorConversaoMesMudanca);
        }
        BigDecimal indiceIndicesMesMudanca = BigDecimal.ONE;
        if (!indices.isEmpty() && Utils.naoNulo(indices.get(0))) {
            indiceIndicesMesMudanca = indices.get(0).getValorAcumulado();
        }
        BigDecimal valorIndice = BigDecimal.ONE;
        for (IndiceDeCalculo indiceDeCalculo : outrosIndices) {
            if (!Utils.naoNulo(indiceDeCalculo)) continue;
            valorIndice = indiceDeCalculo.getValorAcumulado();
            String chave = this.competencia.setDate(indiceDeCalculo.getCompetencia()).format(MASCARA_DIA);
            if (!this.tabela.containsKey(chave)) {
                this.tabela.put(chave, valorIndice);
                continue;
            }
            String string = HelperDate.getInstance(competenciaMesDaMudanca.getDate()).addMonth(1).format(MASCARA_DIA);
            indiceAcumuladoDepoisDoMesDaMudanca = this.tabela.get(string);
        }
        if (existeIndiceDiarioNasCombinacoesAdicionais) {
            Map<String, BigDecimal> map = this.maquinaDeCalculoDeCorrecaoMonetaria.preencherTabelaDiariaDoMesDasCombinacoes(4, periodo, competenciaMesDaMudanca, indiceOutrosIndicesMesMudanca, indiceIndicesMesMudanca, combinacoesAdicionaisNoMesmoMes, indiceAcumuladoDepoisDoMesDaMudanca);
            for (Map.Entry entry : map.entrySet()) {
                this.tabela.put((String)entry.getKey(), (BigDecimal)entry.getValue());
            }
            acumuladoAPartirDoMesDaMudanca = this.tabela.get(this.competencia.setDate(competenciaMesDaMudanca.getDate()).format(MASCARA_DIA));
        } else {
            BigDecimal bigDecimal = this.maquinaDeCalculoDeCorrecaoMonetaria.encontrarIndiceProporcionalMesMudanca(competenciaMesDaMudanca, indiceOutrosIndicesMesMudanca, indiceIndicesMesMudanca, combinacoesAdicionaisNoMesmoMes);
            if (isOutroIndiceSELIC) {
                BigDecimal fatorConversaoDepoisMudanca = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(HelperDate.getCurrentCompetence(this.dataAPartirDeOutroIndice).addMonth(1).setDay(1).getDate(), this.periodoDaTabelaAtual.getFinal());
                BigDecimal bigDecimal2 = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(HelperDate.getCurrentCompetence(this.dataAPartirDeOutroIndice).getDate(), this.periodoDaTabelaAtual.getFinal());
                BigDecimal fatorConversaoMesMudanca = Utils.dividir(BigDecimal.ONE, this.tratarConversaoSemCorrecaoMensal(HelperDate.getCurrentCompetence(this.dataAPartirDeOutroIndice), BigDecimal.ONE));
                BigDecimal bigDecimal3 = Utils.dividir(indiceAcumuladoDepoisDoMesDaMudanca, fatorConversaoDepoisMudanca);
                acumuladoAPartirDoMesDaMudanca = Utils.multiplicar(Utils.somar(Utils.dividir(bigDecimal, fatorConversaoMesMudanca), Utils.subtrair(bigDecimal3, BigDecimal.ONE)), bigDecimal2);
            } else {
                acumuladoAPartirDoMesDaMudanca = Utils.multiplicar(bigDecimal, indiceAcumuladoDepoisDoMesDaMudanca);
            }
            if (periodo.isPeriodoContemEsta(this.dataAPartirDeOutroIndice)) {
                this.tabela.put(this.competencia.setDate(competenciaMesDaMudanca.getDate()).format(MASCARA_DIA), acumuladoAPartirDoMesDaMudanca);
            }
        }
        BigDecimal fatorConversaoAposSelic = ConversaoDeMoedas.encontrarFatorConversaoParaMudancaDeMoedas(this.dataAPartirDeOutroIndice, this.dataFinalDoPeriodo.getDate());
        Map<Date, BigDecimal> map = ConversaoDeMoedas.encontrarCompetenciasDeConversaoParaMudancaDeMoedas(periodo.getInicial(), HelperDate.getInstance(this.dataAPartirDeOutroIndice).addDay(-1).getDate());
        if (isIndiceSELIC) {
            BigDecimal bigDecimal = Utils.subtrair(acumuladoAPartirDoMesDaMudanca, Utils.multiplicar(indiceIndicesMesMudanca, fatorConversaoAposSelic));
        } else {
            BigDecimal bigDecimal = Utils.dividir(acumuladoAPartirDoMesDaMudanca, indiceIndicesMesMudanca);
        }
        if (HelperDate.dateEquals(competenciaMesDaMudanca.getDate(), this.dataAPartirDeOutroIndice) && isIndiceSELIC) {
            BigDecimal bigDecimal = Utils.subtrair(acumuladoAPartirDoMesDaMudanca, Utils.multiplicar(BigDecimal.ONE, fatorConversaoAposSelic));
        } else if (HelperDate.dateEquals(competenciaMesDaMudanca.getDate(), this.dataAPartirDeOutroIndice)) {
            BigDecimal bigDecimal = acumuladoAPartirDoMesDaMudanca;
        }
        valorIndice = BigDecimal.ONE;
        for (IndiceDeCalculo indiceDeCalculo : indices) {
            String chave;
            void var15_25;
            if (!Utils.naoNulo(indiceDeCalculo)) continue;
            if (isIndiceSELIC) {
                BigDecimal bigDecimal = this.checarConversaoDuranteSelic(indiceDeCalculo.getCompetencia(), map, (BigDecimal)var15_25);
                valorIndice = Utils.somar(Utils.multiplicar(indiceDeCalculo.getValorAcumulado(), fatorConversaoAposSelic), bigDecimal);
            } else {
                valorIndice = indiceDeCalculo.getValorAcumulado().multiply((BigDecimal)var15_25, Utils.CONTEXTO_MATEMATICO);
            }
            if (this.tabela.containsKey(chave = this.competencia.setDate(indiceDeCalculo.getCompetencia()).format(MASCARA_DIA))) continue;
            this.tabela.put(chave, valorIndice);
        }
    }

    private BigDecimal checarConversaoDuranteSelic(Date competenciaIndice, Map<Date, BigDecimal> conversoesDaSelic, BigDecimal fator) {
        if (conversoesDaSelic.containsKey(competenciaIndice)) {
            fator = Utils.dividir(fator, conversoesDaSelic.get(competenciaIndice));
        }
        return fator;
    }

    private void combinarIndiceDiarioComOutroIndiceDiario(Periodo periodo, List<? extends IndiceDeCalculo> indices, List<? extends IndiceDeCalculo> outrosIndices, Set<CombinacaoDeIndice> combinacoesAdicionaisNoMesmoMes) {
        HelperDate competenciaMesDaMudanca = HelperDate.getCurrentCompetence(this.dataAPartirDeOutroIndice);
        BigDecimal valorIndice = BigDecimal.ONE;
        for (IndiceDeCalculo indiceDeCalculo : outrosIndices) {
            String chave = this.competencia.setDate(indiceDeCalculo.getCompetencia()).format(MASCARA_DIA);
            if (!Utils.naoNulo(indiceDeCalculo) || this.tabela.containsKey(chave)) continue;
            valorIndice = indiceDeCalculo.getValorAcumulado();
            this.tabela.put(chave, valorIndice);
        }
        BigDecimal indiceAcumuladoOutrosIndices = BigDecimal.ONE;
        HelperDate helperDate = HelperDate.getInstance(this.dataAPartirDeOutroIndice);
        while (!HelperDate.dateAfter(helperDate.getDate(), periodo.getFinal())) {
            if (Utils.naoNulo(this.tabela.get(this.competencia.setDate(helperDate.getDate()).format(MASCARA_DIA)))) {
                indiceAcumuladoOutrosIndices = this.tabela.get(this.competencia.setDate(helperDate.getDate()).format(MASCARA_DIA));
                break;
            }
            helperDate.addDay(1);
        }
        Map<String, BigDecimal> mapaDoMes = this.maquinaDeCalculoDeCorrecaoMonetaria.preencherTabelaDiariaDoMesDasCombinacoes(1, periodo, competenciaMesDaMudanca, indiceAcumuladoOutrosIndices, null, combinacoesAdicionaisNoMesmoMes, null);
        for (Map.Entry<String, BigDecimal> entrada : mapaDoMes.entrySet()) {
            this.tabela.put(entrada.getKey(), entrada.getValue());
        }
        BigDecimal indiceAcumuladoTotalOutrosIndices = BigDecimal.ONE;
        HelperDate primeiroDia = competenciaMesDaMudanca.clone();
        while (!HelperDate.dateAfter(primeiroDia.getDate(), periodo.getFinal())) {
            if (Utils.naoNulo(this.tabela.get(this.competencia.setDate(primeiroDia.getDate()).format(MASCARA_DIA)))) {
                indiceAcumuladoTotalOutrosIndices = this.tabela.get(this.competencia.setDate(primeiroDia.getDate()).format(MASCARA_DIA));
                break;
            }
            primeiroDia.addDay(1);
        }
        BigDecimal acumuladoParaExcluir = BigDecimal.ONE;
        valorIndice = BigDecimal.ONE;
        for (IndiceDeCalculo indiceDeCalculo : indices) {
            if (Utils.nulo(indiceDeCalculo)) continue;
            if (HelperDate.dateBefore(indiceDeCalculo.getCompetencia(), primeiroDia.getDate())) {
                valorIndice = indiceDeCalculo.getValorAcumulado().multiply(Utils.dividir(indiceAcumuladoTotalOutrosIndices, acumuladoParaExcluir), Utils.CONTEXTO_MATEMATICO);
                this.tabela.put(this.competencia.setDate(indiceDeCalculo.getCompetencia()).format(MASCARA_DIA), valorIndice);
                continue;
            }
            acumuladoParaExcluir = indiceDeCalculo.getValorAcumulado();
        }
    }

    private void combinarIndiceNaoDiarioComOutroIndiceDiario(Periodo periodo, List<? extends IndiceDeCalculo> indices, List<? extends IndiceDeCalculo> outrosIndices, Set<CombinacaoDeIndice> combinacoesAdicionaisNoMesmoMes) {
        HelperDate competenciaMesDaMudanca = HelperDate.getCurrentCompetence(this.dataAPartirDeOutroIndice);
        BigDecimal taxaMesMudanca = BigDecimal.ZERO;
        if (!indices.isEmpty() && Utils.naoNulo(indices.get(0))) {
            taxaMesMudanca = indices.get(0).getTaxa();
        }
        BigDecimal indiceMesMudanca = taxaMesMudanca.divide(new BigDecimal(100), Utils.CONTEXTO_MATEMATICO).add(BigDecimal.ONE);
        BigDecimal valorIndice = BigDecimal.ONE;
        for (IndiceDeCalculo indiceDeCalculo : outrosIndices) {
            if (!Utils.naoNulo(indiceDeCalculo)) continue;
            valorIndice = indiceDeCalculo.getValorAcumulado();
            String chave = this.competencia.setDate(indiceDeCalculo.getCompetencia()).format(MASCARA_DIA);
            if (this.tabela.containsKey(chave)) continue;
            this.tabela.put(chave, valorIndice);
        }
        BigDecimal indiceAcumuladoOutrosIndices = BigDecimal.ONE;
        HelperDate helperDate = HelperDate.getInstance(this.dataAPartirDeOutroIndice);
        while (!HelperDate.dateAfter(helperDate.getDate(), periodo.getFinal())) {
            if (Utils.naoNulo(this.tabela.get(this.competencia.setDate(helperDate.getDate()).format(MASCARA_DIA)))) {
                indiceAcumuladoOutrosIndices = this.tabela.get(this.competencia.setDate(helperDate.getDate()).format(MASCARA_DIA));
                break;
            }
            helperDate.addDay(1);
        }
        Map<String, BigDecimal> mapaDoMes = this.maquinaDeCalculoDeCorrecaoMonetaria.preencherTabelaDiariaDoMesDasCombinacoes(3, periodo, competenciaMesDaMudanca, indiceAcumuladoOutrosIndices, indiceMesMudanca, combinacoesAdicionaisNoMesmoMes, null);
        for (Map.Entry<String, BigDecimal> entrada : mapaDoMes.entrySet()) {
            this.tabela.put(entrada.getKey(), entrada.getValue());
        }
        BigDecimal indiceAcumuladoTotalMesDaMudanca = this.tabela.get(this.competencia.setDate(competenciaMesDaMudanca.getDate()).format(MASCARA_DIA));
        if (HelperDate.dateBefore(periodo.getInicial(), competenciaMesDaMudanca.getDate())) {
            boolean isIndiceSELIC = IndiceMonetarioEnum.SELIC.equals((Object)this.indice) || IndiceMonetarioEnum.SELIC_FAZENDA.equals((Object)this.indice);
            BigDecimal indiceMensalDoMesDaMudanca = BigDecimal.ONE;
            if (!indices.isEmpty() && Utils.naoNulo(indices.get(0)) && BigDecimal.ZERO.compareTo(indices.get(0).getValorAcumulado()) != 0) {
                indiceMensalDoMesDaMudanca = indices.get(0).getValorAcumulado();
            }
            BigDecimal fator = isIndiceSELIC ? Utils.somar(Utils.subtrair(indiceAcumuladoTotalMesDaMudanca, indiceMensalDoMesDaMudanca), BigDecimal.ONE) : Utils.dividir(indiceAcumuladoTotalMesDaMudanca, indiceMensalDoMesDaMudanca);
            if (HelperDate.dateEquals(competenciaMesDaMudanca.getDate(), this.dataAPartirDeOutroIndice)) {
                fator = indiceAcumuladoTotalMesDaMudanca;
            }
            valorIndice = BigDecimal.ONE;
            for (IndiceDeCalculo indiceDeCalculo : indices) {
                if (Utils.nulo(indiceDeCalculo)) continue;
                valorIndice = isIndiceSELIC ? TabelaDeCorrecaoMonetariaUtils.tratarConversaoMoedaNaCombinacaoComSelic(fator, indiceDeCalculo, this.dataAPartirDeOutroIndice) : indiceDeCalculo.getValorAcumulado().multiply(fator, Utils.CONTEXTO_MATEMATICO);
                String chave = this.competencia.setDate(indiceDeCalculo.getCompetencia()).format(MASCARA_DIA);
                this.tabela.put(chave, valorIndice);
            }
        }
    }

    private void combinarIndiceDiarioComOutroIndiceNaoDiario(Periodo periodo, List<? extends IndiceDeCalculo> indices, List<? extends IndiceDeCalculo> outrosIndices, Set<CombinacaoDeIndice> combinacoesAdicionaisNoMesmoMes) {
        int size = outrosIndices.size();
        HelperDate competenciaMesDaMudanca = HelperDate.getCurrentCompetence(this.dataAPartirDeOutroIndice);
        HelperDate competenciaMesDepoisDaMudanca = HelperDate.getCurrentCompetence(this.dataAPartirDeOutroIndice).addMonth(1);
        BigDecimal indiceAcumuladoDepoisDoMesDaMudanca = TabelaDeCorrecaoMonetariaUtils.encontrarIndiceAcumuladoAposMudanca(outrosIndices);
        boolean isOutroIndiceSELIC = IndiceMonetarioEnum.SELIC.equals((Object)this.outroIndice) || IndiceMonetarioEnum.SELIC_FAZENDA.equals((Object)this.outroIndice);
        BigDecimal indiceMesMudanca = BigDecimal.ONE;
        if (!outrosIndices.isEmpty() && Utils.naoNulo(outrosIndices.get(size - 1)) && isOutroIndiceSELIC) {
            indiceMesMudanca = outrosIndices.get(size - 1).getValorIndice();
        } else if (!outrosIndices.isEmpty() && Utils.naoNulo(outrosIndices.get(size - 1))) {
            indiceMesMudanca = Utils.dividir(outrosIndices.get(size - 1).getValorAcumulado(), indiceAcumuladoDepoisDoMesDaMudanca);
        }
        if (HelperDate.dateAfterOrEquals(periodo.getFinal(), competenciaMesDepoisDaMudanca.getDate())) {
            BigDecimal valorIndice = BigDecimal.ONE;
            for (IndiceDeCalculo indiceDeCalculo : outrosIndices) {
                if (Utils.nulo(indiceDeCalculo)) continue;
                valorIndice = indiceDeCalculo.getValorAcumulado();
                if (competenciaMesDaMudanca.compareDate(indiceDeCalculo.getCompetencia())) {
                    this.tabela.put(this.competencia.setDate(indiceDeCalculo.getCompetencia()).format(MASCARA_DIA), null);
                    continue;
                }
                String chave = this.competencia.setDate(indiceDeCalculo.getCompetencia()).format(MASCARA_DIA);
                if (!this.tabela.containsKey(chave)) {
                    this.tabela.put(chave, valorIndice);
                    continue;
                }
                indiceAcumuladoDepoisDoMesDaMudanca = this.tabela.get(chave);
            }
        } else {
            String chave = this.competencia.setDate(competenciaMesDepoisDaMudanca.getDate()).format(MASCARA_DIA);
            if (this.tabela.containsKey(chave)) {
                indiceAcumuladoDepoisDoMesDaMudanca = this.tabela.get(chave);
            }
        }
        if (!periodo.isPeriodoContemEsta(this.dataAPartirDeOutroIndice)) {
            return;
        }
        Map<String, BigDecimal> mapaDoMes = this.maquinaDeCalculoDeCorrecaoMonetaria.preencherTabelaDiariaDoMesDasCombinacoes(2, periodo, competenciaMesDaMudanca, indiceMesMudanca, null, combinacoesAdicionaisNoMesmoMes, indiceAcumuladoDepoisDoMesDaMudanca);
        for (Map.Entry entry : mapaDoMes.entrySet()) {
            this.tabela.put((String)entry.getKey(), (BigDecimal)entry.getValue());
        }
        BigDecimal indiceAcumuladoTotalOutrosIndices = BigDecimal.ONE;
        HelperDate helperDate = competenciaMesDaMudanca.clone();
        while (!HelperDate.dateAfter(helperDate.getDate(), periodo.getFinal())) {
            if (Utils.naoNulo(this.tabela.get(this.competencia.setDate(helperDate.getDate()).format(MASCARA_DIA)))) {
                indiceAcumuladoTotalOutrosIndices = this.tabela.get(this.competencia.setDate(helperDate.getDate()).format(MASCARA_DIA));
                break;
            }
            helperDate.addDay(1);
        }
        BigDecimal acumuladoParaExcluir = BigDecimal.ONE;
        BigDecimal valorIndice = BigDecimal.ONE;
        for (IndiceDeCalculo indiceDeCalculo : indices) {
            if (Utils.nulo(indiceDeCalculo)) continue;
            if (HelperDate.dateBefore(indiceDeCalculo.getCompetencia(), helperDate.getDate())) {
                valorIndice = indiceDeCalculo.getValorAcumulado().multiply(Utils.dividir(indiceAcumuladoTotalOutrosIndices, acumuladoParaExcluir), Utils.CONTEXTO_MATEMATICO);
                this.tabela.put(this.competencia.setDate(indiceDeCalculo.getCompetencia()).format(MASCARA_DIA), valorIndice);
                continue;
            }
            acumuladoParaExcluir = indiceDeCalculo.getValorAcumulado();
        }
    }

    private HelperDate ajustarData(Date data) {
        switch (this.indice) {
            case JAM: {
                if (IndicesAcumuladosEnum.ATUALIZACAO_CALCULO.equals((Object)this.indicesAcumulados)) {
                    return this.competencia.setDate(data).addDay(1);
                }
                this.competencia.setDate(data).setDay(1);
                if (TabelaDeCorrecaoMonetariaUtils.isAte(5, 1989, this.competencia)) {
                    return this.competencia.addMonth(4).setDay(20);
                }
                if (TabelaDeCorrecaoMonetariaUtils.isAte(7, 1989, this.competencia)) {
                    return this.competencia.addMonth(3).setDay(20);
                }
                if (TabelaDeCorrecaoMonetariaUtils.isAte(2, 1991, this.competencia)) {
                    return this.competencia.addMonth(2).setDay(20);
                }
                return this.competencia.addMonth(2).setDay(7);
            }
        }
        if (this.isFixoMesVencimento) {
            return this.competencia.setDate(data).setDay(1);
        }
        Date dataDemissao = this.servicoDeCalculo.obterCalculoAberto().getDataDemissao();
        boolean ehDemissao = Utils.naoNulo(dataDemissao) && HelperDate.dateEquals(HelperDate.getCurrentCompetence(data).getDate(), HelperDate.getCurrentCompetence(dataDemissao).getDate());
        switch (this.indicesAcumulados) {
            case MES_SUBSEQUENTE_AO_VENCIMENTO: {
                return this.competencia.setDate(data).setDay(1).addMonth(1).setDay(1);
            }
            case MES_DO_VENCIMENTO: {
                return this.competencia.setDate(data).setDay(1);
            }
            case MES_SUBSEQUENTE_E_MES_DO_VENCIMENTO: {
                return this.tratarMesSubsequenteMesVencimento(ehDemissao, data);
            }
            case ATUALIZACAO_CALCULO: {
                return this.competencia.setDate(data).addDay(1);
            }
        }
        return null;
    }

    private HelperDate tratarMesSubsequenteMesVencimento(boolean ehDemissao, Date data) {
        if (this.isVerbaRescisoria(ehDemissao) && ehDemissao) {
            return this.competencia.setDate(HelperDate.getInstance(this.servicoDeCalculo.obterCalculoAberto().getDataDemissao()).addDay(10).getDate()).setDay(1);
        }
        if (this.isVerbaRescisoria(ehDemissao)) {
            return this.competencia.setDate(data).setDay(1);
        }
        return this.competencia.setDate(data).setDay(1).addMonth(1).setDay(1);
    }

    private boolean isVerbaRescisoria(boolean ehDemissao) {
        boolean ehNaoMensal = this.ocorrenciaDePagamento != null && !OcorrenciaDePagamentoEnum.MENSAL.equals((Object)this.ocorrenciaDePagamento);
        boolean ehMensalNaDemissao = this.ocorrenciaDePagamento != null && OcorrenciaDePagamentoEnum.MENSAL.equals((Object)this.ocorrenciaDePagamento) && ehDemissao;
        boolean ehFGTSNaDemissao = this.ehMultaFGTS != false && ehDemissao;
        return this.ehOcorrenciaSeguroDesemprego || ehFGTSNaDemissao || ehNaoMensal || ehMensalNaDemissao;
    }

    public BigDecimal obterIndice(Date data) {
        Date dataConversaoEntreAjustesDeData;
        HelperDate dataAjustada = this.ajustarData(data);
        if (Utils.nulo(dataAjustada)) {
            return BigDecimal.ONE;
        }
        HelperDate dataAjustadaInicial = dataAjustada.clone();
        BigDecimal fatorConversaoMoeda = BigDecimal.ONE;
        ArrayList<Date> conversoesConsideradas = new ArrayList<Date>();
        BigDecimal valor = this.tabela.get(dataAjustada.format(MASCARA_DIA));
        boolean existeDataAjustadaInicialNaTabela = valor != null;
        this.existeIndiceDiarioNaCombinacao = null;
        while (valor == null && dataAjustada.lessThen(this.dataFinalDoPeriodo)) {
            fatorConversaoMoeda = this.iterarNaTabela(dataAjustada, fatorConversaoMoeda, conversoesConsideradas, Boolean.TRUE);
            valor = this.tabela.get(dataAjustada.format(MASCARA_DIA));
        }
        if (valor == null && HelperDate.dateEquals(dataAjustada.getDate(), this.dataFinalDoPeriodo.getDate())) {
            fatorConversaoMoeda = this.iterarNaTabela(dataAjustada, fatorConversaoMoeda, conversoesConsideradas, Boolean.FALSE);
        }
        IndiceMonetarioEnum indice = ParametrosDeAtualizacaoUtils.encontrarIndiceCorrecaoDa(data, this.parametrosAtualizacao);
        if (IndiceMonetarioEnum.JAM.equals((Object)this.indice) && HelperDate.getCurrentCompetence(data).between(HelperDate.getInstance(1986, 2, 1), HelperDate.getInstance(1986, 3, 1))) {
            fatorConversaoMoeda = fatorConversaoMoeda.divide(ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.get(HelperDate.getInstance(1986, 2, 1).getDate()), Utils.CONTEXTO_MATEMATICO);
        }
        if (IndiceMonetarioEnum.JAM.equals((Object)this.indice) && HelperDate.dateEquals(HelperDate.getCurrentCompetence(data).getDate(), HelperDate.getInstance(1993, 6, 1).getDate())) {
            fatorConversaoMoeda = fatorConversaoMoeda.multiply(ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.get(HelperDate.getInstance(1993, 7, 1).getDate()), Utils.CONTEXTO_MATEMATICO);
        }
        if (IndiceMonetarioEnum.JAM.equals((Object)this.indice) && HelperDate.dateEquals(HelperDate.getCurrentCompetence(data).getDate(), HelperDate.getInstance(1994, 5, 1).getDate())) {
            fatorConversaoMoeda = fatorConversaoMoeda.multiply(ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.get(HelperDate.getInstance(1994, 6, 1).getDate()), Utils.CONTEXTO_MATEMATICO);
        }
        if (!(IndiceMonetarioEnum.JAM.equals((Object)this.indice) || this.isIndiceDiario(indice) && IndicesAcumuladosEnum.ATUALIZACAO_CALCULO.equals((Object)this.indicesAcumulados) || !Utils.naoNulo(dataConversaoEntreAjustesDeData = ConversaoDeMoedas.encontrarDataDeConversaoParaMudancaDeMoedas(HelperDate.getInstance(data).addDay(1).getDate(), dataAjustadaInicial.getDate())) || !HelperDate.dateEquals(HelperDate.getCurrentCompetence(data).getDate(), HelperDate.getCurrentCompetence(dataConversaoEntreAjustesDeData).getDate()) || HelperDate.getInstance(dataConversaoEntreAjustesDeData).getDay() <= 1)) {
            Date dataLiquidacao;
            boolean dentroDoPeriodo;
            Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
            boolean bl = dentroDoPeriodo = Utils.nulo(this.periodoDaTabelaAtual) || Utils.naoNulo(this.periodoDaTabelaAtual) && this.periodoDaTabelaAtual.isPeriodoContemEsta(dataConversaoEntreAjustesDeData);
            Date date = Utils.naoNulo(this.dataLiquidacao) ? this.dataLiquidacao : (dataLiquidacao = IndicesAcumuladosEnum.ATUALIZACAO_CALCULO.equals((Object)this.indicesAcumulados) ? calculo.getAtualizacao().getDataDeLiquidacao() : calculo.getDataDeLiquidacao());
            if (HelperDate.dateAfterOrEquals(dataLiquidacao, dataConversaoEntreAjustesDeData) && !conversoesConsideradas.contains(dataConversaoEntreAjustesDeData) && dentroDoPeriodo) {
                fatorConversaoMoeda = fatorConversaoMoeda.multiply(ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.get(dataConversaoEntreAjustesDeData), Utils.CONTEXTO_MATEMATICO);
            }
        }
        if (Utils.nulo(valor)) {
            return BigDecimal.ONE.divide(fatorConversaoMoeda, Utils.CONTEXTO_MATEMATICO);
        }
        valor = valor.divide(fatorConversaoMoeda, Utils.CONTEXTO_MATEMATICO);
        if (!IndiceMonetarioEnum.JAM.equals((Object)this.indice) && ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.containsKey(dataAjustadaInicial.setDay(1).getDate()) && existeDataAjustadaInicialNaTabela) {
            switch (this.indicesAcumulados) {
                case MES_DO_VENCIMENTO: {
                    valor = valor.multiply(ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.get(dataAjustadaInicial.setDay(1).getDate()));
                    break;
                }
                case MES_SUBSEQUENTE_E_MES_DO_VENCIMENTO: {
                    if (!this.ehOcorrenciaSeguroDesemprego && !this.ehMultaFGTS.booleanValue() && (this.ocorrenciaDePagamento == null || OcorrenciaDePagamentoEnum.MENSAL.equals((Object)this.ocorrenciaDePagamento))) break;
                    valor = valor.multiply(ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.get(dataAjustadaInicial.setDay(1).getDate()));
                    break;
                }
            }
        }
        return valor;
    }

    private BigDecimal iterarNaTabela(HelperDate dataAjustada, BigDecimal fatorConversaoMoeda, List<Date> conversoesConsideradas, boolean incrementaValor) {
        Boolean checaSeEhDiario;
        if (this.existeIndiceDiarioNaCombinacao == null) {
            this.existeIndiceDiarioNaCombinacao = IndiceMonetarioEnum.JAM.equals((Object)this.indice) || TabelaDeCorrecaoMonetariaUtils.verificarSeExisteIndiceDiarioNaCombinacao(this.servicoDeCalculo.obterCalculoAberto());
        }
        if ((checaSeEhDiario = this.existeIndiceDiarioNaCombinacao).booleanValue() || IndicesAcumuladosEnum.ATUALIZACAO_CALCULO.equals((Object)this.indicesAcumulados)) {
            if (!IndiceMonetarioEnum.JAM.equals((Object)this.indice) && ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.containsKey(HelperDate.resetHour(dataAjustada.getDate()))) {
                fatorConversaoMoeda = fatorConversaoMoeda.multiply(ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.get(HelperDate.resetHour(dataAjustada.getDate())), Utils.CONTEXTO_MATEMATICO);
                conversoesConsideradas.add(dataAjustada.getDate());
            }
            dataAjustada = incrementaValor ? dataAjustada.addDay(1) : dataAjustada;
        } else {
            if (ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.containsKey(dataAjustada.getDate())) {
                fatorConversaoMoeda = this.tratarConversaoSemCorrecaoMensal(dataAjustada, fatorConversaoMoeda, conversoesConsideradas);
            }
            dataAjustada = incrementaValor ? dataAjustada.addMonth(1) : dataAjustada;
        }
        return fatorConversaoMoeda;
    }

    protected BigDecimal tratarConversaoSemCorrecaoMensal(HelperDate dataAjustada, BigDecimal fatorConversaoMoeda) {
        return this.tratarConversaoSemCorrecaoMensal(dataAjustada, fatorConversaoMoeda, null);
    }

    private BigDecimal tratarConversaoSemCorrecaoMensal(HelperDate dataAjustada, BigDecimal fatorConversaoMoeda, List<Date> datasConsideradas) {
        Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
        Date dataLiquidacao = Utils.naoNulo(this.dataLiquidacao) ? this.dataLiquidacao : (IndicesAcumuladosEnum.ATUALIZACAO_CALCULO.equals((Object)this.indicesAcumulados) ? calculo.getAtualizacao().getDataDeLiquidacao() : calculo.getDataDeLiquidacao());
        Date dataConversaoDiaria = ConversaoDeMoedas.encontrarDataDeConversaoParaMudancaDeMoedas(dataAjustada.getDate(), dataAjustada.lastDayOfTheMonth().getDate());
        if (Utils.naoNulo(dataConversaoDiaria) && HelperDate.dateAfterOrEquals(dataLiquidacao, dataConversaoDiaria) && HelperDate.dateAfterOrEquals(dataConversaoDiaria, this.periodoDaTabelaAtual.getInicial())) {
            fatorConversaoMoeda = fatorConversaoMoeda.multiply(ConversaoDeMoedas.COMPETENCIAS_DIARIAS_PARA_CONVERSAO_DE_MOEDAS.get(dataConversaoDiaria), Utils.CONTEXTO_MATEMATICO);
            if (datasConsideradas != null) {
                datasConsideradas.add(dataConversaoDiaria);
            }
        }
        return fatorConversaoMoeda;
    }

    public BigDecimal obterValorAcumuladoDoIndice(Date data) {
        return this.obterIndice(data);
    }

    public void setOcorrenciaDePagamento(OcorrenciaDePagamentoEnum ocorrenciaDePagamento) {
        this.ocorrenciaDePagamento = ocorrenciaDePagamento;
    }

    public IndiceMonetarioEnum getIndice() {
        return this.indice;
    }

    public Date getDataAPartirDeOutroIndice() {
        return this.dataAPartirDeOutroIndice;
    }

    public IndiceMonetarioEnum getOutroIndice() {
        return this.outroIndice;
    }

    public void setOrigemCalculo(Boolean origemCalculo) {
        this.origemCalculo = origemCalculo;
    }

    public void setDataLiquidacao(Date dataLiquidacao) {
        this.dataLiquidacao = dataLiquidacao;
    }

    public BigDecimal obterValorAcumuladoDoIndiceParaAtualizacaoDoPrincipal(CreditosDoReclamante creditoDoReclamante, BigDecimal totalDevidoCorrigidoAnterior) {
        Calculo calculo = this.servicoDeCalculo.obterCalculoAberto();
        BigDecimal totalDevidoCorrigido = BigDecimal.ZERO;
        for (VerbaDeCalculo verba : calculo.getVerbasAtivas()) {
            BigDecimal totalDevidoCorrigidoDaVerba = BigDecimal.ZERO;
            if (LogicoEnum.NAO.equals((Object)verba.getComporPrincipal())) continue;
            for (OcorrenciaDeVerba ocorrencia : verba.getOcorrenciasAtivas()) {
                this.ocorrenciaDePagamento = verba.getOcorrenciaDePagamento();
                BigDecimal indice = this.obterValorAcumuladoDoIndice(ocorrencia.getDataInicial());
                totalDevidoCorrigidoDaVerba = Utils.somar(totalDevidoCorrigidoDaVerba, Utils.aplicarCorrecaoMonetaria(indice, ocorrencia.getDevido()));
            }
            totalDevidoCorrigido = Utils.somar(totalDevidoCorrigido, totalDevidoCorrigidoDaVerba);
        }
        if (BigDecimal.ZERO.compareTo(totalDevidoCorrigidoAnterior) >= 0) {
            return BigDecimal.ONE;
        }
        creditoDoReclamante.setTotalDevidoCorrigidoSemPagamento(totalDevidoCorrigido);
        return Utils.dividir(totalDevidoCorrigido, totalDevidoCorrigidoAnterior);
    }
}

