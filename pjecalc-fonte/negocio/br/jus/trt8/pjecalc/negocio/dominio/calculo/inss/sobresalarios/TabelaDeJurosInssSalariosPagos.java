/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.TabelaDeJurosDeInss;
import java.util.Date;

public class TabelaDeJurosInssSalariosPagos
extends TabelaDeJurosDeInss {
    private static final long serialVersionUID = 1L;

    public TabelaDeJurosInssSalariosPagos(Calculo calculo, Date dataInicialParaCalculo) {
        super(calculo, dataInicialParaCalculo);
    }

    public TabelaDeJurosInssSalariosPagos(Calculo calculo, Date dataInicialParaCalculo, Date dataFinalParaCalculo, Boolean ocorrenciaAntesDaLei) {
        super(calculo, dataInicialParaCalculo, dataFinalParaCalculo, ocorrenciaAntesDaLei);
    }

    @Override
    protected boolean isUsarJurosSelic() {
        return this.getCalculo().getParametrosDeAtualizacao().getJurosPrevidenciariosDosSalariosPagosDoINSS();
    }

    @Override
    protected boolean isUsarJurosBasico() {
        return this.getCalculo().getParametrosDeAtualizacao().getJurosTrabalhistasDosSalariosPagosDoINSS();
    }

    @Override
    protected Date getDataLimiteParaJurosBasico() {
        return this.getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS();
    }
}

