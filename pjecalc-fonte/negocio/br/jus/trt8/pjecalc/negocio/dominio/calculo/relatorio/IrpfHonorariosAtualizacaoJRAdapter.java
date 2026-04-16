/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  net.sf.jasperreports.engine.data.JRBeanCollectionDataSource
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import java.util.Date;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;

public abstract class IrpfHonorariosAtualizacaoJRAdapter
extends JRAdapter {
    public abstract JRBeanCollectionDataSource getIrpfHonorariosPorEventos();

    public abstract JRBeanCollectionDataSource getIrpfHonorariosDoSaldo();

    public abstract Date getDataLiquidacaoAtualizacao();

    public abstract class IrpfHonorariosPorEventoJRAdapter
    extends JRAdapter {
        public abstract Date getDataEvento();

        public abstract JRBeanCollectionDataSource getOcorrencias();
    }
}

