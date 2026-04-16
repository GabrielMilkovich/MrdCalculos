/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaCalculada;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Calculada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Reflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;

public class SimuladorDeBaseParaVerba {
    public static BigDecimal obterValorTeoricoParaMesSemFeriasOuFaltas(VerbaDeCalculo verbaDeCalculo, Periodo periodo, ParametroDoTermo parametroDoReflexo) {
        boolean faltaJustificada = verbaDeCalculo.getExcluirFaltaJustificada();
        boolean faltaNaoJustificada = verbaDeCalculo.getExcluirFaltaNaoJustificada();
        boolean feriasGozadas = verbaDeCalculo.getExcluirFeriasGozadas();
        verbaDeCalculo.setExcluirFaltaJustificada(false);
        verbaDeCalculo.setExcluirFaltaNaoJustificada(false);
        verbaDeCalculo.setExcluirFeriasGozadas(false);
        ParametroDoTermo parametroSimulado = new ParametroDoTermo(verbaDeCalculo.getCalculo(), verbaDeCalculo, periodo, parametroDoReflexo.getModo(), parametroDoReflexo.getFase(), null, null);
        BigDecimal valorDevidoSimulado = BigDecimal.ZERO;
        BigDecimal baseSimulada = BigDecimal.ZERO;
        BigDecimal multiplicadorSimulado = BigDecimal.ZERO;
        BigDecimal divisorSimulado = BigDecimal.ZERO;
        BigDecimal quantidadeSimulada = BigDecimal.ZERO;
        if (verbaDeCalculo instanceof Calculada) {
            BigDecimal totalDaBaseTabelada = ((FormulaCalculada)verbaDeCalculo.getFormula()).getBaseTabelada().resolverValor(parametroSimulado);
            BigDecimal totalDaBaseVerba = ((FormulaCalculada)verbaDeCalculo.getFormula()).getBaseVerba().resolverValor(parametroSimulado);
            if (Utils.naoNulos(totalDaBaseVerba, totalDaBaseTabelada)) {
                baseSimulada = totalDaBaseVerba.add(totalDaBaseTabelada, Utils.CONTEXTO_MATEMATICO);
            } else if (Utils.naoNulo(totalDaBaseVerba)) {
                baseSimulada = totalDaBaseVerba;
            } else if (Utils.naoNulo(totalDaBaseTabelada)) {
                baseSimulada = totalDaBaseTabelada;
            }
            multiplicadorSimulado = ((FormulaCalculada)verbaDeCalculo.getFormula()).getMultiplicador().resolverValor(parametroSimulado);
            divisorSimulado = ((FormulaCalculada)verbaDeCalculo.getFormula()).getDivisor().resolverValor(parametroSimulado);
            quantidadeSimulada = ((FormulaCalculada)verbaDeCalculo.getFormula()).getQuantidade().resolverValor(parametroSimulado);
        } else if (verbaDeCalculo instanceof Reflexo) {
            baseSimulada = ((FormulaReflexo)verbaDeCalculo.getFormula()).getBaseVerba().resolverValor(parametroSimulado);
            multiplicadorSimulado = ((FormulaReflexo)verbaDeCalculo.getFormula()).getMultiplicador().resolverValor(parametroSimulado);
            divisorSimulado = ((FormulaReflexo)verbaDeCalculo.getFormula()).getDivisor().resolverValor(parametroSimulado);
            quantidadeSimulada = ((FormulaReflexo)verbaDeCalculo.getFormula()).getQuantidade().resolverValor(parametroSimulado);
        }
        valorDevidoSimulado = valorDevidoSimulado.add(baseSimulada, Utils.CONTEXTO_MATEMATICO);
        valorDevidoSimulado = valorDevidoSimulado.multiply(multiplicadorSimulado, Utils.CONTEXTO_MATEMATICO);
        valorDevidoSimulado = valorDevidoSimulado.multiply(quantidadeSimulada, Utils.CONTEXTO_MATEMATICO);
        valorDevidoSimulado = valorDevidoSimulado.divide(divisorSimulado, Utils.CONTEXTO_MATEMATICO);
        verbaDeCalculo.setExcluirFaltaJustificada(faltaJustificada);
        verbaDeCalculo.setExcluirFaltaNaoJustificada(faltaNaoJustificada);
        verbaDeCalculo.setExcluirFeriasGozadas(feriasGozadas);
        return valorDevidoSimulado;
    }
}

