/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import java.math.BigDecimal;
import java.util.Date;

public abstract class ApuracaoDeJurosJRAdapter
extends JRAdapter {
    public abstract JRAdapterDataSource<ApuracaoDeJurosAdapter> getOcorrenciaDeJuros();

    public abstract BigDecimal getTotalDeJuros();

    public abstract class ApuracaoDeJurosAdapter
    extends JRAdapter {
        public abstract Date getCompetencia();

        public abstract Date getDataInicial();

        public abstract BigDecimal getValor();

        public abstract BigDecimal getContribuicaoSocial();

        public abstract BigDecimal getPrevidenciaPrivada();

        public abstract BigDecimal getCapital();

        public abstract BigDecimal getTaxa();

        public abstract BigDecimal getJuros();
    }
}

