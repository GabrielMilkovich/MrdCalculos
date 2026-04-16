/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.OpcaoDeIndiceDeCorrecaoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.AliquotaDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.OcorrenciaDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.PrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.TabelaDeJurosDePrevidenciaPrivada;
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

public class MaquinaDeCalculoDePrevidenciaPrivada
implements Serializable {
    private static final long serialVersionUID = -2651501454514318120L;
    private PrevidenciaPrivada previdenciaPrivada;
    private TabelaDeJurosDePrevidenciaPrivada tabelaDeJuros;

    public MaquinaDeCalculoDePrevidenciaPrivada(PrevidenciaPrivada previdenciaPrivada) {
        this.previdenciaPrivada = previdenciaPrivada;
    }

    private void limparOcorrencias() {
        if (Utils.naoNulo(this.previdenciaPrivada) && Utils.naoNulo(this.previdenciaPrivada.getOcorrencias()) && !this.previdenciaPrivada.getOcorrencias().isEmpty()) {
            ArrayList<OcorrenciaDePrevidenciaPrivada> ocorrencias = new ArrayList<OcorrenciaDePrevidenciaPrivada>();
            for (OcorrenciaDePrevidenciaPrivada ocorrencia : this.previdenciaPrivada.getOcorrencias()) {
                ocorrencias.add(ocorrencia);
            }
            this.previdenciaPrivada.removerDeOcorrencias(ocorrencias, false);
            this.previdenciaPrivada.getOcorrencias().clear();
        }
    }

    /*
     * WARNING - void declaration
     */
    public void liquidar() {
        void var6_12;
        boolean usaIndiceTrabalhista;
        this.limparOcorrencias();
        Calculo calculo = this.previdenciaPrivada.getCalculo();
        ArrayList<VerbaDeCalculo> verbas = new ArrayList<VerbaDeCalculo>();
        for (VerbaDeCalculo verbaDeCalculo : calculo.getVerbasAtivas()) {
            if (!verbaDeCalculo.getIncidenciaPrevidenciaPrivada().booleanValue()) continue;
            verbas.add(verbaDeCalculo);
        }
        ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>> ocorrenciasDaVerba = new ArrayList<OptimizerListSearch<Competencia, OcorrenciaDeVerba>>();
        for (Object verba : verbas) {
            ocorrenciasDaVerba.add(((VerbaDeCalculo)verba).getOcorrenciasAtivasOptimizerListSearch());
        }
        Competencia competencia = new Competencia();
        for (AliquotaDePrevidenciaPrivada aliquotaDePrevidenciaPrivada : this.previdenciaPrivada.getAliquotas()) {
            List<Periodo> periodos = HelperDate.breakInMonths(aliquotaDePrevidenciaPrivada.getDataInicioPeriodo(), aliquotaDePrevidenciaPrivada.getDataTerminoPeriodo());
            for (Periodo periodo : periodos) {
                competencia.update(periodo.getInicial());
                BigDecimal somaDasDiferencas = BigDecimal.ZERO;
                boolean existeOcorrencia = false;
                for (OptimizerListSearch optimizerListSearch : ocorrenciasDaVerba) {
                    Iterator ocorrenciasDeVerba = optimizerListSearch.search(competencia);
                    while (Utils.naoNulo(ocorrenciasDeVerba) && ocorrenciasDeVerba.hasNext()) {
                        BigDecimal base;
                        OcorrenciaDeVerba ocorrenciaDeVerba = (OcorrenciaDeVerba)ocorrenciasDeVerba.next();
                        if (!Utils.naoNulo(ocorrenciaDeVerba) || !Utils.naoNulo(base = ocorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias())) continue;
                        existeOcorrencia = true;
                        somaDasDiferencas = somaDasDiferencas.add(Utils.zerarSeNegativo(base));
                    }
                }
                if (!existeOcorrencia) continue;
                OcorrenciaDePrevidenciaPrivada ocorrencia = new OcorrenciaDePrevidenciaPrivada(this.previdenciaPrivada);
                ocorrencia.setCompetencia(periodo.getInicial());
                ocorrencia.setAliquota(aliquotaDePrevidenciaPrivada.getAliquota());
                ocorrencia.setValorBase(somaDasDiferencas);
                this.previdenciaPrivada.getOcorrencias().add(ocorrencia);
            }
        }
        HelperDate dataInicial = null;
        Iterator<OcorrenciaDePrevidenciaPrivada> iterator = this.previdenciaPrivada.getOcorrencias().iterator();
        if (iterator.hasNext()) {
            OcorrenciaDePrevidenciaPrivada ocorrencia = iterator.next();
            dataInicial = HelperDate.getInstance(ocorrencia.getCompetencia());
            dataInicial.removeTime();
        }
        if (Utils.nulo(dataInicial)) {
            return;
        }
        IndiceMonetarioEnum indiceMonetarioEnum = calculo.getAtualizacaoMonetaria();
        boolean bl = usaIndiceTrabalhista = OpcaoDeIndiceDeCorrecaoEnum.UTILIZAR_INDICE_TRABALHISTA == calculo.getParametrosDeAtualizacao().getIndiceDeCorrecaoDePrevidenciaPrivada();
        if (!usaIndiceTrabalhista) {
            IndiceMonetarioEnum indiceMonetarioEnum2 = calculo.getParametrosDeAtualizacao().getOutroIndiceDeCorrecaoDePrevidenciaPrivada();
        }
        TabelaDeCorrecaoMonetaria tabelaDeCorrecaoMonetaria = new TabelaDeCorrecaoMonetaria(usaIndiceTrabalhista, (IndiceMonetarioEnum)var6_12, calculo.getIndicesAcumulados(), calculo.getIgnorarTaxaCorrecaoNegativa());
        Periodo periodoAbrangente = new Periodo();
        periodoAbrangente.setInicial(dataInicial.getDate());
        periodoAbrangente.setFinal(calculo.getDataDeLiquidacao());
        tabelaDeCorrecaoMonetaria.setOrigemCalculo(Boolean.TRUE);
        tabelaDeCorrecaoMonetaria.carregarTabela(periodoAbrangente);
        for (OcorrenciaDePrevidenciaPrivada ocorrenciaDePrevidenciaPrivada : this.previdenciaPrivada.getOcorrencias()) {
            ocorrenciaDePrevidenciaPrivada.setIndiceAcumulado(tabelaDeCorrecaoMonetaria.obterValorAcumuladoDoIndice(ocorrenciaDePrevidenciaPrivada.getCompetencia()));
        }
    }

    private BigDecimal calcularTaxaDeJuros(Date data) {
        if (Utils.nulo(this.tabelaDeJuros)) {
            this.tabelaDeJuros = new TabelaDeJurosDePrevidenciaPrivada(this.previdenciaPrivada.getCalculo());
        }
        return this.tabelaDeJuros.calcularTaxaDeJuros(data);
    }

    public void calcularJuros() {
        this.tabelaDeJuros = null;
        Set<OcorrenciaDePrevidenciaPrivada> ocorrencias = this.previdenciaPrivada.getOcorrencias();
        for (OcorrenciaDePrevidenciaPrivada ocorrenciaDePrevidenciaPrivada : ocorrencias) {
            BigDecimal taxaDeJuros = this.calcularTaxaDeJuros(ocorrenciaDePrevidenciaPrivada.getCompetencia());
            ocorrenciaDePrevidenciaPrivada.setTaxaDeJuros(taxaDeJuros);
        }
    }

    public PrevidenciaPrivada getPrevidenciaPrivada() {
        return this.previdenciaPrivada;
    }

    public void setPrevidenciaPrivada(PrevidenciaPrivada previdenciaPrivada) {
        this.previdenciaPrivada = previdenciaPrivada;
    }
}

