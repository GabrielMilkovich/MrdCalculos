/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.base.comum.relatorio.JREmptyDS;
import java.math.BigDecimal;

public abstract class DemonstrativoAtualizacaoJRAdapter
extends JRAdapter {
    public abstract JRAdapterDataSource<DemonstrativoAtualizacaoAdapter> getCreditoDebitoOutroDebito();

    public abstract JRAdapterDataSource<JREmptyDS> getEmptyDS();

    public abstract class DemonstrativoItemAdapter
    extends JRAdapter {
        public abstract String getDescricao();

        public abstract String getBase();

        public abstract String getTaxa();

        public abstract String getValor();

        public abstract String getIndice();

        public abstract String getDevido();

        public abstract String getPago();

        public abstract String getDiferenca();
    }

    public abstract class DemonstrativoAtualizacaoAdapter
    extends JRAdapter {
        public abstract String getDescritivoDeEventos();

        public abstract String getCabecalho();

        public abstract BigDecimal getTotalDevido();

        public abstract BigDecimal getTotalPago();

        public abstract BigDecimal getTotalDiferenca();

        public abstract JRAdapterDataSource<DemonstrativoItemAdapter> getItens();
    }

    public abstract class Item {
    }
}

