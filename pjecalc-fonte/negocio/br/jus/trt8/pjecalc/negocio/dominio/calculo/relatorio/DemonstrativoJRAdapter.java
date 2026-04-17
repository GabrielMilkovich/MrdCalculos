/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import java.math.BigDecimal;

public abstract class DemonstrativoJRAdapter
extends JRAdapter {
    public abstract JRAdapterDataSource<DemonstrativoVerbaAdapter> getVerbas();

    public abstract class DemonstrativoOcorrenciaAdapter
    extends JRAdapter {
        public abstract Periodo getPeriodo();

        public abstract BigDecimal getBase();

        public abstract BigDecimal getDivisor();

        public abstract BigDecimal getMultiplicador();

        public abstract BigDecimal getQuantidade();

        public abstract String getDobra();

        public abstract BigDecimal getDevido();

        public abstract BigDecimal getPago();

        public abstract BigDecimal getDiferenca();

        public abstract BigDecimal getIndiceAcumulado();

        public abstract BigDecimal getValorCorrigido();
    }

    public abstract class DemonstrativoVerbaAdapter
    extends JRAdapter {
        public abstract String getNome();

        public abstract Periodo getPeriodo();

        public abstract String getIncidencia();

        public abstract String getComentario();

        public abstract String getFormula();

        public abstract BigDecimal getTotalDoValorCorrigido();

        public abstract JRAdapterDataSource<DemonstrativoOcorrenciaAdapter> getOcorrencias();
    }
}

