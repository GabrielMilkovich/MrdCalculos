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

public abstract class EsocialAtualizacaoJRAdapter
extends JRAdapter {
    public abstract JRBeanCollectionDataSource getEsocialPorEventos();

    public abstract class RelatorioS2501PorEventoAdapter
    extends JRAdapter {
        public abstract Date getDataEvento();

        public abstract JRBeanCollectionDataSource getOcorrencias();

        public abstract BigDecimal getIrCorrente();

        public abstract BigDecimal getIrAnterior();
    }
}

