/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import java.math.BigDecimal;
import java.util.Date;

public abstract class SalarioFamiliaJRAdapter
extends JRAdapter {
    public abstract String getFormula();

    public abstract String getPeriodo();

    public abstract JRAdapterDataSource<OcorrenciaSalarioFamiliaAdapter> getOcorrencias();

    public abstract BigDecimal getTotalDoDevidoCorrigido();

    public abstract BigDecimal getTotalDeJuros();

    public abstract BigDecimal getTotalGeral();

    public abstract class OcorrenciaSalarioFamiliaAdapter
    extends JRAdapter {
        public abstract Date getOcorrencia();

        public abstract BigDecimal getSalarioReferencia();

        public abstract BigDecimal getSalarioParaFaixa();

        public abstract Integer getQuantidadeFilhos();

        public abstract BigDecimal getDevido();

        public abstract BigDecimal getIndice();

        public abstract BigDecimal getValorCorrigido();

        public abstract BigDecimal getJuros();

        public abstract BigDecimal getTotal();
    }
}

