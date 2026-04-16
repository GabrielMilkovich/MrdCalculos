/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculadorDeIndices;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.api.IndiceDeCalculo;
import br.jus.trt8.pjecalc.negocio.dominio.indices.tr.RepositorioDeIndiceTR;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class IndiceSemCorrecao
extends IndiceBase {
    private static final long serialVersionUID = 1L;

    public IndiceSemCorrecao(Date competencia) {
        super(RepositorioDeIndiceTR.class, competencia, BigDecimal.ZERO);
        this.setValorAcumulado(BigDecimal.ONE);
    }

    public static List<IndiceDeCalculo> obterTabela(Periodo periodo) {
        ArrayList<IndiceSemCorrecao> lista = new ArrayList<IndiceSemCorrecao>();
        for (Periodo competencia : HelperDate.breakInMonths(periodo.getInicial(), periodo.getFinal())) {
            lista.add(new IndiceSemCorrecao(HelperDate.getCurrentCompetence(competencia.getInicial()).getDate()));
        }
        return CalculadorDeIndices.calcularIndiceAcumulado(lista);
    }

    @Override
    public IndiceBase validar() {
        return this;
    }

    @Override
    public IndiceBase validarParaConsulta() {
        return this;
    }

    @Override
    public boolean existe() {
        return false;
    }

    @Override
    public Object obterChavePrimaria() {
        return null;
    }

    @Override
    public IndiceBase clonar() {
        return this;
    }
}

