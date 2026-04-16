/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

class ValoresCreditoReclamanteAnterior {
    private BigDecimal pagoAnterior;
    private BigDecimal diferencaPrincipalAnterior;
    private Date dataAnterior;
    private BigDecimal numeroCompetencia = BigDecimal.ZERO;

    public ValoresCreditoReclamanteAnterior(BigDecimal pagoAnterior, BigDecimal diferencaPrincipalAnterior, Date dataAnterior) {
        this.pagoAnterior = pagoAnterior;
        this.diferencaPrincipalAnterior = diferencaPrincipalAnterior;
        this.dataAnterior = dataAnterior;
    }

    public BigDecimal getPagoAnterior() {
        return this.pagoAnterior;
    }

    public BigDecimal getDiferencaPrincipalAnterior() {
        return this.diferencaPrincipalAnterior;
    }

    public Date getDataAnterior() {
        return this.dataAnterior;
    }

    public void setPagoAnterior(BigDecimal pagoAnterior) {
        this.pagoAnterior = pagoAnterior;
    }

    public BigDecimal getNumeroCompetencia() {
        return this.numeroCompetencia;
    }

    public void setNumeroCompetencia(BigDecimal numeroCompetencia) {
        this.numeroCompetencia = numeroCompetencia;
    }

    protected static void incluirNoValorAnterior(BigDecimal numeroCompetencias, Date dataPeriodo, List<ValoresCreditoReclamanteAnterior> valoresAnteriores) {
        for (ValoresCreditoReclamanteAnterior vcra : valoresAnteriores) {
            if (!HelperDate.dateEquals(vcra.getDataAnterior(), dataPeriodo)) continue;
            vcra.setNumeroCompetencia(numeroCompetencias);
            break;
        }
    }

    protected static BigDecimal calcularCompetenciasSaldo(BigDecimal totalMeses, List<ValoresCreditoReclamanteAnterior> valoresAnteriores) {
        BigDecimal competenciaTotal = totalMeses;
        for (ValoresCreditoReclamanteAnterior vcra : valoresAnteriores) {
            competenciaTotal = Utils.subtrair(competenciaTotal, vcra.getNumeroCompetencia(), competenciaTotal);
        }
        return competenciaTotal;
    }
}

