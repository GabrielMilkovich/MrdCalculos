/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import java.math.BigDecimal;
import java.util.Date;

public abstract class MultaJRAdapter
extends JRAdapter {
    public abstract JRAdapterDataSource<CredorDevedorMultaOcorrenciaAdapter> getOcorrencias();

    public abstract class MultaOcorrenciaAdapter
    extends JRAdapter {
        public abstract Date getOcorrencia();

        public abstract String getDescricao();

        public abstract String getTerceiro();

        public abstract BigDecimal getValor();

        public abstract BigDecimal getBase();

        public abstract BigDecimal getAliquota();

        public abstract BigDecimal getIndiceCorrecao();

        public abstract BigDecimal getValorCorrigido();

        public abstract BigDecimal getJuros();

        public abstract BigDecimal getTotal();
    }

    public abstract class CredorDevedorMultaOcorrenciaAdapter
    extends JRAdapter {
        public abstract String getNome();

        public abstract String getComposicaoBase();

        public abstract JRAdapterDataSource<MultaOcorrenciaAdapter> getOcorrenciasInformadas();

        public abstract JRAdapterDataSource<MultaOcorrenciaAdapter> getOcorrenciasCalculadas();

        public abstract Boolean getMostrarInformadas();

        public abstract Boolean getMostrarCalculadas();

        public abstract BigDecimal getTotalGeral();

        public abstract Boolean getMostrarTerceiros();
    }
}

