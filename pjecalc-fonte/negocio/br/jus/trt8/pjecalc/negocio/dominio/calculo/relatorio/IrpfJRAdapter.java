/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import java.math.BigDecimal;

public abstract class IrpfJRAdapter
extends JRAdapter {
    public abstract String getFormulaAnosAnteriores();

    public abstract String getFormulaSeparado();

    public abstract String getFormulaExclusiva();

    public abstract String getFormulaNormal();

    public abstract Periodo getPeriodoAnterior();

    public abstract Periodo getPeriodo();

    public abstract BigDecimal getTotalDevido();

    public abstract boolean getAcumuladoAnterior();

    public abstract boolean getTributacaoNormal();

    public abstract boolean getTributacaoExclusiva();

    public abstract boolean getTributacaoEmSeparado();

    public abstract OcorrenciaDeIrpfAdapter getOcorrenciaAcumuladoAnterior();

    public abstract OcorrenciaDeIrpfAdapter getOcorrenciaTributacaoNormal();

    public abstract OcorrenciaDeIrpfAdapter getOcorrenciaTributacaoExclusiva();

    public abstract OcorrenciaDeIrpfAdapter getOcorrenciaTributacaoEmSeparado();

    public abstract class OcorrenciaDeIrpfAdapter {
        public abstract BigDecimal getVerbas();

        public abstract BigDecimal getJuros();

        public abstract BigDecimal getContribuicaoSocial();

        public abstract BigDecimal getPrevidenciaPrivada();

        public abstract BigDecimal getPensaoAlimenticia();

        public abstract BigDecimal getHonorarios();

        public abstract BigDecimal getDependentes();

        public abstract BigDecimal getAposentadoMaior60Anos();

        public abstract BigDecimal getBase();

        public abstract String getFaixa();

        public abstract BigDecimal getAliquota();

        public abstract BigDecimal getDeducao();

        public abstract BigDecimal getDevido();

        public abstract Integer getMeses();
    }
}

