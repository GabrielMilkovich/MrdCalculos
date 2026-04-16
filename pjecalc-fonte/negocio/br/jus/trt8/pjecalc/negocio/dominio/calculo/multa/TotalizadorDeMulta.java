/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.multa;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.Total;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import java.io.Serializable;
import java.math.BigDecimal;

public class TotalizadorDeMulta
implements Serializable {
    private static final long serialVersionUID = 1L;
    private Calculo calculo;
    private boolean isCalculado;
    private Total reclamanteReclamado;
    private Total reclamadoReclamante;
    private Total terceiroReclamado;

    public TotalizadorDeMulta(Calculo calculo) {
        this.calculo = calculo;
        this.reset();
    }

    public void reset() {
        this.isCalculado = false;
    }

    private TotalizadorDeMulta calcular() {
        if (!this.isCalculado) {
            this.reclamanteReclamado = Total.newInstance(true);
            this.reclamadoReclamante = Total.newInstance(true);
            this.terceiroReclamado = Total.newInstance(true);
            for (Multa multa : this.calculo.getMultasDoCalculo()) {
                if (!Utils.naoNulo(multa.getValorTotal())) continue;
                switch (multa.getTipoCredorDevedor()) {
                    case RECLAMANTE_RECLAMADO: {
                        this.reclamanteReclamado.acumular(multa.getValorTotal());
                        break;
                    }
                    case RECLAMADO_RECLAMANTE: {
                        this.reclamadoReclamante.acumular(multa.getValorTotal());
                        break;
                    }
                    case TERCEIRO_RECLAMADO: {
                        this.terceiroReclamado.acumular(multa.getValorTotal());
                        break;
                    }
                }
            }
            this.isCalculado = true;
        }
        return this;
    }

    public BigDecimal getTotalTipoReclamanteReclamado() {
        return this.calcular().reclamanteReclamado.getValor();
    }

    public BigDecimal getTotalTipoReclamadoReclamante() {
        return this.calcular().reclamadoReclamante.getValor();
    }

    public BigDecimal getTotalTipoTerceiroReclamado() {
        return this.calcular().terceiroReclamado.getValor();
    }
}

