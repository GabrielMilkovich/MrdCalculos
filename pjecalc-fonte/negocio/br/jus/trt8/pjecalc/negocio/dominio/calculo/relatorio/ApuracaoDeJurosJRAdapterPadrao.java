/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.juros.ApuracaoDeJuros;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.ApuracaoDeJurosJRAdapter;
import java.math.BigDecimal;
import java.util.Date;

public class ApuracaoDeJurosJRAdapterPadrao
extends ApuracaoDeJurosJRAdapter {
    private Calculo calculo;

    public ApuracaoDeJurosJRAdapterPadrao(Calculo calculo) {
        this.calculo = calculo;
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    @Override
    public JRAdapterDataSource<ApuracaoDeJurosJRAdapter.ApuracaoDeJurosAdapter> getOcorrenciaDeJuros() {
        return new JRAdapterDataSource<ApuracaoDeJurosJRAdapter.ApuracaoDeJurosAdapter>(new ApuracaoDeJurosAdapterPadrao(), this.calculo.getApuracoesDeJuros());
    }

    @Override
    public BigDecimal getTotalDeJuros() {
        return this.calculo.getTotalDeJurosDaApuracaoDeJuros();
    }

    public class ApuracaoDeJurosAdapterPadrao
    extends ApuracaoDeJurosJRAdapter.ApuracaoDeJurosAdapter {
        private ApuracaoDeJuros apuracaoDeJuros;

        @Override
        public JRAdapter adapt(Object apuracaoDeJuros) {
            this.apuracaoDeJuros = (ApuracaoDeJuros)apuracaoDeJuros;
            return this;
        }

        @Override
        public Date getCompetencia() {
            return this.apuracaoDeJuros.getCompetencia();
        }

        @Override
        public Date getDataInicial() {
            return this.apuracaoDeJuros.getDataInicial();
        }

        @Override
        public BigDecimal getValor() {
            return this.apuracaoDeJuros.getValorCorrigido();
        }

        @Override
        public BigDecimal getContribuicaoSocial() {
            return this.apuracaoDeJuros.getContribuicaoSocial();
        }

        @Override
        public BigDecimal getPrevidenciaPrivada() {
            return this.apuracaoDeJuros.getPrevidenciaPrivada();
        }

        @Override
        public BigDecimal getCapital() {
            return this.apuracaoDeJuros.getCapital();
        }

        @Override
        public BigDecimal getTaxa() {
            return Utils.dividir(this.apuracaoDeJuros.getTaxaDeJuros(), new BigDecimal("100"));
        }

        @Override
        public BigDecimal getJuros() {
            return this.apuracaoDeJuros.getJuros();
        }
    }
}

