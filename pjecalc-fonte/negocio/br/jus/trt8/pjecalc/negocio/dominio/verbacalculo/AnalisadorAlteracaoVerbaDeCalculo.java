/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.BaseDeCalculoDoPrincipalEnum;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaInformada;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Divisor;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Quantidade;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ValorPago;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.ComparadorDeListas;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.HistoricoSalarialDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.ValeTransporteDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.util.HashSet;

public class AnalisadorAlteracaoVerbaDeCalculo {
    private final VerbaDeCalculo verbaDeCalculo;
    private final VerbaDeCalculo original;

    public AnalisadorAlteracaoVerbaDeCalculo(VerbaDeCalculo verbaDeCalculo, VerbaDeCalculo original) {
        this.verbaDeCalculo = verbaDeCalculo;
        this.original = original;
    }

    private boolean alterouExclusoes() {
        boolean alterou = false;
        if (!(this.verbaDeCalculo.getExcluirFaltaJustificada().equals(this.original.getExcluirFaltaJustificada()) && this.verbaDeCalculo.getExcluirFaltaNaoJustificada().equals(this.original.getExcluirFaltaNaoJustificada()) && this.verbaDeCalculo.getExcluirFeriasGozadas().equals(this.original.getExcluirFeriasGozadas()))) {
            alterou = true;
        }
        return alterou;
    }

    private boolean alterouDobra() {
        boolean alterou = false;
        if (this.verbaDeCalculo.getFormula() instanceof FormulaReflexo && this.original.getFormula() instanceof FormulaReflexo && !((FormulaReflexo)this.verbaDeCalculo.getFormula()).getDobra().equals(((FormulaReflexo)this.original.getFormula()).getDobra())) {
            alterou = true;
        }
        return alterou;
    }

    private boolean alterouDevido() {
        boolean alterou = false;
        if (this.verbaDeCalculo.getFormula() instanceof FormulaInformada && this.original.getFormula() instanceof FormulaInformada && (((FormulaInformada)this.verbaDeCalculo.getFormula()).getValorDevidoInformado().compareTo(((FormulaInformada)this.original.getFormula()).getValorDevidoInformado()) != 0 || !this.verbaDeCalculo.getAplicarProporcionalidade().equals(this.original.getAplicarProporcionalidade()))) {
            alterou = true;
        }
        return alterou;
    }

    private boolean alterouDivisor() {
        boolean alterou = false;
        if (this.verbaDeCalculo.getFormula() instanceof FormulaReflexo && this.original.getFormula() instanceof FormulaReflexo) {
            Divisor divisorVerbaDeCalculo = ((FormulaReflexo)this.verbaDeCalculo.getFormula()).getDivisor();
            Divisor divisorOriginal = ((FormulaReflexo)this.original.getFormula()).getDivisor();
            if (!divisorVerbaDeCalculo.getTipo().equals((Object)divisorOriginal.getTipo())) {
                alterou = true;
            } else {
                switch (divisorVerbaDeCalculo.getTipo()) {
                    case OUTRO_VALOR: {
                        if (divisorVerbaDeCalculo.getOutroValor().compareTo(divisorOriginal.getOutroValor()) == 0) break;
                        alterou = true;
                        break;
                    }
                    case IMPORTADA_DO_CARTAO: {
                        if (this.verbaDeCalculo.getCartoesDePontoDaVerbaDivisor().equals(this.original.getCartoesDePontoDaVerbaDivisor())) break;
                        alterou = true;
                        break;
                    }
                }
            }
        }
        return alterou;
    }

    private boolean alterouMultiplicador() {
        boolean alterou = false;
        if (this.verbaDeCalculo.getFormula() instanceof FormulaReflexo && this.original.getFormula() instanceof FormulaReflexo && ((FormulaReflexo)this.verbaDeCalculo.getFormula()).getMultiplicador().getOutroValor().compareTo(((FormulaReflexo)this.original.getFormula()).getMultiplicador().getOutroValor()) != 0) {
            alterou = true;
        }
        return alterou;
    }

