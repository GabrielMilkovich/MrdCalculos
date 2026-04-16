/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import java.math.BigDecimal;
import java.util.Date;

public abstract class PrevidenciaPrivadaJRAdapter
extends JRAdapter {
    public abstract String getFormula();

    public abstract BigDecimal getTotalDevido();

    public abstract JRAdapterDataSource<PrevidenciaPrivadaOcorrenciaAdapter> getOcorrencias();

    public abstract BigDecimal getTotalDoDevidoCorrigido();

    public abstract BigDecimal getTotalDeJuros();

    public abstract BigDecimal getTotalGeral();

    public abstract boolean getMostrarJuros();

    public abstract class PrevidenciaPrivadaOcorrenciaAdapter
    extends JRAdapter {
        public abstract Date getOcorrencia();

        public abstract BigDecimal getBase();

        public abstract BigDecimal getAliquota();

        public abstract BigDecimal getDevido();

        public abstract BigDecimal getIndiceCorrecao();

        public abstract BigDecimal getDevidoCorrigido();

        public abstract BigDecimal getJuros();

        public abstract BigDecimal getTotal();
    }
}

