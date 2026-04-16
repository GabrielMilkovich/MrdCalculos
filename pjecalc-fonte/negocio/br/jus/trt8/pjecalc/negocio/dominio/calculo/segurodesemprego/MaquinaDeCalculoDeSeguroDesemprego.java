/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoIntegralizar;
import br.jus.trt8.pjecalc.negocio.constantes.FaseDoCalculoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.ModoDeCalculoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoSalarioPagoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorSeguroDesempregoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.TabelaDeJurosDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.ItemHistoricoSalarialDeSeguroDesemprego;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.ItemSalarioDevidoDeSeguroDesemprego;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.SeguroDesemprego;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.salariominimo.nacional.SalarioMinimoNacional;
import br.jus.trt8.pjecalc.negocio.dominio.segurodesemprego.TabelaSeguroDesemprego;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.SimuladorDeBaseParaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.TabelaDeCorrecaoMonetaria;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

public class MaquinaDeCalculoDeSeguroDesemprego
implements Serializable {
    private static final long serialVersionUID = -8727723540524745165L;
    private SeguroDesemprego seguroDesemprego;
    private TabelaDeJurosDoCalculo tabelaDeJuros;
    private List<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>> ocorrenciasDoHistorico;
    private List<OptimizerListSearch<Competencia, OcorrenciaDeVerba>> ocorrenciasDaVerba;
    private Map<VerbaDeCalculo, LogicoEnum> mapaDeIntegralizacaoDeVerbas;

    public MaquinaDeCalculoDeSeguroDesemprego(SeguroDesemprego seguroDesemprego) {
        this.seguroDesemprego = seguroDesemprego;
    }

    public void liquidar() {
        if (Boolean.TRUE.equals(this.seguroDesemprego.getApurarSeguroDesemprego())) {
            TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = this.carregarTabelaParaALiquidacao();
            this.seguroDesemprego.setIndiceDeCorrecao(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(this.seguroDesemprego.getCalculo().getDataDemissao()));
            if (this.seguroDesemprego.getTipoValorDoSeguroDesemprego() == TipoValorSeguroDesempregoEnum.CALCULADO) {
                if (this.seguroDesemprego.getEmpregadoDomestico().booleanValue()) {
                    Date dataDemissao = this.seguroDesemprego.getCalculo().getDataDemissao();
                    Competencia competenciaDataDemissao = new Competencia(dataDemissao);
                    BigDecimal valorSalarioMinimoNaDataDaDemissao = SalarioMinimoNacional.obterListaOtimizadaDoPeriodo(dataDemissao, dataDemissao).valueOf(competenciaDataDemissao);
                    this.seguroDesemprego.setRemuneracaoMensal(BigDecimal.ZERO);
                    this.seguroDesemprego.setLimiteFaixa1(BigDecimal.ZERO);
                    this.seguroDesemprego.setValorPercentualFaixa1(BigDecimal.ZERO);
                    this.seguroDesemprego.setValorPercentualFaixa2(BigDecimal.ZERO);
                    this.seguroDesemprego.setSomaFaixa2(BigDecimal.ZERO);
                    this.seguroDesemprego.setValorPiso(BigDecimal.ZERO);
                    this.seguroDesemprego.setValorTeto(BigDecimal.ZERO);
                    this.seguroDesemprego.setTipoSalarioPago(TipoSalarioPagoEnum.NENHUM);
                    this.seguroDesemprego.getItensSalarioDevidoDeSeguroDesemprego().clear();
                    this.seguroDesemprego.getItensHistoricoSalarialDeSegudoDesemprego().clear();
                    this.seguroDesemprego.setValorSeguroDesemprego(valorSalarioMinimoNaDataDaDemissao);
                } else {
                    BigDecimal valorSalariosPagos = this.calculaValorSalariosPagosParaLiquidacao();
                    BigDecimal somaDasDiferencas = this.calculaValorDaMediaDasDiferencasDasTresOcorrenciasAnterioresADemissao();
                    BigDecimal valorRemuneracaoMensal = null;
                    if (Utils.naoNulo(somaDasDiferencas)) {
                        valorRemuneracaoMensal = Utils.somar(somaDasDiferencas, valorRemuneracaoMensal, somaDasDiferencas);
                    }
                    if (Utils.naoNulo(valorSalariosPagos)) {
                        valorRemuneracaoMensal = Utils.somar(valorSalariosPagos, valorRemuneracaoMensal, valorSalariosPagos);
                    }
                    this.seguroDesemprego.setRemuneracaoMensal(valorRemuneracaoMensal);
                    TabelaSeguroDesemprego tabelaSeguroDesemprego = TabelaSeguroDesemprego.obterTabelaDa(this.seguroDesemprego.getCalculo().getDataDemissao());
                    this.seguroDesemprego.setLimiteFaixa1(tabelaSeguroDesemprego.getValorFinalFaixa1());
                    this.seguroDesemprego.setValorPercentualFaixa1(tabelaSeguroDesemprego.getValorPercentualFaixa1());
                    this.seguroDesemprego.setValorPercentualFaixa2(tabelaSeguroDesemprego.getValorPercentualFaixa2());
                    this.seguroDesemprego.setSomaFaixa2(tabelaSeguroDesemprego.getSomaFaixa2());
                    this.seguroDesemprego.setValorPiso(tabelaSeguroDesemprego.getValorPiso());
                    this.seguroDesemprego.setValorTeto(tabelaSeguroDesemprego.getValorTeto());
                    this.seguroDesemprego.setValorSeguroDesemprego(this.encontraOValorDoSeguroDesemprego());
                }
            } else {
                this.seguroDesemprego.setRemuneracaoMensal(BigDecimal.ZERO);
                this.seguroDesemprego.setLimiteFaixa1(BigDecimal.ZERO);
                this.seguroDesemprego.setValorPercentualFaixa1(BigDecimal.ZERO);
                this.seguroDesemprego.setValorPercentualFaixa2(BigDecimal.ZERO);
                this.seguroDesemprego.setSomaFaixa2(BigDecimal.ZERO);
                this.seguroDesemprego.setValorPiso(BigDecimal.ZERO);
                this.seguroDesemprego.setValorTeto(BigDecimal.ZERO);
                this.seguroDesemprego.setNumeroDeParcelas(1);
                this.seguroDesemprego.setTipoSalarioPago(TipoSalarioPagoEnum.HISTORICO_SALARIAL);
                this.seguroDesemprego.getItensSalarioDevidoDeSeguroDesemprego().clear();
                this.seguroDesemprego.getItensHistoricoSalarialDeSegudoDesemprego().clear();
            }
        }
    }

    private BigDecimal calculaValorDaMediaDasDiferencasDasTresOcorrenciasAnterioresADemissao() {
        if (Utils.nulo(this.ocorrenciasDaVerba)) {
            this.carregarOcorrenciasDaVerba();
        }
        List<Competencia> competenciasParaMedias = this.encontraTresUltimasCompetenciasParaMediasAPartirDa(this.seguroDesemprego.getCalculo().getDataDemissao());
        Calculo calculo = this.seguroDesemprego.getCalculo();
        BigDecimal somaDasMedias = null;
        for (OptimizerListSearch<Competencia, OcorrenciaDeVerba> optimizerSearch : this.ocorrenciasDaVerba) {
            BigDecimal media = null;
            int quantidadeParaMedia = 0;
            for (Competencia competenciaParaMedia : competenciasParaMedias) {
                Iterator<OcorrenciaDeVerba> ocorrenciasDeVerba = optimizerSearch.search(competenciaParaMedia);
                while (Utils.naoNulo(ocorrenciasDeVerba) && ocorrenciasDeVerba.hasNext()) {
                    OcorrenciaDeVerba ocorrenciaDeVerba = ocorrenciasDeVerba.next();
                    if (!Utils.naoNulo(ocorrenciaDeVerba)) continue;
                    BigDecimal novaDiferenca = ocorrenciaDeVerba.getDiferenca();
                    BigDecimal novaDiferencaIntegral = ocorrenciaDeVerba.getDiferencaIntegral();
                    if (LogicoEnum.SIM.equals((Object)this.mapaDeIntegralizacaoDeVerbas.get(ocorrenciaDeVerba.getVerbaDeCalculo()))) {
                        if (Utils.naoNulo(novaDiferencaIntegral)) {
                            novaDiferenca = novaDiferencaIntegral;
                        } else {
                            Periodo periodoParaIntegralizacao = new Periodo(ocorrenciaDeVerba.getDataInicial(), ocorrenciaDeVerba.getDataFinal());
                            int qtdDias = periodoParaIntegralizacao.totalDeDias();
                            int diasParaExcluir = 0;
                            if (ocorrenciaDeVerba.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
                                diasParaExcluir += calculo.obterDiasFerias(periodoParaIntegralizacao);
                            }
                            if (qtdDias - diasParaExcluir == 31) {
                                diasParaExcluir = 1;
                            }
                            if (ocorrenciaDeVerba.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
                                diasParaExcluir += calculo.obterFaltasJustificadas(periodoParaIntegralizacao);
                            }
                            if (ocorrenciaDeVerba.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
                                diasParaExcluir += calculo.obterFaltasNaoJustificadas(periodoParaIntegralizacao);
                            }
                            if ((qtdDias -= diasParaExcluir) < 0) {
                                qtdDias = 0;
                            }
                            if (qtdDias == 0) {
                                HelperDate dataInicioPeriodo = HelperDate.getInstance(competenciaParaMedia.getData()).setDay(1);
                                HelperDate dataFimPeriodo = HelperDate.getInstance(competenciaParaMedia.getData()).setDay(dataInicioPeriodo.daysInMonth());
                                Periodo periodo = new Periodo(dataInicioPeriodo.getDate(), dataFimPeriodo.getDate());
                                ParametroDoTermo parametroSimulado = new ParametroDoTermo(calculo, ocorrenciaDeVerba.getVerbaDeCalculo(), periodo, ModoDeCalculoEnum.LIQUIDACAO, FaseDoCalculoEnum.CALCULANDO_VALOR_DEVIDO, null, null);
                                novaDiferenca = SimuladorDeBaseParaVerba.obterValorTeoricoParaMesSemFeriasOuFaltas(ocorrenciaDeVerba.getVerbaDeCalculo(), periodo, parametroSimulado);
                            } else {
                                CalculoDoIntegralizar integralizar = new CalculoDoIntegralizar(periodoParaIntegralizacao, novaDiferenca, diasParaExcluir);
                                integralizar.executar();
                                novaDiferenca = integralizar.getResultado();
                            }
                        }
                    }
                    if (Utils.nulo(media)) {
                        media = BigDecimal.ZERO;
                    }
                    ++quantidadeParaMedia;
                    media = media.add(Utils.zerarSeNegativo(novaDiferenca), Utils.CONTEXTO_MATEMATICO);
                }
            }
            if (!Utils.naoNulo(media) || quantidadeParaMedia <= 0) continue;
            if (Utils.nulo(somaDasMedias)) {
                somaDasMedias = BigDecimal.ZERO;
            }
            somaDasMedias = somaDasMedias.add(media.divide(new BigDecimal(quantidadeParaMedia), Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO);
        }
        return Utils.nulo(somaDasMedias) ? BigDecimal.ZERO : somaDasMedias;
    }

    private BigDecimal calculaValorSalariosPagosParaLiquidacao() {
        switch (this.seguroDesemprego.getTipoSalarioPago()) {
            case ULTIMA_REMUNERACAO: {
                return this.seguroDesemprego.getCalculo().getValorUltimaRemuneracao();
            }
            case MAIOR_REMUNERACAO: {
                return this.seguroDesemprego.getCalculo().getValorMaiorRemuneracao();
            }
            case HISTORICO_SALARIAL: {
                return this.calculaValorDaMediaDosHistoricosSalariaisDasTresOcorrenciasAnterioresADemissao();
            }
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal calculaValorDaMediaDosHistoricosSalariaisDasTresOcorrenciasAnterioresADemissao() {
        if (Utils.nulo(this.ocorrenciasDoHistorico)) {
            this.carregarOcorrenciasDoHistorico();
        }
        List<Competencia> competenciasParaMedias = this.encontraTresUltimasCompetenciasParaMediasAPartirDa(this.seguroDesemprego.getCalculo().getDataDemissao());
        BigDecimal somaDasMedias = null;
        for (OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> optimizerSearch : this.ocorrenciasDoHistorico) {
            BigDecimal media = null;
            int quantidadeParaMedia = 0;
            for (Competencia competenciaParaMedia : competenciasParaMedias) {
                Iterator<OcorrenciaDoHistoricoSalarial> ocorrenciasDeHistorico = optimizerSearch.search(competenciaParaMedia);
                while (Utils.naoNulo(ocorrenciasDeHistorico) && ocorrenciasDeHistorico.hasNext()) {
                    OcorrenciaDoHistoricoSalarial ocorrenciaDeHistorico = ocorrenciasDeHistorico.next();
                    if (!Utils.naoNulo(ocorrenciaDeHistorico)) continue;
                    if (Utils.nulo(media)) {
                        media = BigDecimal.ZERO;
                    }
                    ++quantidadeParaMedia;
                    media = media.add(ocorrenciaDeHistorico.getValor(), Utils.CONTEXTO_MATEMATICO);
                }
            }
            if (!Utils.naoNulo(media) || quantidadeParaMedia <= 0) continue;
            if (Utils.nulo(somaDasMedias)) {
                somaDasMedias = BigDecimal.ZERO;
            }
            somaDasMedias = somaDasMedias.add(media.divide(new BigDecimal(quantidadeParaMedia), Utils.CONTEXTO_MATEMATICO), Utils.CONTEXTO_MATEMATICO);
        }
        return somaDasMedias;
    }

    private List<Competencia> encontraTresUltimasCompetenciasParaMediasAPartirDa(Date data) {
        ArrayList<Competencia> competencias = new ArrayList<Competencia>();
        HelperDate auxiliar = HelperDate.getCurrentCompetence(data);
        auxiliar.addMonth(-1);
        competencias.add(new Competencia(auxiliar.getDate()));
        auxiliar.addMonth(-1);
        competencias.add(new Competencia(auxiliar.getDate()));
        auxiliar.addMonth(-1);
        competencias.add(new Competencia(auxiliar.getDate()));
        return competencias;
    }

    private void carregarOcorrenciasDoHistorico() {
        this.ocorrenciasDoHistorico = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>>();
        for (ItemHistoricoSalarialDeSeguroDesemprego item : this.seguroDesemprego.getItensHistoricoSalarialDeSegudoDesemprego()) {
            this.ocorrenciasDoHistorico.add(item.getHistoricoSalarial().getListaDeOcorrenciasOtimizada());
        }
    }

    private void carregarOcorrenciasDaVerba() {
        this.ocorrenciasDaVerba = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>>();
        this.mapaDeIntegralizacaoDeVerbas = new HashMap<VerbaDeCalculo, LogicoEnum>();
        for (ItemSalarioDevidoDeSeguroDesemprego item : this.seguroDesemprego.getItensSalarioDevidoDeSeguroDesemprego()) {
            this.mapaDeIntegralizacaoDeVerbas.put(item.getVerbaDeCalculo(), item.getIntegralizar());
            this.ocorrenciasDaVerba.add(item.getVerbaDeCalculo().getOcorrenciasOptimizerListSearch());
        }
    }

    private BigDecimal encontraOValorDoSeguroDesemprego() {
        BigDecimal valorSeguroDesemprego = null;
        BigDecimal limiteFaixa1 = this.seguroDesemprego.getLimiteFaixa1();
        if (Utils.nulo(limiteFaixa1)) {
            limiteFaixa1 = new BigDecimal("9999999999999.00");
        }
        if (this.seguroDesemprego.getRemuneracaoMensal().compareTo(limiteFaixa1) <= 0) {
            valorSeguroDesemprego = this.seguroDesemprego.getRemuneracaoMensal().multiply(Utils.obterPercentualPara(this.seguroDesemprego.getValorPercentualFaixa1()), Utils.CONTEXTO_MATEMATICO);
        } else {
            valorSeguroDesemprego = this.seguroDesemprego.getRemuneracaoMensal().subtract(limiteFaixa1, Utils.CONTEXTO_MATEMATICO);
            valorSeguroDesemprego = valorSeguroDesemprego.multiply(Utils.obterPercentualPara(this.seguroDesemprego.getValorPercentualFaixa2()), Utils.CONTEXTO_MATEMATICO);
            valorSeguroDesemprego = valorSeguroDesemprego.add(this.seguroDesemprego.getSomaFaixa2(), Utils.CONTEXTO_MATEMATICO);
        }
        if (valorSeguroDesemprego.compareTo(this.seguroDesemprego.getValorPiso()) < 0) {
            valorSeguroDesemprego = this.seguroDesemprego.getValorPiso();
        }
        if (valorSeguroDesemprego.compareTo(this.seguroDesemprego.getValorTeto()) > 0) {
            valorSeguroDesemprego = this.seguroDesemprego.getValorTeto();
        }
        return valorSeguroDesemprego;
    }

    private TabelaDeCorrecaoMonetaria carregarTabelaParaALiquidacao() {
        Calculo calculo = this.seguroDesemprego.getCalculo();
        if (Utils.nulo(calculo.getDataDemissao())) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0031, "Data de demiss\u00e3o obrigat\u00f3ria para Seguro Desemprego"));
        }
        IndiceMonetarioEnum indiceMonetario = calculo.getAtualizacaoMonetaria();
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(indiceMonetario, calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
        Periodo periodoAbrangente = new Periodo();
        periodoAbrangente.setInicial(HelperDate.getCurrentCompetence(calculo.getDataDemissao()).addMonth(-1).getDate());
        periodoAbrangente.setFinal(calculo.getDataDeLiquidacao());
        tabelaDeCorrecaoMonetaria.marcaComoCorrecaoSeguroDesemprego();
        tabelaDeCorrecaoMonetaria.setOrigemCalculo(Boolean.TRUE);
        tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
        return tabelaDeCorrecaoMonetaria;
    }

    public void calcularJuros() {
        Date data = Utils.naoNulo(this.seguroDesemprego.getCalculo().getDataDemissao()) ? this.seguroDesemprego.getCalculo().getDataDemissao() : this.seguroDesemprego.getCalculo().getDataTerminoCalculo();
        this.tabelaDeJuros = new TabelaDeJurosDoCalculo(this.seguroDesemprego.getCalculo());
        this.seguroDesemprego.setTaxaDeJuros(this.tabelaDeJuros.calcularTaxaDeJuros(data, data, true, false));
    }

    public SeguroDesemprego getSeguroDesemprego() {
        return this.seguroDesemprego;
    }

    public void setSeguroDesemprego(SeguroDesemprego seguroDesemprego) {
        this.seguroDesemprego = seguroDesemprego;
    }
}

