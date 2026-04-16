/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.OcorrenciaDePrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.previdenciaprivada.PrevidenciaPrivada;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.PrevidenciaPrivadaJRAdapter;
import java.math.BigDecimal;
import java.util.Date;

public class PrevidenciaPrivadaJRAdapterPadrao
extends PrevidenciaPrivadaJRAdapter {
    private PrevidenciaPrivada previdenciaPrivada;

    public PrevidenciaPrivadaJRAdapterPadrao() {
    }

    public PrevidenciaPrivadaJRAdapterPadrao(Calculo calculo) {
        this.previdenciaPrivada = calculo.getPrevidenciaPrivada();
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public String getFormula() {
        return this.previdenciaPrivada.getLegendaDaFormula().getLegenda();
    }

    @Override
    public BigDecimal getTotalDevido() {
        return this.previdenciaPrivada.getTotalDoValorDevido();
    }

    @Override
    public JRAdapterDataSource<PrevidenciaPrivadaJRAdapter.PrevidenciaPrivadaOcorrenciaAdapter> getOcorrencias() {
        return new JRAdapterDataSource<PrevidenciaPrivadaJRAdapter.PrevidenciaPrivadaOcorrenciaAdapter>(new PrevidenciaPrivadaOcorrenciaAdapterPadrao(), this.previdenciaPrivada.getOcorrencias());
    }

    @Override
    public BigDecimal getTotalDoDevidoCorrigido() {
        return this.previdenciaPrivada.getTotalDoDevidoCorrigido();
    }

    @Override
    public BigDecimal getTotalDeJuros() {
        return this.previdenciaPrivada.getTotalDeJuros();
    }

    @Override
    public BigDecimal getTotalGeral() {
        return this.previdenciaPrivada.getTotalGeral();
    }

    @Override
    public boolean getMostrarJuros() {
        return Boolean.TRUE.equals(this.previdenciaPrivada.getCalculo().getParametrosDeAtualizacao().getJurosDePrevidenciaPrivada());
    }

    public class PrevidenciaPrivadaOcorrenciaAdapterPadrao
    extends PrevidenciaPrivadaJRAdapter.PrevidenciaPrivadaOcorrenciaAdapter {
        private OcorrenciaDePrevidenciaPrivada ocorrencia;

        @Override
        public PrevidenciaPrivadaOcorrenciaAdapterPadrao adapt(Object ocorrencia) {
            this.ocorrencia = (OcorrenciaDePrevidenciaPrivada)ocorrencia;
            return this;
        }

        @Override
        public Date getOcorrencia() {
            return this.ocorrencia.getCompetencia();
        }

        @Override
        public BigDecimal getBase() {
            return this.ocorrencia.getValorBase();
        }

        @Override
        public BigDecimal getAliquota() {
            return Utils.dividir(this.ocorrencia.getAliquota(), new BigDecimal("100"));
        }

        @Override
        public BigDecimal getDevido() {
            return this.ocorrencia.getValorDevido();
        }

        @Override
        public BigDecimal getIndiceCorrecao() {
            return this.ocorrencia.getIndiceAcumulado();
        }

        @Override
        public BigDecimal getDevidoCorrigido() {
            return this.ocorrencia.getValorDevidoCorrigido();
        }

        @Override
        public BigDecimal getJuros() {
            return this.ocorrencia.getJuros();
        }

        @Override
        public BigDecimal getTotal() {
            return this.ocorrencia.getTotal();
        }
    }
}

