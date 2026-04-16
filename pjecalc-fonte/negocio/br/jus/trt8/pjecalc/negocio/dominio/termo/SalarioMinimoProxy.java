/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoProporcionalizar;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoSalarioEmFerias;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ConversaoDeMoedas;
import br.jus.trt8.pjecalc.negocio.constantes.FaseDoCalculoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.RegimeDoContratoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaCalculada;
import br.jus.trt8.pjecalc.negocio.dominio.salariominimo.nacional.SalarioMinimoNacional;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Termo;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

public class SalarioMinimoProxy
implements Termo {
    private static final long serialVersionUID = 1232734827915968866L;
    private ParametroDoTermo parametroDoTermo = null;

    @Override
    public BigDecimal resolverValor(ParametroDoTermo parametro) {
        this.parametroDoTermo = parametro;
        FaseDoCalculoEnum fase = parametro.getFase();
        HelperDate dataFinal = HelperDate.getInstance(parametro.getPeriodo().getFinal()).lastDayOfTheMonth();
        List<SalarioMinimoNacional> ocorrencias = SalarioMinimoNacional.obterTodosNoPeriodo(parametro.getPeriodo().getInicial(), dataFinal.getDate());
        boolean calcularProporcionalidade = false;
        if (Utils.naoNulo((Object)fase) && fase == FaseDoCalculoEnum.CALCULANDO_VALOR_DEVIDO) {
            if (parametro.getVerbaDeCalculo().getFormula() instanceof FormulaCalculada) {
                calcularProporcionalidade = ((FormulaCalculada)parametro.getVerbaDeCalculo().getFormula()).getBaseTabelada().getAplicarProporcionalidade();
            }
        } else {
            calcularProporcionalidade = parametro.getVerbaDeCalculo().getFormula().getValorPago().getAplicarProporcionalidade();
        }
        BigDecimal valorTotalIntegral = null;
        BigDecimal valorTotal = BigDecimal.ZERO;
        if (!ocorrencias.isEmpty()) {
            valorTotal = ocorrencias.get(0).getValor();
        }
        if (CaracteristicaDaVerbaEnum.FERIAS.equals((Object)parametro.getVerbaDeCalculo().getCaracteristica()) && !RegimeDoContratoEnum.INTERMITENTE.equals((Object)parametro.getCalculo().getRegimeDoContrato())) {
            BigDecimal valorMes2 = BigDecimal.ZERO;
            if (ocorrencias.size() > 1) {
                valorMes2 = ocorrencias.get(1).getValor();
                BigDecimal fatorConversao = this.verificaSeExisteFatorPorConversaoDeConversaoDeMoeda(HelperDate.getCurrentCompetence(parametro.getPeriodo().getFinal()).getDate());
                if (Utils.naoNulo(fatorConversao)) {
                    valorMes2 = valorMes2.multiply(fatorConversao, Utils.CONTEXTO_MATEMATICO);
                }
            }
            CalculoDoSalarioEmFerias salarioEmFerias = new CalculoDoSalarioEmFerias(parametro.getPeriodo(), valorTotal, valorMes2);
            salarioEmFerias.executar();
            valorTotal = salarioEmFerias.getResultado();
        } else if (calcularProporcionalidade) {
            int diasParaExcluir = 0;
            if (parametro.getVerbaDeCalculo().getExcluirFeriasGozadas().booleanValue()) {
                diasParaExcluir += parametro.getVerbaDeCalculo().getCalculo().obterDiasFerias(parametro.getPeriodo());
            }
            if (parametro.getPeriodo().totalDeDias() - diasParaExcluir == 31) {
                diasParaExcluir = 1;
            }
            if (parametro.getVerbaDeCalculo().getExcluirFaltaJustificada().booleanValue()) {
                diasParaExcluir += parametro.getVerbaDeCalculo().getCalculo().obterFaltasJustificadas(parametro.getPeriodo());
            }
            if (parametro.getVerbaDeCalculo().getExcluirFaltaNaoJustificada().booleanValue()) {
                diasParaExcluir += parametro.getVerbaDeCalculo().getCalculo().obterFaltasNaoJustificadas(parametro.getPeriodo());
            }
            valorTotalIntegral = valorTotal;
            CalculoDoProporcionalizar proporcionalizar = new CalculoDoProporcionalizar(parametro.getPeriodo(), valorTotal, diasParaExcluir);
            proporcionalizar.executar();
            valorTotal = proporcionalizar.getResultado();
        }
        this.parametroDoTermo.setValorIntegral(valorTotalIntegral);
        return valorTotal;
    }

    private BigDecimal verificaSeExisteFatorPorConversaoDeConversaoDeMoeda(Date segundoMes) {
        return ConversaoDeMoedas.COMPETENCIAS_MENSAIS_PARA_CONVERSAO_DE_MOEDAS.get(segundoMes);
    }

    public String toString() {
        return Utils.formatarNumero(this.resolverValor(null));
    }
}

