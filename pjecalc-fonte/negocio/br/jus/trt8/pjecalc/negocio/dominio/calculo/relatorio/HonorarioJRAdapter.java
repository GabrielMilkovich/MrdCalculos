/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import java.math.BigDecimal;
import java.util.Date;

public abstract class HonorarioJRAdapter
extends JRAdapter {
    public abstract JRAdapterDataSource<CredorDevedorHonorarioOcorrenciaAdapter> getOcorrencias();

    public abstract JRAdapterDataSource<IrpfHonorarioOcorrenciaAdapter> getOcorrenciasIrpfHonorario();

    public abstract class IrpfHonorarioOcorrenciaAdapter
    extends HonorarioOcorrenciaAdapter {
        public abstract String getFaixa();

        public abstract String getDeducao();

        @Override
        @Deprecated
        public BigDecimal getIndiceCorrecao() {
            return null;
        }

        @Override
        @Deprecated
        public BigDecimal getTotal() {
            return null;
        }

        @Override
        @Deprecated
        public String getDescricao() {
            return null;
        }
    }

    public abstract class HonorarioOcorrenciaAdapter
    extends JRAdapter {
        public abstract Date getOcorrencia();

        public abstract String getDescricao();

        public abstract String getCredor();

        public abstract BigDecimal getValor();

        public abstract BigDecimal getBase();

        public abstract BigDecimal getAliquota();

        public abstract BigDecimal getIndiceCorrecao();

        public abstract BigDecimal getValorCorrigido();

        public abstract BigDecimal getJuros();

        public abstract BigDecimal getTotal();
    }

    public abstract class CredorDevedorHonorarioOcorrenciaAdapter
    extends JRAdapter {
        public abstract String getNome();

        public abstract String getComposicaoBase();

        public abstract JRAdapterDataSource<HonorarioOcorrenciaAdapter> getOcorrenciasInformadas();

        public abstract JRAdapterDataSource<HonorarioOcorrenciaAdapter> getOcorrenciasCalculadas();

        public abstract Boolean getMostrarInformadas();

        public abstract Boolean getMostrarCalculadas();

        public abstract BigDecimal getTotalGeral();
    }
}

