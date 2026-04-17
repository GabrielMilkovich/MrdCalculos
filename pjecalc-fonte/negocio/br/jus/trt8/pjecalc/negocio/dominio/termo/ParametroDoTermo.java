/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.FaseDoCalculoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ModoDeCalculoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;

public class ParametroDoTermo {
    private Calculo calculo;
    private VerbaDeCalculo verbaDeCalculo;
    private Periodo periodo;
    private ModoDeCalculoEnum modo;
    private FaseDoCalculoEnum fase;
    private Periodo periodoAquisitivo;
    private boolean feriasIndenizadas;
    private BigDecimal valorIntegral;
    private Periodo periodoParaMedia;

    public ParametroDoTermo(Calculo calculo, VerbaDeCalculo verbaDeCalculo, Periodo periodo, ModoDeCalculoEnum modo, FaseDoCalculoEnum fase, Periodo periodoAquisitivo, Periodo periodoParaMedia) {
        if (calculo == null || verbaDeCalculo == null) {
            throw new IllegalArgumentException("Calculo e Verba n\u00e3o podem ser nulos");
        }
        this.calculo = calculo;
        this.verbaDeCalculo = verbaDeCalculo;
        this.periodo = periodo;
        this.modo = modo;
        this.fase = fase;
        this.periodoAquisitivo = periodoAquisitivo;
        this.valorIntegral = null;
        this.periodoParaMedia = periodoParaMedia;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public VerbaDeCalculo getVerbaDeCalculo() {
        return this.verbaDeCalculo;
    }

    public BigDecimal getValorDaQuantidadeDaVerba() {
        return this.getVerbaDeCalculo().getValorDaQuantidadeCalculada(this);
    }

    public BigDecimal getValorMaiorRemuneracaoDoCalculo() {
        return this.getCalculo().getValorMaiorRemuneracao();
    }

    public BigDecimal getValorUltimaRemuneracaoDoCalculo() {
        return this.getCalculo().getValorUltimaRemuneracao();
    }

    public Periodo getPeriodo() {
        return this.periodo;
    }

    public void setPeriodo(Periodo periodo) {
        this.periodo = periodo;
    }

    public ModoDeCalculoEnum getModo() {
        return this.modo;
    }

    public FaseDoCalculoEnum getFase() {
        return this.fase;
    }

    public void setFase(FaseDoCalculoEnum fase) {
        this.fase = fase;
    }

    public void setPeriodoAquisitivo(Periodo periodoAquisitivo) {
        this.periodoAquisitivo = periodoAquisitivo;
    }

    public Periodo getPeriodoAquisitivo() {
        return this.periodoAquisitivo;
    }

    public boolean isFeriasIndenizadas() {
        return this.feriasIndenizadas;
    }

    public void setFeriasIndenizadas(boolean feriasIndenizadas) {
        this.feriasIndenizadas = feriasIndenizadas;
    }

    public BigDecimal getValorIntegral() {
        return this.valorIntegral;
    }

    public void setValorIntegral(BigDecimal valorIntegral) {
        this.valorIntegral = valorIntegral;
    }

    public boolean isProporcionalizado() {
        return Utils.naoNulo(this.valorIntegral);
    }

    public Periodo getPeriodoParaMedia() {
        return this.periodoParaMedia;
    }

    public void setPeriodoParaMedia(Periodo periodoParaMedia) {
        this.periodoParaMedia = periodoParaMedia;
    }

    public ParametroDoTermo clone() {
        ParametroDoTermo parametro = new ParametroDoTermo(this.calculo, this.verbaDeCalculo, this.periodo, this.modo, this.fase, this.periodoAquisitivo, this.periodoParaMedia);
        parametro.setValorIntegral(this.valorIntegral);
        return parametro;
    }
}

