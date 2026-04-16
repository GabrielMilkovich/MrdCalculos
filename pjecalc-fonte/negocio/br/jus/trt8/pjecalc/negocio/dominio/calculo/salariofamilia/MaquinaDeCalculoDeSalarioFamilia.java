/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.comum.Total;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoIntegralizar;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoProporcionalizar;
import br.jus.trt8.pjecalc.negocio.constantes.FaseDoCalculoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ModoDeCalculoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.TabelaDeJurosDoCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.ItemHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.ItemSalarioDevido;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.OcorrenciaDeSalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.OcorrenciaDoHistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.salariofamilia.TabelaSalarioFamilia;
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
import java.util.Set;

public class MaquinaDeCalculoDeSalarioFamilia
implements Serializable {
    private static final long serialVersionUID = -2575817932206269159L;
    private SalarioFamilia salarioFamilia;
    private TabelaDeJurosDoCalculo tabelaDeJuros;
    private List<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>> ocorrenciasDoHistorico;
    private List<OptimizerListSearch<Competencia, OcorrenciaDeVerba>> ocorrenciasDaVerba;
    private Map<VerbaDeCalculo, LogicoEnum> mapaDeIntegralizacaoDeVerbas;
    private Map<Competencia, TabelaSalarioFamilia> tabelasDasCompetencias;

    public MaquinaDeCalculoDeSalarioFamilia(SalarioFamilia salarioFamilia) {
        this.salarioFamilia = salarioFamilia;
    }

    private void limparOcorrencias() {
        if (Utils.naoNulo(this.salarioFamilia) && Utils.naoNulo(this.salarioFamilia.getOcorrencias()) && !this.salarioFamilia.getOcorrencias().isEmpty()) {
            ArrayList<OcorrenciaDeSalarioFamilia> ocorrencias = new ArrayList<OcorrenciaDeSalarioFamilia>();
            for (OcorrenciaDeSalarioFamilia ocorrencia : this.salarioFamilia.getOcorrencias()) {
                ocorrencias.add(ocorrencia);
            }
            this.salarioFamilia.removerDeOcorrencias(ocorrencias, false);
            this.salarioFamilia.getOcorrencias().clear();
        }
    }

    public void liquidar() {
        this.limparOcorrencias();
        if (Boolean.TRUE.equals(this.salarioFamilia.getApurarSalarioFamilia())) {
            TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = this.carregarTabelaParaALiquidacao();
            List<Periodo> periodos = HelperDate.breakInMonths(this.salarioFamilia.getDataInicial(), this.salarioFamilia.getDataFinal());
            Competencia competencia = new Competencia();
            for (Periodo periodo : periodos) {
                competencia.update(periodo.getInicial());
                OcorrenciaDeSalarioFamilia ocorrenciaDeSalarioFamilia = new OcorrenciaDeSalarioFamilia(this.salarioFamilia);
                this.salarioFamilia.getOcorrencias().add(ocorrenciaDeSalarioFamilia);
                ocorrenciaDeSalarioFamilia.setDataInicioOcorrencia(periodo.getInicial());
                ocorrenciaDeSalarioFamilia.setDataFimOcorrencia(periodo.getFinal());
                ocorrenciaDeSalarioFamilia.setQuantidadeFilhos(this.salarioFamilia.encontraQuantidadeDeFilhosNa(competencia));
                BigDecimal valorSalariosPagos = this.calculaValorSalariosPagosParaLiquidacaoNa(competencia);
                BigDecimal somaDasDiferencas = this.calculaValorSomaDasDiferencasParaO(periodo);
                BigDecimal valorRemuneracaoMensal = BigDecimal.ZERO;
                if (Utils.naoNulo(somaDasDiferencas)) {
                    valorRemuneracaoMensal = Utils.somar(somaDasDiferencas, valorRemuneracaoMensal, somaDasDiferencas);
                }
                if (Utils.naoNulo(valorSalariosPagos)) {
                    valorRemuneracaoMensal = Utils.somar(valorSalariosPagos, valorRemuneracaoMensal, valorSalariosPagos);
                }
                ocorrenciaDeSalarioFamilia.setValorRemuneracaoMensal(valorRemuneracaoMensal);
                ocorrenciaDeSalarioFamilia.setValorSalarioFamilia(this.encontraOValorDoSalarioFamiliaParaO(valorRemuneracaoMensal, competencia));
                ocorrenciaDeSalarioFamilia.setIndiceAcumulado(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(ocorrenciaDeSalarioFamilia.getDataInicioOcorrencia()));
            }
        }
    }

    private BigDecimal calculaValorSomaDasDiferencasParaO(Periodo periodo) {
        if (Utils.nulo(this.ocorrenciasDaVerba)) {
            this.carregarOcorrenciasDaVerba();
        }
        Competencia competencia = new Competencia();
        competencia.update(periodo.getInicial());
        Calculo calculo = this.salarioFamilia.getCalculo();
        Total somaDasDiferencas = null;
        for (OptimizerListSearch<Competencia, OcorrenciaDeVerba> optimizerSearch : this.ocorrenciasDaVerba) {
            Iterator<OcorrenciaDeVerba> ocorrenciasDeVerba = optimizerSearch.search(competencia);
            while (Utils.naoNulo(ocorrenciasDeVerba) && ocorrenciasDeVerba.hasNext()) {
                OcorrenciaDeVerba ocorrenciaDeVerba = ocorrenciasDeVerba.next();
                if (!Utils.naoNulo(ocorrenciaDeVerba) || !ocorrenciaDeVerba.getAtivo().booleanValue()) continue;
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
                            ParametroDoTermo parametroSimulado = new ParametroDoTermo(calculo, ocorrenciaDeVerba.getVerbaDeCalculo(), periodo, ModoDeCalculoEnum.LIQUIDACAO, FaseDoCalculoEnum.CALCULANDO_VALOR_DEVIDO, null, null);
                            novaDiferenca = SimuladorDeBaseParaVerba.obterValorTeoricoParaMesSemFeriasOuFaltas(ocorrenciaDeVerba.getVerbaDeCalculo(), periodo, parametroSimulado);
                        } else {
                            CalculoDoIntegralizar integralizar = new CalculoDoIntegralizar(periodoParaIntegralizacao, novaDiferenca, diasParaExcluir);
                            integralizar.executar();
                            novaDiferenca = integralizar.getResultado();
                        }
                    }
                }
                if (Utils.nulo(somaDasDiferencas)) {
                    somaDasDiferencas = Total.newInstance(true);
                }
                somaDasDiferencas.acumular(Utils.zerarSeNegativo(novaDiferenca));
            }
        }
        return Utils.nulo(somaDasDiferencas) ? null : somaDasDiferencas.getValor();
    }

    private BigDecimal calculaValorSalariosPagosParaLiquidacaoNa(Competencia competencia) {
        switch (this.salarioFamilia.getTipoSalarioPago()) {
            case ULTIMA_REMUNERACAO: {
                return this.salarioFamilia.getCalculo().getValorUltimaRemuneracao();
            }
            case MAIOR_REMUNERACAO: {
                return this.salarioFamilia.getCalculo().getValorMaiorRemuneracao();
            }
            case HISTORICO_SALARIAL: {
                return this.calculaValorDaSomaDoHistoricoSalarialParaA(competencia);
            }
        }
        return null;
    }

    private BigDecimal calculaValorDaSomaDoHistoricoSalarialParaA(Competencia competencia) {
        if (Utils.nulo(this.ocorrenciasDoHistorico)) {
            this.carregarOcorrenciasDoHistorico();
        }
        BigDecimal somaDosHistoricos = null;
        for (OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial> optimizerSearch : this.ocorrenciasDoHistorico) {
            Iterator<OcorrenciaDoHistoricoSalarial> ocorrenciasDeHistorico = optimizerSearch.search(competencia);
            while (Utils.naoNulo(ocorrenciasDeHistorico) && ocorrenciasDeHistorico.hasNext()) {
                OcorrenciaDoHistoricoSalarial ocorrenciaDeHistorico = ocorrenciasDeHistorico.next();
                if (!Utils.naoNulo(ocorrenciaDeHistorico)) continue;
                if (Utils.nulo(somaDosHistoricos)) {
                    somaDosHistoricos = BigDecimal.ZERO;
                }
                somaDosHistoricos = somaDosHistoricos.add(ocorrenciaDeHistorico.getValor(), Utils.CONTEXTO_MATEMATICO);
            }
        }
        return somaDosHistoricos;
    }

    private void carregarOcorrenciasDoHistorico() {
        this.ocorrenciasDoHistorico = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDoHistoricoSalarial>>();
        for (ItemHistoricoSalarial item : this.salarioFamilia.getItensHistoricoSalarial()) {
            this.ocorrenciasDoHistorico.add(item.getHistoricoSalarial().getListaDeOcorrenciasOtimizada());
        }
    }

    private void carregarOcorrenciasDaVerba() {
        this.ocorrenciasDaVerba = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>>();
        this.mapaDeIntegralizacaoDeVerbas = new HashMap<VerbaDeCalculo, LogicoEnum>();
        for (ItemSalarioDevido item : this.salarioFamilia.getItensSalarioDevido()) {
            this.mapaDeIntegralizacaoDeVerbas.put(item.getVerbaDeCalculo(), item.getIntegralizar());
            this.ocorrenciasDaVerba.add(item.getVerbaDeCalculo().getOcorrenciasOptimizerListSearch());
        }
    }

    private BigDecimal encontraOValorDoSalarioFamiliaParaO(BigDecimal valorRemuneracaoMensal, Competencia competencia) {
        if (Utils.nulo(this.tabelasDasCompetencias)) {
            this.tabelasDasCompetencias = TabelaSalarioFamilia.obterTabelasDasCompetencias(this.salarioFamilia.getDataInicial(), this.salarioFamilia.getDataFinal());
        }
        BigDecimal valorSalarioFamilia = BigDecimal.ZERO;
        if (Utils.naoNulo(competencia)) {
            TabelaSalarioFamilia tabela = this.tabelasDasCompetencias.get(competencia);
            if (Utils.naoNulos(tabela, valorRemuneracaoMensal)) {
                valorSalarioFamilia = this.tabelasDasCompetencias.get(competencia).getValorSalarioFamiliaParaO(valorRemuneracaoMensal);
            }
        }
        valorSalarioFamilia = this.proporcionalizarValorSeNecessario(valorSalarioFamilia, competencia);
        return valorSalarioFamilia;
    }

    private BigDecimal proporcionalizarValorSeNecessario(BigDecimal valorSalarioFamilia, Competencia competencia) {
        if (Utils.naoNulo(valorSalarioFamilia) && HelperDate.compareMonthAndYear(competencia.getData(), this.salarioFamilia.getCalculo().getDataAdmissao())) {
            HelperDate dataInicial = HelperDate.getInstance(this.salarioFamilia.getCalculo().getDataAdmissao());
            HelperDate dataFinal = dataInicial.clone();
            dataFinal.setDay(dataFinal.daysInMonth());
            Periodo periodo = new Periodo(dataInicial.getDate(), dataFinal.getDate());
            CalculoDoProporcionalizar proporcionalizar = new CalculoDoProporcionalizar(periodo, valorSalarioFamilia);
            proporcionalizar.executar();
            valorSalarioFamilia = proporcionalizar.getResultado();
        }
        if (Utils.naoNulo(valorSalarioFamilia) && HelperDate.compareMonthAndYear(competencia.getData(), this.salarioFamilia.getCalculo().getDataDemissao())) {
            Periodo periodo = new Periodo(competencia.getData(), this.salarioFamilia.getCalculo().getDataDemissao());
            CalculoDoProporcionalizar proporcionalizar = new CalculoDoProporcionalizar(periodo, valorSalarioFamilia);
            proporcionalizar.executar();
            valorSalarioFamilia = proporcionalizar.getResultado();
        }
        return valorSalarioFamilia;
    }

    private TabelaDeCorrecaoMonetaria carregarTabelaParaALiquidacao() {
        Calculo calculo = this.salarioFamilia.getCalculo();
        IndiceMonetarioEnum indiceMonetario = calculo.getAtualizacaoMonetaria();
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(indiceMonetario, calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
        Periodo periodoAbrangente = new Periodo();
        periodoAbrangente.setInicial(this.salarioFamilia.getDataInicial());
        periodoAbrangente.setFinal(calculo.getDataDeLiquidacao());
        tabelaDeCorrecaoMonetaria.setOrigemCalculo(Boolean.TRUE);
        tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
        return tabelaDeCorrecaoMonetaria;
    }

    private BigDecimal calcularTaxaDeJuros(Date data) {
        if (Utils.nulo(this.tabelaDeJuros)) {
            this.tabelaDeJuros = new TabelaDeJurosDoCalculo(this.salarioFamilia.getCalculo());
        }
        return this.tabelaDeJuros.calcularTaxaDeJuros(data, data, true, false);
    }

    public void calcularJuros() {
        this.tabelaDeJuros = null;
        Set<OcorrenciaDeSalarioFamilia> ocorrencias = this.salarioFamilia.getOcorrencias();
        for (OcorrenciaDeSalarioFamilia ocorrenciaDeSalarioFamilia : ocorrencias) {
            BigDecimal taxaDeJuros = this.calcularTaxaDeJuros(ocorrenciaDeSalarioFamilia.getDataFimOcorrencia());
            ocorrenciaDeSalarioFamilia.setTaxaDeJuros(taxaDeJuros);
        }
    }

    public SalarioFamilia getSalarioFamilia() {
        return this.salarioFamilia;
    }

    public void setSalarioFamilia(SalarioFamilia salarioFamilia) {
        this.salarioFamilia = salarioFamilia;
    }
}

