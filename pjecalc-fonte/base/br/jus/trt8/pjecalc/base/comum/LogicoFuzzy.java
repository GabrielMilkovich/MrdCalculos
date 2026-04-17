/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.base.comum.api.PeriodoParaExcecao;
import java.io.Serializable;
import java.util.Set;

public class LogicoFuzzy<E extends PeriodoParaExcecao>
implements Serializable {
    private static final long serialVersionUID = 118855806017405280L;
    private Boolean considerar;
    private Set<E> excecoes;
    public static final LogicoFuzzy<?> VERDADEIRO = new LogicoFuzzy(true);
    public static final LogicoFuzzy<?> FALSO = new LogicoFuzzy(false);

    public LogicoFuzzy(Boolean considerar, Set<E> excecoes) {
        this.considerar = considerar;
        this.excecoes = excecoes;
    }

    public LogicoFuzzy(Boolean considerar) {
        this.considerar = considerar;
        this.excecoes = null;
    }

    public boolean isValido(HelperDate date) {
        Boolean resultado = Utils.nulo(this.considerar) ? false : this.considerar;
        if (Utils.naoNulo(this.excecoes)) {
            for (PeriodoParaExcecao excecao : this.excecoes) {
                if (!Utils.naoNulo(excecao.getPeriodo()) || !excecao.getPeriodo().isPeriodoContemEsta(date.getDate())) continue;
                resultado = resultado == false;
                break;
            }
        }
        return resultado;
    }
}

