/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import java.math.BigDecimal;
import java.util.Date;

public abstract class InssJRAdapter
extends JRAdapter {
    public abstract boolean getMostrarSecaoSalarioDevidoReclamado();

    public abstract boolean getMostrarSecaoSalarioDevidoReclamante();

    public abstract boolean getMostrarSecaoSalarioDevidoEmpresa();

    public abstract boolean getMostrarSecaoSalarioDevidoSAT();

    public abstract boolean getMostrarSecaoSalarioDevidoTerceiros();

    public abstract boolean getMostrarSecaoSalarioPagoSegurado();

    public abstract boolean getMostrarSecaoSalarioPagoEmpresa();

    public abstract boolean getMostrarSecaoSalarioPagoSAT();

    public abstract boolean getMostrarSecaoSalarioPagoTerceiros();

    public abstract String getFormulaDevido();

    public abstract String getFormulaPago();

    public abstract boolean getDataPrimeiraOcorrenciaDevidoMaiorQue1986();

    public abstract boolean getDataPrimeiraOcorrenciaPagoMaiorQue1986();

    public abstract Periodo getPeriodoSalariosDevidos();

    public abstract Periodo getPeriodoSalariosPagos();

    public abstract JRAdapterDataSource<OcorrenciaDeInssAdapter> getOcorrenciasSeguradoDevidoReclamante();

    public abstract BigDecimal getValorTotalOcorrenciasDevidoReclamante();

    public abstract JRAdapterDataSource<OcorrenciaDeInssAdapter> getOcorrenciasSeguradoDevidoReclamado();

    public abstract BigDecimal getValorTotalOcorrenciasDevidoReclamado();

    public abstract BigDecimal getTotalDeJurosOcorrenciasDevidoReclamado();

    public abstract BigDecimal getTotalDeMultaOcorrenciasDevidoReclamado();

    public abstract BigDecimal getTotalGeralOcorrenciasDevidoReclamado();

    public abstract JRAdapterDataSource<OcorrenciaDeInssAdapter> getOcorrenciasSeguradoDevidoEmpresa();

    public abstract BigDecimal getValorTotalOcorrenciasDevidoEmpresa();

    public abstract BigDecimal getTotalDeJurosOcorrenciasDevidoEmpresa();

    public abstract BigDecimal getTotalDeMultaOcorrenciasDevidoEmpresa();

    public abstract BigDecimal getTotalGeralOcorrenciasDevidoEmpresa();

    public abstract JRAdapterDataSource<OcorrenciaDeInssAdapter> getOcorrenciasSeguradoDevidoSAT();

    public abstract BigDecimal getValorTotalOcorrenciasDevidoSAT();

    public abstract BigDecimal getTotalDeJurosOcorrenciasDevidoSAT();

    public abstract BigDecimal getTotalDeMultaOcorrenciasDevidoSAT();

    public abstract BigDecimal getTotalGeralOcorrenciasDevidoSAT();

    public abstract JRAdapterDataSource<OcorrenciaDeInssAdapter> getOcorrenciasSeguradoDevidoTerceiros();

    public abstract BigDecimal getValorTotalOcorrenciasDevidoTerceiros();

    public abstract BigDecimal getTotalDeJurosOcorrenciasDevidoTerceiros();

    public abstract BigDecimal getTotalDeMultaOcorrenciasDevidoTerceiros();

    public abstract BigDecimal getTotalGeralOcorrenciasDevidoTerceiros();

    public abstract JRAdapterDataSource<OcorrenciaDeInssAdapter> getOcorrenciasPagoSegurado();

    public abstract BigDecimal getValorTotalOcorrenciasPagoSegurado();

    public abstract BigDecimal getTotalDeJurosOcorrenciasPagoSegurado();

    public abstract BigDecimal getTotalDeMultaOcorrenciasPagoSegurado();

    public abstract BigDecimal getTotalGeralOcorrenciasPagoSegurado();

    public abstract JRAdapterDataSource<OcorrenciaDeInssAdapter> getOcorrenciasPagoEmpresa();

    public abstract BigDecimal getValorTotalOcorrenciasPagoEmpresa();

    public abstract BigDecimal getTotalDeJurosOcorrenciasPagoEmpresa();

    public abstract BigDecimal getTotalDeMultaOcorrenciasPagoEmpresa();

    public abstract BigDecimal getTotalGeralOcorrenciasPagoEmpresa();

    public abstract JRAdapterDataSource<OcorrenciaDeInssAdapter> getOcorrenciasPagoSAT();

    public abstract BigDecimal getValorTotalOcorrenciasPagoSAT();

    public abstract BigDecimal getTotalDeJurosOcorrenciasPagoSAT();

    public abstract BigDecimal getTotalDeMultaOcorrenciasPagoSAT();

    public abstract BigDecimal getTotalGeralOcorrenciasPagoSAT();

    public abstract JRAdapterDataSource<OcorrenciaDeInssAdapter> getOcorrenciasPagoTerceiros();

    public abstract BigDecimal getValorTotalOcorrenciasPagoTerceiros();

    public abstract BigDecimal getTotalDeJurosOcorrenciasPagoTerceiros();

    public abstract BigDecimal getTotalDeMultaOcorrenciasPagoTerceiros();

    public abstract BigDecimal getTotalGeralOcorrenciasPagoTerceiros();

    public abstract class OcorrenciaDeInssAdapter
    extends JRAdapter {
        public abstract Date getCompetenciaOcorrencia();

        public abstract BigDecimal getSalarioPago();

        public abstract BigDecimal getAliquota();

        public abstract BigDecimal getInssSalarioPago();

        public abstract BigDecimal getInssTeto();

        public abstract BigDecimal getSalarioDevido();

        public abstract BigDecimal getSalarioTotal();

        public abstract BigDecimal getAliquotaCheia();

        public abstract BigDecimal getDevido();

        public abstract BigDecimal getInssRecolhido();

        public abstract BigDecimal getIndiceCorrecao();

        public abstract BigDecimal getValorCorrigido();

        public abstract BigDecimal getJuros();

        public abstract BigDecimal getMulta();

        public abstract BigDecimal getTotal();
    }
}

