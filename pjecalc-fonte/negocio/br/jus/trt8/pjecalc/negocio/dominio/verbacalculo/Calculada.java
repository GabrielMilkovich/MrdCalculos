/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.DiscriminatorValue
 *  javax.persistence.Entity
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.BaseDeCalculoDoPrincipalEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DivisorDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.RegimeDoContratoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVinculoDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ValorDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaCalculada;
import br.jus.trt8.pjecalc.negocio.dominio.termo.BaseTabelada;
import br.jus.trt8.pjecalc.negocio.dominio.valetransporte.ValeTransporte;
import br.jus.trt8.pjecalc.negocio.dominio.verba.Verba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.HistoricoSalarialDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculoDaVerbaCalculada;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.Principal;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.ValeTransporteDaVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;
import org.jboss.seam.annotations.Name;

@Entity
@DiscriminatorValue(value="C")
@Name(value="verbaCalculada")
public class Calculada
extends Principal {
    private static final long serialVersionUID = 5856020040464637048L;

    public Calculada() {
        this.formula = new FormulaCalculada();
        this.formula.setVerbaDeCalculo(this);
        this.maquinaDeCalculo = new MaquinaDeCalculoDaVerbaCalculada(this);
    }

    public Calculada(Calculo calculo) {
        this();
        this.setCalculo(calculo);
    }

    @Override
    public ValorDaVerbaEnum getTipoValor() {
        return ValorDaVerbaEnum.CALCULADO;
    }

    @Override
    public void copiar(Verba verba) {
        List<ValeTransporte> valesUrbanosDoMunicipio;
        super.copiar(verba);
        FormulaCalculada formulaCalculada = (FormulaCalculada)this.getFormula();
        formulaCalculada.getDivisor().setTipo(verba.getDivisor());
        formulaCalculada.getDivisor().setOutroValor(verba.getOutroDivisor());
        formulaCalculada.getMultiplicador().setOutroValor(verba.getMultiplicador());
        formulaCalculada.getQuantidade().setTipo(verba.getTipoDaQuantidade());
        formulaCalculada.getQuantidade().setAplicarProporcionalidade(Utils.falsoSeNulo(verba.getAplicarProporcionalidadeAQuantidade()));
        formulaCalculada.getQuantidade().setTipoImportadaCalendarioEnum(verba.getTipoImportadaCalendario());
        formulaCalculada.getQuantidade().setTipoImportadadoDoCartaoDePonto(verba.getTipoImportadadoDoCartaoDePonto());
        formulaCalculada.getQuantidade().setValorInformado(verba.getValorInformadoDaQuantidade());
        formulaCalculada.setBaseTabelada(new BaseTabelada(verba.getBaseDeCalculoDoPrincipal()));
        if (RegimeDoContratoEnum.INTERMITENTE.equals((Object)this.getCalculo().getRegimeDoContrato()) && (CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO.equals((Object)verba.getCaracteristica()) || CaracteristicaDaVerbaEnum.FERIAS.equals((Object)verba.getCaracteristica()))) {
            formulaCalculada.getDivisor().setTipo(DivisorDeVerbaEnum.OUTRO_VALOR);
            formulaCalculada.getDivisor().setOutroValor(new BigDecimal("12"));
            formulaCalculada.getQuantidade().setTipo(TipoDeQuantidadeEnum.INFORMADA);
            formulaCalculada.getQuantidade().setValorInformado(BigDecimal.ONE);
            formulaCalculada.setBaseTabelada(new BaseTabelada(BaseDeCalculoDoPrincipalEnum.HISTORICO_SALARIAL));
            this.selecionarBaseHistoricoPadrao(formulaCalculada);
        } else if (BaseDeCalculoDoPrincipalEnum.HISTORICO_SALARIAL == verba.getBaseDeCalculoDoPrincipal()) {
            this.selecionarBaseHistoricoPadrao(formulaCalculada);
        } else if (BaseDeCalculoDoPrincipalEnum.VALE_TRANSPORTE == verba.getBaseDeCalculoDoPrincipal() && Utils.naoNulo(this.getCalculo()) && Utils.naoNulos(this.getCalculo().getEstado(), this.getCalculo().getMunicipio()) && (valesUrbanosDoMunicipio = ValeTransporte.obterTodosUrbanosPorMunicipio(this.getCalculo().getMunicipio())).size() == 1) {
            LinkedHashSet<ValeTransporteDaVerba> vales = new LinkedHashSet<ValeTransporteDaVerba>();
            vales.add(new ValeTransporteDaVerba(this, valesUrbanosDoMunicipio.iterator().next(), TipoVinculoDeVerbaEnum.BASE));
            this.adicionarValesVinculadosAtravesDoValorDevido(vales);
        }
        formulaCalculada.getBaseTabelada().setAplicarProporcionalidade(Utils.falsoSeNulo(verba.getAplicarProporcionalidade()));
    }

    private void selecionarBaseHistoricoPadrao(FormulaCalculada formulaCalculada) {
        if (Utils.nulo(this.getCalculo())) {
            return;
        }
        if (this.getCalculo().getHistoricosSalariais().isEmpty() && Utils.naoNulo(this.getCalculo().getValorUltimaRemuneracao())) {
            formulaCalculada.setBaseTabelada(new BaseTabelada(BaseDeCalculoDoPrincipalEnum.ULTIMA_REMUNERACAO));
        } else if (this.getCalculo().getHistoricosSalariais().size() == 1) {
            LinkedHashSet<HistoricoSalarialDaVerba> historicos = new LinkedHashSet<HistoricoSalarialDaVerba>();
            historicos.add(new HistoricoSalarialDaVerba(this, this.getCalculo().getHistoricosSalariais().iterator().next(), TipoVinculoDeVerbaEnum.BASE, this.getAplicarProporcionalidade()));
            this.adicionarHistoricosVinculadosAtravesDoValorDevido(historicos);
        }
    }

    @Override
    public VerbaDeCalculo validar() {
        super.validar();
        FormulaCalculada formulaCalculada = this.getFormula(FormulaCalculada.class);
        NegocioException ne = new NegocioException();
        if ((Utils.nulo(formulaCalculada.getBaseTabelada()) || Utils.nulo((Object)formulaCalculada.getBaseTabelada().getTipo())) && formulaCalculada.getBaseVerba().getItens().isEmpty()) {
            ne.adicionarMensagemDeRecurso(new MensagemDeRecurso("tipoDaBaseTabelada", Mensagens.MSG0003, "Bases Cadastradas"));
            ne.adicionarMensagemDeRecurso(new MensagemDeRecurso("baseVerbaDeCalculo", Mensagens.MSG0003, "Verba"));
        }
        if (!this.isOrigemExpressa()) {
            if (BaseDeCalculoDoPrincipalEnum.HISTORICO_SALARIAL == formulaCalculada.getBaseTabelada().getTipo() && this.getHistoricosDaVerbaDoValorDevido().isEmpty()) {
                ne.adicionarMensagemDeRecurso(new MensagemDeRecurso("baseHistoricos", Mensagens.MSG0003, "Hist\u00f3rico Salarial"));
            }
            if (BaseDeCalculoDoPrincipalEnum.VALE_TRANSPORTE == formulaCalculada.getBaseTabelada().getTipo() && this.getValesTransportesDoValorDevido().isEmpty()) {
                ne.adicionarMensagemDeRecurso(new MensagemDeRecurso("valeTransporteDevido", Mensagens.MSG0003, "Vale Transporte"));
            }
        }
        if (ne.existeMensagensDeRecurso()) {
            throw ne;
        }
        return this;
    }

    @Override
    public boolean isInformada() {
        return false;
    }
}