    private boolean alterouQuantidade() {
        boolean alterou = false;
        if (this.verbaDeCalculo.getFormula() instanceof FormulaReflexo && this.original.getFormula() instanceof FormulaReflexo) {
            Quantidade quantidadeVerbaDeCalculo = ((FormulaReflexo)this.verbaDeCalculo.getFormula()).getQuantidade();
            Quantidade quantidadeOriginal = ((FormulaReflexo)this.original.getFormula()).getQuantidade();
            if (!quantidadeVerbaDeCalculo.getTipo().equals((Object)quantidadeOriginal.getTipo())) {
                alterou = true;
            } else {
                switch (quantidadeVerbaDeCalculo.getTipo()) {
                    case INFORMADA: {
                        if (quantidadeVerbaDeCalculo.getAplicarProporcionalidade().equals(quantidadeOriginal.getAplicarProporcionalidade()) && quantidadeVerbaDeCalculo.getValorInformado().compareTo(quantidadeOriginal.getValorInformado()) == 0) break;
                        alterou = true;
                        break;
                    }
                    case IMPORTADA_DO_CALENDARIO: {
                        if (quantidadeVerbaDeCalculo.getTipoImportadaCalendarioEnum().equals((Object)quantidadeOriginal.getTipoImportadaCalendarioEnum())) break;
                        alterou = true;
                        break;
                    }
                    case IMPORTADA_DO_CARTAO: {
                        if (this.verbaDeCalculo.getCartoesDePontoDaVerbaQuantidade().equals(this.original.getCartoesDePontoDaVerbaQuantidade())) break;
                        alterou = true;
                        break;
                    }
                }
            }
        }
        return alterou;
    }

    private boolean alterouValorPago() {
        boolean alterou = false;
        ValorPago valorPagoVerbaDeCalculo = this.verbaDeCalculo.getFormula().getValorPago();
        ValorPago valorPagoOriginal = this.original.getFormula().getValorPago();
        if (!valorPagoVerbaDeCalculo.getTipo().equals((Object)valorPagoOriginal.getTipo())) {
            alterou = true;
        } else {
            block0 : switch (valorPagoVerbaDeCalculo.getTipo()) {
                case INFORMADO: {
                    if (valorPagoVerbaDeCalculo.getAplicarProporcionalidade().equals(valorPagoOriginal.getAplicarProporcionalidade()) && valorPagoVerbaDeCalculo.getValorInformado().compareTo(valorPagoOriginal.getValorInformado()) == 0) break;
                    alterou = true;
                    break;
                }
                case CALCULADO: {
                    if (!valorPagoVerbaDeCalculo.getBaseTabelada().equals((Object)valorPagoOriginal.getBaseTabelada())) {
                        alterou = true;
                        break;
                    }
                    switch (valorPagoVerbaDeCalculo.getBaseTabelada()) {
                        case MAIOR_REMUNERACAO: 
                        case SALARIO_MINIMO: {
                            if (valorPagoVerbaDeCalculo.getAplicarProporcionalidade().equals(valorPagoOriginal.getAplicarProporcionalidade()) && valorPagoVerbaDeCalculo.getQuantidade().compareTo(valorPagoOriginal.getQuantidade()) == 0) break block0;
                            alterou = true;
                            break block0;
                        }
                        case SALARIO_DA_CATEGORIA: {
                            if (!Utils.nulo(this.original.getSalarioCategoriaValorPago()) && this.verbaDeCalculo.getSalarioCategoriaValorPago().getNome().equals(this.original.getSalarioCategoriaValorPago().getNome()) && valorPagoVerbaDeCalculo.getAplicarProporcionalidade().equals(valorPagoOriginal.getAplicarProporcionalidade()) && valorPagoVerbaDeCalculo.getQuantidade().compareTo(valorPagoOriginal.getQuantidade()) == 0) break block0;
                            alterou = true;
                            break block0;
                        }
                        case VALE_TRANSPORTE: {
                            ComparadorDeListas c;
                            HashSet<ComparadorDeListas> valesAtuais = new HashSet<ComparadorDeListas>();
                            HashSet<ComparadorDeListas> valesOriginais = new HashSet<ComparadorDeListas>();
                            for (ValeTransporteDaVerba vtv : this.verbaDeCalculo.getValesTransportesDoValorPago()) {
                                c = new ComparadorDeListas(vtv.getValeTransporte().getDescricaoLinha(), "");
                                valesAtuais.add(c);
                            }
                            for (ValeTransporteDaVerba vtv : this.original.getValesTransportesDoValorPago()) {
                                c = new ComparadorDeListas(vtv.getValeTransporte().getDescricaoLinha(), "");
                                valesOriginais.add(c);
                            }
                            if (valesAtuais.containsAll(valesOriginais) && valesOriginais.containsAll(valesAtuais) && valorPagoVerbaDeCalculo.getAplicarProporcionalidade().equals(valorPagoOriginal.getAplicarProporcionalidade()) && valorPagoVerbaDeCalculo.getQuantidade().compareTo(valorPagoOriginal.getQuantidade()) == 0) break block0;
                            alterou = true;
                            break block0;
                        }
                        case HISTORICO_SALARIAL: {
                            ComparadorDeListas c;
                            HashSet<ComparadorDeListas> historicosAtuais = new HashSet<ComparadorDeListas>();
                            HashSet<ComparadorDeListas> historicosOriginais = new HashSet<ComparadorDeListas>();
                            for (HistoricoSalarialDaVerba hsv : this.verbaDeCalculo.getHistoricosDaVerbaDoValorPago()) {
                                c = new ComparadorDeListas(hsv.getHistoricoSalarial().getNome(), hsv.getAplicarProporcionalidade().toString());
                                historicosAtuais.add(c);
                            }
                            for (HistoricoSalarialDaVerba hsv : this.original.getHistoricosDaVerbaDoValorPago()) {
                                c = new ComparadorDeListas(hsv.getHistoricoSalarial().getNome(), hsv.getAplicarProporcionalidade().toString());
                                historicosOriginais.add(c);
                            }
                            if (historicosAtuais.containsAll(historicosOriginais) && historicosOriginais.containsAll(historicosAtuais) && valorPagoVerbaDeCalculo.getQuantidade().compareTo(valorPagoOriginal.getQuantidade()) == 0) break block0;
                            alterou = true;
                            break block0;
                        }
                    }
                    break;
                }
            }
        }
        return alterou;
    }

