/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.data.JRBeanCollectionDataSource
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import java.math.BigDecimal;
import java.util.Date;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

public abstract class InssAtualizacaoJRAdapter
extends JRAdapter {
    public abstract JRBeanCollectionDataSource getInssPorEventosDevidos();

    public abstract JRBeanCollectionDataSource getInssPorEventosPagos();

    public abstract class InssPorEventoAdapter
    extends JRAdapter {
        public abstract String getTipo();

        public abstract Date getDataEvento();

        public abstract JRBeanCollectionDataSource getOcorrencias();

        public abstract BigDecimal getSomatorioDevido();

        public abstract BigDecimal getSomatorioJuros();

        public abstract BigDecimal getSomatorioMulta();

        public abstract BigDecimal getSomatorioTotal();

        public abstract BigDecimal getSomatorioPago();

        public abstract BigDecimal getSomatorioDiferenca();

        public abstract BigDecimal getSomatorioJurosDiferenca();

        public abstract BigDecimal getSomatorioMultaDiferenca();

        public abstract BigDecimal getSomatorioTotalDiferenca();

        public abstract BigDecimal getValorPagamento();

        public abstract BigDecimal getValorPagoAMaior();
    }
}

