/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.data.JRBeanCollectionDataSource
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import java.math.BigDecimal;
import java.util.Date;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

public abstract class IrpfAtualizacaoJRAdapter
extends JRAdapter {
    public abstract JRBeanCollectionDataSource getIrpfPorEvento();

    public abstract Periodo getPeriodoTotal();

    public abstract boolean isRegimeCaixa();

    public abstract class OcorrenciaDeIrpfPagamentoAdapter
    extends JRAdapter {
        public abstract BigDecimal getDevido();

        public abstract BigDecimal getTaxaJuros();

        public abstract BigDecimal getValorJuros();

        public abstract BigDecimal getTaxaMulta();

        public abstract BigDecimal getValorMulta();

        public abstract BigDecimal getTotal();

        public abstract BigDecimal getPago();

        public abstract BigDecimal getDevidoDiferenca();

        public abstract BigDecimal getTaxaJurosDiferenca();

        public abstract BigDecimal getValorJurosDiferenca();

        public abstract BigDecimal getTaxaMultaDiferenca();

        public abstract BigDecimal getValorMultaDiferenca();

        public abstract BigDecimal getTotalDiferenca();

        public abstract Date getDataEvento();

        public abstract Boolean getPagamentoNoSaldo();

        public abstract Boolean getCalculadoNoSaldo();
    }

    public abstract class OcorrenciaDeIrpfAtualizacaoAdapter
    extends JRAdapter {
        public abstract BigDecimal getVerbas();

        public abstract BigDecimal getJuros();

        public abstract String getQuantidadeMeses();

        public abstract BigDecimal getContribuicaoSocial();

        public abstract BigDecimal getPrevidenciaPrivada();

        public abstract BigDecimal getPensaoAlimenticia();

        public abstract BigDecimal getHonorarios();

        public abstract BigDecimal getDependentes();

        public abstract BigDecimal getAposentadoMaior65Anos();

        public abstract BigDecimal getBase();

        public abstract String getFaixa();

        public abstract BigDecimal getAliquota();

        public abstract BigDecimal getDeducao();

        public abstract BigDecimal getDevido();

        public abstract String getTipo();

        public abstract boolean isAnosAnteriores();

        public abstract Date getDataEvento();

        public abstract Periodo getOcorrenciaPeriodo();
    }

    public abstract class IrpfPorEventoAdapter
    extends JRAdapter {
        public abstract Date getDataEvento();

        public abstract Boolean getHasPagamento();

        public abstract JRBeanCollectionDataSource getOcorrenciasAtualizacaoDs();

        public abstract JRBeanCollectionDataSource getOcorrenciasPagamentoDs();

        public abstract BigDecimal getTotalDevidoLiquidacao();

        public abstract BigDecimal getTotalDevidoPagamento();
    }
}

