/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;

public abstract class JustificativaJRAdapter
extends JRAdapter {
    public abstract JRAdapterDataSource<JustificativaOcorrenciaAdapter> getOcorrencias();

    public abstract class JustificativaOcorrenciaAdapter
    extends JRAdapter {
        public abstract Integer getNumero();

        public abstract String getTextoReal();
    }
}

