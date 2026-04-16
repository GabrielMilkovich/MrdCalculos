/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoProporcionalizar;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IncidenciaDeMultaDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceDeCorrecaoDoFGTSEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeBaseDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeDepositadoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OcorrenciaDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.OperacaoDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.TabelaDeJurosDeFgts;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

public class MaquinaDeCalculoDoFgts
implements Serializable {
    private static final long serialVersionUID = 3379096662276778109L;
    private Fgts fgts;
    private TabelaDeJurosDeFgts tabelaDeJuros;

    public MaquinaDeCalculoDoFgts(Fgts fgts) {
        this.fgts = fgts;
    }

    /*
     * WARNING - void declaration
     */
    public void liquidar() {
        BigDecimal fator;
        Date demissaoMaisUm;
        void var5_13;
        boolean usaIndiceTrabalhista;
        if (Utils.nulo(this.fgts.getOcorrencias()) || this.fgts.getOcorrencias().isEmpty()) {
            this.fgts.gerarOcorrencias(false, false);
        }
        Calculo calculo = this.fgts.getCalculo();
        ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>> historicosSalariais = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>>();
        for (HistoricoSalarial historicoSalarial : calculo.getHistoricosSalariais()) {
            if (!historicoSalarial.getIncidenciaFGTS().booleanValue()) continue;
            OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> optimizerListSearch = HistoricoSalarial.obter(historicoSalarial.getId()).getListaDeOcorrenciasOtimizada();
            historicosSalariais.add(optimizerListSearch);
        }
        ArrayList<VerbaDeCalculo> verbas = new ArrayList<VerbaDeCalculo>();
        for (VerbaDeCalculo verbaDeCalculo : calculo.getVerbasAtivas()) {
            if (!verbaDeCalculo.getIncidenciaFGTS().booleanValue()) continue;
            verbas.add(verbaDeCalculo);
        }
        ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>> arrayList = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>>();
        for (VerbaDeCalculo verbaDeCalculo : verbas) {
            arrayList.add(verbaDeCalculo.getOcorrenciasAtivasOptimizerListSearch());
        }
        IndiceMonetarioEnum indiceMonetarioEnum = calculo.getAtualizacaoMonetaria();
        boolean bl = IndiceDeCorrecaoDoFGTSEnum.UTILIZAR_INDICE_JAM_E_TRABALHISTA == this.fgts.getCorrecaoMonetaria();
        boolean bl2 = usaIndiceTrabalhista = IndiceDeCorrecaoDoFGTSEnum.UTILIZAR_INDICE_TRABALHISTA == this.fgts.getCorrecaoMonetaria();
        if (!usaIndiceTrabalhista) {
            IndiceMonetarioEnum indiceMonetarioEnum2 = IndiceMonetarioEnum.JAM;
        }
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = null;
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhistaCombinada = null;
        Periodo periodoAbrangente = new Periodo();
        periodoAbrangente.setInicial(this.fgts.getPeriodoInicial());
        periodoAbrangente.setFinal(calculo.getDataDeLiquidacao());
        if (bl && HelperDate.dateAfter(calculo.getDataDeLiquidacao(), calculo.getDataDemissao())) {
            tabelaDeCorrecaoMonetariaTrabalhistaCombinada = new TabelaDeCorrecaoMonetaria(Boolean.TRUE, calculo.getAtualizacaoMonetaria(), calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
            tabelaDeCorrecaoMonetariaTrabalhistaCombinada.setOrigemCalculo(Boolean.TRUE);
            tabelaDeCorrecaoMonetariaTrabalhistaCombinada.carregarTabelaTrabalhistaCombinadaParaFgts(new Periodo(HelperDate.getInstance(calculo.getDataDemissao()).addDay(1).getDate(), calculo.getDataDeLiquidacao()), calculo);
            tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, IndiceMonetarioEnum.JAM, calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
            tabelaDeCorrecaoMonetaria.setOrigemCalculo(Boolean.TRUE);
            tabelaDeCorrecaoMonetaria.carregarTabela(new Periodo(this.fgts.getPeriodoInicial(), calculo.getDataDemissao()));
        } else if (bl) {
            tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(Boolean.FALSE, IndiceMonetarioEnum.JAM, calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
            tabelaDeCorrecaoMonetaria.setOrigemCalculo(Boolean.TRUE);
            tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
        } else {
            tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(usaIndiceTrabalhista, (IndiceMonetarioEnum)var5_13, calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
            tabelaDeCorrecaoMonetaria.setOrigemCalculo(Boolean.TRUE);
            tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
        }
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaMulta = null;
        if (this.fgts.getMulta().booleanValue()) {
            tabelaDeCorrecaoMonetariaMulta = new TabelaDeCorrecaoMonetaria(usaIndiceTrabalhista, (IndiceMonetarioEnum)var5_13, calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
            periodoAbrangente.setInicial(this.fgts.getPeriodoInicial());
            periodoAbrangente.setFinal(calculo.getDataDemissao());
            tabelaDeCorrecaoMonetariaMulta.setOrigemCalculo(Boolean.TRUE);
            tabelaDeCorrecaoMonetariaMulta.carregarTabela(periodoAbrangente);
            tabelaDeCorrecaoMonetariaMulta.marcaComoMultaFGTS();
        }
        Competencia competencia = new Competencia();
        this.fgts.getLegendaDaFormula().getBasesHistoricos().clear();
        List<OcorrenciaDeFgts> ocorrencias = this.fgts.getOcorrenciasNaoOriginais();
        for (OcorrenciaDeFgts ocorrenciaDeFgts : ocorrencias) {
            competencia.update(ocorrenciaDeFgts.getOcorrencia());
            if (TipoDeBaseDoFgtsEnum.CALCULADA.equals((Object)ocorrenciaDeFgts.getTipoDeBaseDoFgts()) || TipoDeDepositadoDoFgtsEnum.CALCULADA.equals((Object)ocorrenciaDeFgts.getTipoDeDepositadoDoFgts())) {
                Periodo periodoRecalculo = competencia.criarPeriodoDaCompetencia();
                periodoRecalculo.setInicial(ocorrenciaDeFgts.getOcorrencia());
                if (HelperDate.dateAfter(periodoRecalculo.getFinal(), this.fgts.getPeriodoFinal())) {
                    periodoRecalculo.setFinal(this.fgts.getPeriodoFinal());
                }
                BigDecimal somaDasBasesDoHistoricoSalarial = BigDecimal.ZERO;
                BigDecimal depositado = BigDecimal.ZERO;
                for (OptimizerListSearch optimizerListSearch : historicosSalariais) {
                    Iterator ocorrenciasDoHistoricoSalarial = optimizerListSearch.search(competencia);
                    boolean setouLegenda = false;
                    while (Utils.naoNulo(ocorrenciasDoHistoricoSalarial) && ocorrenciasDoHistoricoSalarial.hasNext()) {
                        OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial = (OcorrenciaDoHistoricoSalarial)ocorrenciasDoHistoricoSalarial.next();
                        if (Utils.nulo(ocorrenciaDoHistoricoSalarial) || Boolean.FALSE.equals(ocorrenciaDoHistoricoSalarial.getIncidenciaFGTS())) continue;
                        BigDecimal valorDaBase = BigDecimal.ZERO;
                        if (ocorrenciaDoHistoricoSalarial.getHistoricoSalarial().getAplicarProporcionalidadeFGTS().booleanValue()) {
                            int diasParaExcluir = 0;
                            if (periodoRecalculo.totalDeDias() - (diasParaExcluir += calculo.obterDiasFerias(periodoRecalculo)) == 31) {
                                diasParaExcluir = 1;
                            }
                            CalculoDoProporcionalizar calculoDoProporcionalizar = new CalculoDoProporcionalizar(periodoRecalculo, ocorrenciaDoHistoricoSalarial.getValor(), diasParaExcluir += calculo.obterFaltasNaoJustificadas(periodoRecalculo));
                            calculoDoProporcionalizar.executar();
                            valorDaBase = calculoDoProporcionalizar.getResultado();
                            somaDasBasesDoHistoricoSalarial = somaDasBasesDoHistoricoSalarial.add(valorDaBase, Utils.CONTEXTO_MATEMATICO);
                            if (!setouLegenda) {
                                this.fgts.getLegendaDaFormula().getBasesHistoricos().add(ocorrenciaDoHistoricoSalarial.getHistoricoSalarial().getNome());
                                setouLegenda = true;
                            }
                        } else {
                            valorDaBase = ocorrenciaDoHistoricoSalarial.getValor();
                            somaDasBasesDoHistoricoSalarial = somaDasBasesDoHistoricoSalarial.add(valorDaBase, Utils.CONTEXTO_MATEMATICO);
                        }
                        if (!ocorrenciaDoHistoricoSalarial.getRecolhidoFGTS().booleanValue()) continue;
                        depositado = depositado.add(valorDaBase, Utils.CONTEXTO_MATEMATICO);
                    }
                }
                if (TipoDeBaseDoFgtsEnum.CALCULADA.equals((Object)ocorrenciaDeFgts.getTipoDeBaseDoFgts())) {
                    ocorrenciaDeFgts.setBaseHistorico(somaDasBasesDoHistoricoSalarial);
                }
                if (TipoDeDepositadoDoFgtsEnum.CALCULADA.equals((Object)ocorrenciaDeFgts.getTipoDeDepositadoDoFgts())) {
                    ocorrenciaDeFgts.setDepositado(this.fgts.getAliquota().calcular(depositado));
                }
            }
            this.processarOcorrenciasParaEncontrarBaseVerba(arrayList, competencia, ocorrenciaDeFgts);
            ocorrenciaDeFgts.setIndiceAcumulado(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(ocorrenciaDeFgts.getOcorrencia()));
            if (bl && Utils.naoNulo(tabelaDeCorrecaoMonetariaTrabalhistaCombinada)) {
                demissaoMaisUm = HelperDate.getInstance(calculo.getDataDemissao()).addDay(1).getDate();
                fator = tabelaDeCorrecaoMonetariaTrabalhistaCombinada.obterValorAcumuladoDoIndice(demissaoMaisUm);
                ocorrenciaDeFgts.setIndiceAcumulado(ocorrenciaDeFgts.getIndiceAcumulado().multiply(fator, Utils.CONTEXTO_MATEMATICO));
            }
            ocorrenciaDeFgts.setIndiceAcumuladoDaMulta(BigDecimal.ONE);
            if (!Utils.naoNulo(tabelaDeCorrecaoMonetariaMulta) || IncidenciaDeMultaDoFgtsEnum.SOBRE_DEPOSITADO_SACADO.equals((Object)this.fgts.getIncidenciaDoFgts())) continue;
            ocorrenciaDeFgts.setIndiceAcumuladoDaMulta(tabelaDeCorrecaoMonetariaMulta.obterValorAcumuladoDoIndice(ocorrenciaDeFgts.getOcorrencia()));
        }
        for (OperacaoDeFgts operacao : this.fgts.getOperacoesDeFgts()) {
            operacao.setIndiceAcumulado(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(operacao.getCompetencia()));
            if (!bl || !Utils.naoNulo(tabelaDeCorrecaoMonetariaTrabalhistaCombinada)) continue;
            demissaoMaisUm = HelperDate.getInstance(calculo.getDataDemissao()).addDay(1).getDate();
            fator = tabelaDeCorrecaoMonetariaTrabalhistaCombinada.obterValorAcumuladoDoIndice(demissaoMaisUm);
            operacao.setIndiceAcumulado(operacao.getIndiceAcumulado().multiply(fator, Utils.CONTEXTO_MATEMATICO));
        }
        if (Utils.naoNulo(tabelaDeCorrecaoMonetariaMulta)) {
            int i;
            OperacaoDeFgts[] operacoes = this.fgts.getOperacoesDeFgts().toArray(new OperacaoDeFgts[this.fgts.getOperacoesDeFgts().size()]);
            HelperDate hdDataDemissao = HelperDate.getInstance(calculo.getDataDemissao());
            for (i = 0; i < operacoes.length && hdDataDemissao.greaterThenOrEquals(operacoes[i].getCompetencia()); ++i) {
                operacoes[i].setIndiceAcumuladoDaMulta(tabelaDeCorrecaoMonetariaMulta.obterValorAcumuladoDoIndice(operacoes[i].getCompetencia()));
            }
            while (i < operacoes.length && hdDataDemissao.lessThen(operacoes[i].getCompetencia())) {
                tabelaDeCorrecaoMonetariaMulta = bl ? new TabelaDeCorrecaoMonetaria(true, calculo.getAtualizacaoMonetaria(), calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa()) : new TabelaDeCorrecaoMonetaria(usaIndiceTrabalhista, (IndiceMonetarioEnum)var5_13, calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
                periodoAbrangente.setInicial(calculo.getDataDemissao());
                periodoAbrangente.setFinal(operacoes[i].getCompetencia());
                tabelaDeCorrecaoMonetariaMulta.setOrigemCalculo(Boolean.TRUE);
                tabelaDeCorrecaoMonetariaMulta.carregarTabela(periodoAbrangente);
                operacoes[i].setIndiceAcumuladoDaMulta(tabelaDeCorrecaoMonetariaMulta.obterValorAcumuladoDoIndice(calculo.getDataDemissao()).negate());
                ++i;
            }
        }
        if (this.fgts.isDeveCobrarMulta()) {
            this.fgts.setIndiceMulta(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(calculo.getDataDemissao()));
            if (Boolean.TRUE.equals(this.fgts.getMultaDoArtigo467())) {
                if (IndiceMonetarioEnum.JAM.equals(var5_13)) {
                    IndiceMonetarioEnum indiceMonetarioTrabalhista = calculo.getAtualizacaoMonetaria();
                    TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetariaTrabalhista = new TabelaDeCorrecaoMonetaria(Boolean.TRUE, indiceMonetarioTrabalhista, calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
                    Periodo periodoAbrangenteParaMulta467 = new Periodo();
                    periodoAbrangenteParaMulta467.setInicial(calculo.getDataDemissao());
                    periodoAbrangenteParaMulta467.setFinal(calculo.getDataDeLiquidacao());
                    tabelaDeCorrecaoMonetariaTrabalhista.setOrigemCalculo(Boolean.TRUE);
                    tabelaDeCorrecaoMonetariaTrabalhista.carregarTabela(periodoAbrangenteParaMulta467);
                    tabelaDeCorrecaoMonetariaTrabalhista.marcaComoMultaFGTS();
                    this.fgts.setIndiceMulta467(tabelaDeCorrecaoMonetariaTrabalhista.obterValorAcumuladoDoIndice(calculo.getDataDemissao()));
                } else {
                    this.fgts.setIndiceMulta467(this.fgts.getIndiceMulta());
                }
            }
        }
    }

    private void processarOcorrenciasParaEncontrarBaseVerba(List<OptimizerListSearch<Competencia, OcorrenciaDeVerba>> ocorrenciasDaVerba, Competencia competencia, OcorrenciaDeFgts ocorrenciaDeFgts) {
        BigDecimal somaDasDiferencas = null;
        BigDecimal somaDasDiferencasSemAviso = null;
        for (OptimizerListSearch<Competencia, OcorrenciaDeVerba> optimizerSearch : ocorrenciasDaVerba) {
            Iterator<OcorrenciaDeVerba> ocorrenciasDeVerba = optimizerSearch.search(competencia);
            while (Utils.naoNulo(ocorrenciasDeVerba) && ocorrenciasDeVerba.hasNext()) {
                BigDecimal base;
                OcorrenciaDeVerba ocorrenciaDeVerba = ocorrenciasDeVerba.next();
                if (Utils.nulo(ocorrenciaDeVerba) || Utils.nulo(base = ocorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias())) continue;
                somaDasDiferencas = somaDasDiferencas == null ? BigDecimal.ZERO : somaDasDiferencas;
                somaDasDiferencas = somaDasDiferencas.add(Utils.zerarSeNegativo(base));
                if (CaracteristicaDaVerbaEnum.AVISO_PREVIO.equals((Object)ocorrenciaDeVerba.getCaracteristica())) continue;
                somaDasDiferencasSemAviso = somaDasDiferencasSemAviso == null ? BigDecimal.ZERO : somaDasDiferencasSemAviso;
                somaDasDiferencasSemAviso = somaDasDiferencasSemAviso.add(Utils.zerarSeNegativo(base));
            }
        }
        ocorrenciaDeFgts.setBaseVerba(somaDasDiferencas);
        ocorrenciaDeFgts.setBaseVerbaSemAvisoPrevio(somaDasDiferencasSemAviso);
    }

    private BigDecimal calcularTaxaDeJuros(Date data) {
        if (Utils.nulo(this.tabelaDeJuros)) {
            this.tabelaDeJuros = new TabelaDeJurosDeFgts(this.getFgts().getCalculo());
        }
        return this.tabelaDeJuros.calcularTaxaDeJuros(data);
    }

    public void calcularJuros() {
        BigDecimal taxaDeJuros;
        this.tabelaDeJuros = null;
        Date data = Utils.naoNulo(this.getFgts().getCalculo().getDataDemissao()) ? this.getFgts().getCalculo().getDataDemissao() : this.getFgts().getCalculo().getDataTerminoCalculo();
        this.getFgts().setTaxaDeJurosParaDataDemissao(null);
        if (Utils.naoNulo(data)) {
            this.getFgts().setTaxaDeJurosParaDataDemissao(this.calcularTaxaDeJuros(data));
        }
        if (this.getFgts().isSomenteJurosJAM()) {
            for (OcorrenciaDeFgts ocorrencia : this.getFgts().getOcorrencias()) {
                ocorrencia.setTaxaDeJuros(null);
            }
            return;
        }
        Set<OcorrenciaDeFgts> ocorrencias = this.getFgts().getOcorrencias();
        for (OcorrenciaDeFgts ocorrencia : ocorrencias) {
            taxaDeJuros = this.calcularTaxaDeJuros(ocorrencia.getOcorrencia());
            ocorrencia.setTaxaDeJuros(taxaDeJuros);
        }
        if (this.getFgts().getDeduzirDoFGTS().booleanValue()) {
            for (OperacaoDeFgts operacao : this.getFgts().getOperacoesDeFgts()) {
                taxaDeJuros = this.calcularTaxaDeJuros(operacao.getCompetencia());
                operacao.setTaxaDeJuros(taxaDeJuros);
            }
        }
    }

    public Fgts getFgts() {
        return this.fgts;
    }

    public void setFgts(Fgts fgts) {
        this.fgts = fgts;
    }
}