    public void marcarVerbaSeNecessario() {
        boolean alterouDobra;
        boolean alterouDataFinal;
        boolean alterouDataInicial;
        boolean alterouOcorrenciaPagamento;
        boolean alterouCaracteristica;
        boolean bl = alterouCaracteristica = !this.verbaDeCalculo.getCaracteristica().equals((Object)this.original.getCaracteristica());
        if (alterouCaracteristica) {
            this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
            return;
        }
        boolean bl2 = alterouOcorrenciaPagamento = !this.verbaDeCalculo.getOcorrenciaDePagamento().equals((Object)this.original.getOcorrenciaDePagamento());
        if (alterouOcorrenciaPagamento) {
            this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
            return;
        }
        boolean bl3 = alterouDataInicial = !HelperDate.dateEquals(this.verbaDeCalculo.getPeriodoInicial(), this.original.getPeriodoInicial());
        if (alterouDataInicial) {
            this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
            return;
        }
        boolean bl4 = alterouDataFinal = !HelperDate.dateEquals(this.verbaDeCalculo.getPeriodoFinal(), this.original.getPeriodoFinal());
        if (alterouDataFinal) {
            this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
            return;
        }
        boolean alterouExclusoes = this.alterouExclusoes();
        if (alterouExclusoes) {
            if (this.verbaDeCalculo.getFormula() instanceof FormulaInformada && Boolean.TRUE.equals(this.verbaDeCalculo.getAplicarProporcionalidade())) {
                this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
                return;
            }
            if (this.verbaDeCalculo.getFormula() instanceof FormulaReflexo && Boolean.TRUE.equals(((FormulaReflexo)this.verbaDeCalculo.getFormula()).getQuantidade().getAplicarProporcionalidade())) {
                this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
                return;
            }
            if (Boolean.TRUE.equals(this.verbaDeCalculo.getFormula().getValorPago().getAplicarProporcionalidade())) {
                this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
                return;
            }
            if (this.verbaDeCalculo.getFormula().getValorPago().isCalculado() && this.verbaDeCalculo.getFormula().getValorPago().getBaseTabelada().equals((Object)BaseDeCalculoDoPrincipalEnum.HISTORICO_SALARIAL) && this.verificarSeExisteHistoricoComProporcionalizar()) {
                this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
                return;
            }
        }
        if (alterouDobra = this.alterouDobra()) {
            this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
            return;
        }
        boolean alterouDevido = this.alterouDevido();
        if (alterouDevido) {
            this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
            return;
        }
        boolean alterouDivisor = this.alterouDivisor();
        if (alterouDivisor) {
            this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
            return;
        }
        boolean alterouMultiplicador = this.alterouMultiplicador();
        if (alterouMultiplicador) {
            this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
            return;
        }
        boolean alterouQuantidade = this.alterouQuantidade();
        if (alterouQuantidade) {
            this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
            return;
        }
        boolean alterouValorPago = this.alterouValorPago();
        if (alterouValorPago) {
            this.verbaDeCalculo.setVerbaAlterada(Boolean.TRUE);
            return;
        }
    }

    private boolean verificarSeExisteHistoricoComProporcionalizar() {
        for (HistoricoSalarialDaVerba historico : this.verbaDeCalculo.getHistoricosDaVerbaDoValorPago()) {
            if (!historico.getAplicarProporcionalidade().booleanValue()) continue;
            return true;
        }
        return false;
    }
}

