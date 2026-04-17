/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;

public abstract class CustaAtualizacaoJRAdapter
extends JRAdapter {
    public abstract JRAdapterDataSource<CustaAtualizacaoAdapter> getCustasDaAtualizacao();

    public abstract class CustaItemAdapter
    extends JRAdapter {
        public abstract String getOcorrencia();

        public abstract String getBase();

        public abstract String getTaxa();

        public abstract String getPiso();

        public abstract String getTeto();

        public abstract String getDevido();

        public abstract String getValor();

        public abstract String getJuros();

        public abstract String getIndice();

        public abstract String getValorCorr();

        public abstract String getJurosCorr();

        public abstract String getJurosValorCorr();

        public abstract String getTipo();

        public abstract String getQtd();

        public abstract String getTotal();

        public abstract String getPago();

        public abstract String getDiferencaCustas();

        public abstract String getDiferencaJuros();

        public abstract String getTaxaPeriodo();

        public abstract String getDataFinal();
    }

    public abstract class CustaAtualizacaoAdapter
    extends JRAdapter {
        public abstract String getDataEvento();

        public abstract Boolean getMostrarCustasConhecimentoReclamadoCalculada();

        public abstract Boolean getMostrarCustasConhecimentoReclamadoInformada();

        public abstract Boolean getMostrarCustasConhecimentoReclamanteGrade();

        public abstract Boolean getMostrarCustasConhecimentoReclamanteCalculada();

        public abstract Boolean getMostrarCustasConhecimentoReclamanteInformada();

        public abstract Boolean getMostrarCustasLiquidacaoCalculada();

        public abstract Boolean getMostrarCustasLiquidacaoInformada();

        public abstract Boolean getMostrarCustasExecucaoCalculoExterno();

        public abstract Boolean getMostrarSaldoReclamado();

        public abstract Boolean getMostrarSaldoReclamante();

        public abstract Boolean getMostrarCustasFixas();

        public abstract Boolean getMostrarCustasAutos();

        public abstract Boolean getMostrarCustasArmazenamento();

        public abstract String getDataVencimentoCustasRemanescentesReclamado();

        public abstract String getValorCustasRemanescentesReclamado();

        public abstract String getValorJurosRemanescentesReclamado();

        public abstract String getIndiceCorrecaoCustasRemanescentesReclamado();

        public abstract String getValorCorrigidoDeCustasRemanescentesDoReclamado();

        public abstract String getValorCorrigidoDeJurosRemanescentesDoReclamado();

        public abstract String getTaxaJurosCustasRemanescentesReclamado();

        public abstract String getJurosDoPeriodoDeCustasRemanescentesDoReclamado();

        public abstract String getTotalDeJurosDeCustasRemanescentesDoReclamado();

        public abstract String getTotalCustasRemanescentesDoReclamado();

        public abstract String getDataOcorrenciaDiferencaReclamado();

        public abstract String getTotalValorCorrigidoReclamado();

        public abstract String getTotalJurosReclamado();

        public abstract String getTotalDevidoReclamado();

        public abstract String getValorPagoReclamado();

        public abstract String getDiferencaValorReclamado();

        public abstract String getDiferencaJurosReclamado();

        public abstract String getTotalDiferencaReclamado();

        public abstract String getDataVencimentoCustasRemanescentesReclamante();

        public abstract String getValorCustasRemanescentesReclamante();

        public abstract String getValorJurosRemanescentesReclamante();

        public abstract String getIndiceCorrecaoCustasRemanescentesReclamante();

        public abstract String getValorCorrigidoDeCustasRemanescentesDoReclamante();

        public abstract String getValorCorrigidoDeJurosRemanescentesDoReclamante();

        public abstract String getTaxaJurosCustasRemanescentesReclamante();

        public abstract String getJurosDoPeriodoDeCustasRemanescentesDoReclamante();

        public abstract String getTotalDeJurosDeCustasRemanescentesDoReclamante();

        public abstract String getTotalCustasRemanescentesDoReclamante();

        public abstract String getDataOcorrenciaDiferencaReclamante();

        public abstract String getTotalValorCorrigidoReclamante();

        public abstract String getTotalJurosReclamante();

        public abstract String getTotalDevidoReclamante();

        public abstract String getValorPagoReclamante();

        public abstract String getDiferencaValorReclamante();

        public abstract String getDiferencaJurosReclamante();

        public abstract String getTotalDiferencaReclamante();

        public abstract JRAdapterDataSource<CustaItemAdapter> getItensCustasConhecimentoReclamadoCalculado();

        public abstract JRAdapterDataSource<CustaItemAdapter> getItensCustasConhecimentoReclamadoInformado();

        public abstract JRAdapterDataSource<CustaItemAdapter> getItensCustasLiquidacaoCalculado();

        public abstract JRAdapterDataSource<CustaItemAdapter> getItensCustasLiquidacaoInformado();

        public abstract JRAdapterDataSource<CustaItemAdapter> getItensCustasExecucaoCalculoExterno();

        public abstract JRAdapterDataSource<CustaItemAdapter> getItensCustasFixas();

        public abstract JRAdapterDataSource<CustaItemAdapter> getItensCustasAutos();

        public abstract JRAdapterDataSource<CustaItemAdapter> getItensCustasArmazenamento();

        public abstract JRAdapterDataSource<CustaItemAdapter> getItensConhecimentoReclamanteCalculado();

        public abstract JRAdapterDataSource<CustaItemAdapter> getItensConhecimentoReclamanteInformado();
    }

    public abstract class Item {
    }
}

