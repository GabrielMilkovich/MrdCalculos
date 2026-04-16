/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.base.comum;

import java.util.ArrayList;
import java.util.List;

public class CriteriosDePesquisa {
    private List<Object> parametros = new ArrayList<Object>();
    private StringBuilder clausulaWhere;
    private String orderBy;

    public CriteriosDePesquisa() {
        this.limparClausulaWhere();
    }

    public CriteriosDePesquisa(String orderBy) {
        this.orderBy = orderBy;
        this.limparClausulaWhere();
    }

    public void limparClausulaWhere() {
        this.clausulaWhere = new StringBuilder();
    }

    public void adicionarCriterio(String prefixo, String clausula, Object ... parametros) {
        if (prefixo != null && !this.vazio()) {
            this.clausulaWhere.append(prefixo + " ");
        }
        this.clausulaWhere.append(clausula + " ");
        for (Object parametro : parametros) {
            this.parametros.add(parametro);
        }
    }

    public List<Object> getParametros() {
        return this.parametros;
    }

    public StringBuilder getClausulaWhere() {
        return this.clausulaWhere;
    }

    public boolean vazio() {
        return this.clausulaWhere.length() == 0;
    }

    public String getOrderBy() {
        return this.orderBy;
    }

    public void setOrderBy(String orderBy) {
        this.orderBy = orderBy;
    }
}

