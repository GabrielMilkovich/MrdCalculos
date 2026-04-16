/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.relatorio.parametroscalculo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapter;
import br.jus.trt8.pjecalc.base.comum.relatorio.JRAdapterDataSource;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.faltas.Falta;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import java.util.Date;

public class FaltasEFeriasJRAdapter
extends JRAdapter {
    private Calculo calculo;

    public FaltasEFeriasJRAdapter() {
    }

    public FaltasEFeriasJRAdapter(Calculo calculo) {
        this.calculo = calculo;
    }

    @Override
    public JRAdapter adapt(Object adapted) {
        return this;
    }

    public Boolean getMostrarSecaoFaltas() {
        return Utils.naoNulo(this.calculo.getFaltas()) && !this.calculo.getFaltas().isEmpty();
    }

    public Boolean getMostrarSecaoFerias() {
        return Utils.naoNulo(this.calculo.getListaDeFerias()) && !this.calculo.getListaDeFerias().isEmpty();
    }

    public JRAdapterDataSource<FaltaAdapterPadrao> getFaltas() {
        if (this.getMostrarSecaoFaltas().booleanValue()) {
            return new JRAdapterDataSource<FaltaAdapterPadrao>(new FaltaAdapterPadrao(), this.calculo.getFaltas());
        }
        return null;
    }

    public JRAdapterDataSource<FeriasAdapterPadrao> getListaDeFerias() {
        if (this.getMostrarSecaoFerias().booleanValue()) {
            return new JRAdapterDataSource<FeriasAdapterPadrao>(new FeriasAdapterPadrao(), this.calculo.getListaDeFerias());
        }
        return null;
    }

    public class FeriasAdapterPadrao
    extends JRAdapter {
        private Ferias ferias;

        @Override
        public FeriasAdapterPadrao adapt(Object ferias) {
            this.ferias = (Ferias)ferias;
            return this;
        }

        public String getRelativa() {
            return this.ferias.getRelativa();
        }

        public String getAquisitivo() {
            return this.ferias.getPeriodoAquisitivo().toString();
        }

        public String getConcessivo() {
            return this.ferias.getPeriodoConcessivo().toString();
        }

        public Integer getPrazo() {
            return this.ferias.getPrazo();
        }

        public String getSituacao() {
            return this.ferias.getSituacao().getNome();
        }

        public String getAbono() {
            return this.ferias.getAbono() != false ? String.format("Sim\n(%d dias)", this.ferias.getQuantidadeDiasAbono()) : "N\u00e3o";
        }

        public String getGozo1() {
            String texto = this.ferias.getPeriodoDeGozo1().toString();
            return Utils.naoVazio(texto) ? texto : " - ";
        }

        public String getGozo2() {
            String texto = this.ferias.getPeriodoDeGozo2().toString();
            return Utils.naoVazio(texto) ? texto : " - ";
        }

        public String getGozo3() {
            String texto = this.ferias.getPeriodoDeGozo3().toString();
            return Utils.naoVazio(texto) ? texto : " - ";
        }
    }

    public class FaltaAdapterPadrao
    extends JRAdapter {
        private Falta falta;

        @Override
        public FaltaAdapterPadrao adapt(Object falta) {
            this.falta = (Falta)falta;
            return this;
        }

        public Date getDataInicio() {
            return this.falta.getDataInicioPeriodoFalta();
        }

        public Date getDataFim() {
            return this.falta.getDataTerminoPeriodoFalta();
        }

        public String getJustificada() {
            return this.falta.getFaltaJustificada() != false ? "Sim" : "N\u00e3o";
        }

        public String getJustificativa() {
            return Utils.nuloOuBranco(this.falta.getJustificativaDaFalta()) ? " - " : this.falta.getJustificativaDaFalta();
        }
    }
}

