/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.Total;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import java.io.Serializable;
import java.math.BigDecimal;

public class TotalizadorDeHonorario
implements Serializable {
    private static final long serialVersionUID = 1L;
    private Calculo calculo;
    private boolean isCalculado;
    private Total honorariosDevidosPeloReclamante;
    private Total honorariosDevidosPeloReclamado;

    public TotalizadorDeHonorario(Calculo calculo) {
        this.calculo = calculo;
        this.reset();
    }

    public void reset() {
        this.isCalculado = false;
    }

    private TotalizadorDeHonorario calcular() {
        if (!this.isCalculado) {
            this.honorariosDevidosPeloReclamante = Total.newInstance(true);
            this.honorariosDevidosPeloReclamado = Total.newInstance(true);
            for (Honorario honorario : this.calculo.getHonorariosDoCalculo()) {
                if (!Utils.naoNulo(honorario.getValorTotal())) continue;
                switch (honorario.getTipoDeDevedor()) {
                    case RECLAMANTE: {
                        boolean isCobrarDoReclamante = honorario.getTipoCobrancaReclamante() == TipoCobrancaReclamanteEnum.COBRAR;
                        this.honorariosDevidosPeloReclamante.acumular(isCobrarDoReclamante ? BigDecimal.ZERO : honorario.getValorTotal());
                        break;
                    }
                    case RECLAMADO: {
                        this.honorariosDevidosPeloReclamado.acumular(honorario.getValorTotal());
                    }
                }
            }
            this.isCalculado = true;
        }
        return this;
    }

    public BigDecimal getTotalDevidoPeloReclamante() {
        return this.calcular().honorariosDevidosPeloReclamante.getValor();
    }

    public BigDecimal getTotalDevidoPeloReclamado() {
        return this.calcular().honorariosDevidosPeloReclamado.getValor();
    }
}

