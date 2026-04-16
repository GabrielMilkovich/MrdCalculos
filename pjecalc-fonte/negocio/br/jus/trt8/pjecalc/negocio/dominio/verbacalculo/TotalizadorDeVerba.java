/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.Total;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.ocorrenciaverba.OcorrenciaDeVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;

public class TotalizadorDeVerba {
    private VerbaDeCalculo verba;
    private boolean isCalculado;
    private Total devido;
    private Total pago;
    private Total diferenca;
    private Total diferencaCorrigida;
    private Total diferencaCorrigidaDeFeriasGozadas;
    private Total diferencaCorrigidaParaCalculoDasIncidencias;

    public TotalizadorDeVerba(VerbaDeCalculo verba) {
        this.verba = verba;
        this.reset();
    }

    public void reset() {
        this.isCalculado = false;
    }

    private TotalizadorDeVerba calcular() {
        if (!this.isCalculado) {
            this.devido = Total.newInstance(true);
            this.pago = Total.newInstance(true);
            this.diferenca = Total.newInstance(true);
            this.diferencaCorrigida = Total.newInstance(true);
            this.diferencaCorrigidaDeFeriasGozadas = Total.newInstance(true);
            this.diferencaCorrigidaParaCalculoDasIncidencias = Total.newInstance(true);
            for (OcorrenciaDeVerba ocorrencia : this.verba.getOcorrenciasAtivas()) {
                this.devido.acumular(ocorrencia.getDevido());
                this.pago.acumular(ocorrencia.getPago());
                this.diferenca.acumular(ocorrencia.getDiferenca());
                if (!ocorrencia.getAtivo().booleanValue()) continue;
                this.diferencaCorrigida.acumular(ocorrencia.getDiferencaCorrigida());
                BigDecimal base = ocorrencia.getDiferencaCorrigidaParaCalculoDasIncidencias();
                if (!Utils.naoNulo(base)) continue;
                this.diferencaCorrigidaParaCalculoDasIncidencias.acumular(base);
                if (!CaracteristicaDaVerbaEnum.FERIAS.equals((Object)this.verba.getCaracteristica()) || ocorrencia.isFeriasIndenizadas().booleanValue()) continue;
                this.diferencaCorrigidaDeFeriasGozadas.acumular(base);
            }
            this.isCalculado = true;
        }
        return this;
    }

    public BigDecimal getDevido() {
        return this.calcular().devido.getValor();
    }

    public BigDecimal getPago() {
        return this.calcular().pago.getValor();
    }

    public BigDecimal getDiferenca() {
        return this.calcular().diferenca.getValor();
    }

    public BigDecimal getDiferencaCorrigida() {
        return this.calcular().diferencaCorrigida.getValor();
    }

    public BigDecimal getDiferencaCorrigidaDeFeriasGozadas() {
        return this.calcular().diferencaCorrigidaDeFeriasGozadas.getValor();
    }

    public BigDecimal getDiferencaCorrigidaParaCalculoDasIncidencias() {
        return this.calcular().diferencaCorrigidaParaCalculoDasIncidencias.getValor();
    }
}

