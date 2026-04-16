/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Embeddable
 *  org.hibernate.validator.NotNull
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoProporcionalizar;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Termo;
import java.math.BigDecimal;
import javax.persistence.Column;
import javax.persistence.Embeddable;
import org.hibernate.validator.NotNull;

@Embeddable
public class Constante
implements Termo {
    private static final long serialVersionUID = -7993361365356987338L;
    @NotNull
    @Column(name="RVLVALOR", precision=38, scale=25)
    private BigDecimal valor;

    @Override
    public BigDecimal resolverValor(ParametroDoTermo parametro) {
        if (parametro.getVerbaDeCalculo().getAplicarProporcionalidade().booleanValue() && this.getValor() != null) {
            int diasParaExcluir = 0;
            if (parametro.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
                diasParaExcluir += parametro.getCalculo().obterDiasFerias(parametro.getPeriodo());
            }
            if (parametro.getPeriodo().totalDeDias() - diasParaExcluir == 31) {
                diasParaExcluir = 1;
            }
            if (parametro.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
                diasParaExcluir += parametro.getCalculo().obterFaltasJustificadas(parametro.getPeriodo());
            }
            if (parametro.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
                diasParaExcluir += parametro.getCalculo().obterFaltasNaoJustificadas(parametro.getPeriodo());
            }
            parametro.setValorIntegral(this.valor);
            CalculoDoProporcionalizar calculoDoProporcionalizar = new CalculoDoProporcionalizar(parametro.getPeriodo(), this.getValor(), diasParaExcluir);
            calculoDoProporcionalizar.executar();
            return calculoDoProporcionalizar.getResultado();
        }
        return this.getValor();
    }

    public BigDecimal getValor() {
        return this.valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public String toString() {
        return Utils.formatarNumero(this.valor);
    }
}

