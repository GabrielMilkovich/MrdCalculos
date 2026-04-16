/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.OcorrenciaDeSalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia;
import java.math.BigDecimal;

public class TotalizadorDeSalarioFamilia {
    private SalarioFamilia salarioFamilia;
    private boolean isCalculado;
    private BigDecimal devido;
    private BigDecimal devidoCorrigido;
    private BigDecimal juros;
    private BigDecimal total;

    public TotalizadorDeSalarioFamilia(SalarioFamilia salarioFamilia) {
        this.salarioFamilia = salarioFamilia;
        this.reset();
    }

    public void reset() {
        this.isCalculado = false;
    }

    private TotalizadorDeSalarioFamilia calcular() {
        if (!this.isCalculado) {
            this.devido = BigDecimal.ZERO;
            this.devidoCorrigido = BigDecimal.ZERO;
            this.juros = BigDecimal.ZERO;
            this.total = BigDecimal.ZERO;
            for (OcorrenciaDeSalarioFamilia ocorrencia : this.salarioFamilia.getOcorrencias()) {
                this.devido = Utils.somar(this.devido, ocorrencia.getValorDevido(), this.devido);
                this.devidoCorrigido = Utils.somar(this.devidoCorrigido, ocorrencia.getValorDevidoCorrigido(), this.devidoCorrigido);
                this.juros = Utils.somar(this.juros, ocorrencia.getJuros(), this.juros);
                this.total = Utils.somar(this.total, ocorrencia.getTotal(), this.total);
            }
            this.isCalculado = true;
        }
        return this;
    }

    public BigDecimal getDevido() {
        return this.calcular().devido;
    }

    public BigDecimal getDevidoCorrigido() {
        return this.calcular().devidoCorrigido;
    }

    public BigDecimal getJuros() {
        return this.calcular().juros;
    }

    public BigDecimal getTotal() {
        return this.calcular().total;
    }
}

