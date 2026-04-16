/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.DiscriminatorValue
 *  javax.persistence.Entity
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.verbacalculo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ComportamentoDoReflexoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.DivisorDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.PeriodoDaMediaDoReflexoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.RegimeDoContratoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeQuantidadeEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TratamentoDaFracaoDeMesDoReflexoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.ValorDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.formula.FormulaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ItemBaseVerba;
import br.jus.trt8.pjecalc.negocio.dominio.verba.Verba;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.MaquinaDeCalculoDaVerbaReflexo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.VerbaDeCalculo;
import java.math.BigDecimal;
import javax.persistence.Column;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@DiscriminatorValue(value="R")
@Name(value="verbaReflexo")
@Scope(value=ScopeType.SESSION)
public class Reflexo
extends VerbaDeCalculo {
    private static final long serialVersionUID = -155163275978636460L;
    @Column(name="STPCOMPORTAMENTOREFLEXO", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="ComportamentoDoReflexoEnum")})
    private ComportamentoDoReflexoEnum comportamentoDoReflexo = ComportamentoDoReflexoEnum.VALOR_MENSAL;
    @Column(name="STPPERIODOMEDIAREFLEXO", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="PeriodoDaMediaDoReflexoEnum")})
    private PeriodoDaMediaDoReflexoEnum periodoMediaReflexo = PeriodoDaMediaDoReflexoEnum.PERIODO_AQUISITIVO;
    @Column(name="STPTRATAMENTOFRACAOMESREFLEXO", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TratamentoDaFracaoDeMesDoReflexoEnum")})
    private TratamentoDaFracaoDeMesDoReflexoEnum tratamentoDaFracaoDeMesDoReflexo = TratamentoDaFracaoDeMesDoReflexoEnum.MANTER;

    public Reflexo() {
        this.formula = new FormulaReflexo();
        this.formula.setVerbaDeCalculo(this);
        this.maquinaDeCalculo = new MaquinaDeCalculoDaVerbaReflexo(this);
    }

    public Reflexo(Calculo calculo) {
        this();
        this.setCalculo(calculo);
    }

    public ComportamentoDoReflexoEnum getComportamentoDoReflexo() {
        return this.comportamentoDoReflexo;
    }

    public void setComportamentoDoReflexo(ComportamentoDoReflexoEnum comportamentoDoReflexo) {
        this.comportamentoDoReflexo = comportamentoDoReflexo;
    }

    public PeriodoDaMediaDoReflexoEnum getPeriodoMediaReflexo() {
        return this.periodoMediaReflexo;
    }

    public void setPeriodoMediaReflexo(PeriodoDaMediaDoReflexoEnum periodoMediaReflexo) {
        this.periodoMediaReflexo = periodoMediaReflexo;
    }

    public TratamentoDaFracaoDeMesDoReflexoEnum getTratamentoDaFracaoDeMesDoReflexo() {
        return this.tratamentoDaFracaoDeMesDoReflexo;
    }

    public void setTratamentoDaFracaoDeMesDoReflexo(TratamentoDaFracaoDeMesDoReflexoEnum tratamentoDaFracaoDeMesDoReflexo) {
        this.tratamentoDaFracaoDeMesDoReflexo = tratamentoDaFracaoDeMesDoReflexo;
    }

    @Override
    public ValorDaVerbaEnum getTipoValor() {
        return ValorDaVerbaEnum.CALCULADO;
    }

    @Override
    public void copiar(Verba verba) {
        super.copiar(verba);
        FormulaReflexo formulaReflexo = (FormulaReflexo)this.getFormula();
        formulaReflexo.getDivisor().setTipo(verba.getDivisor());
        formulaReflexo.getDivisor().setOutroValor(verba.getOutroDivisor());
        formulaReflexo.getMultiplicador().setOutroValor(verba.getMultiplicador());
        formulaReflexo.getQuantidade().setTipo(verba.getTipoDaQuantidade());
        formulaReflexo.getQuantidade().setAplicarProporcionalidade(Utils.falsoSeNulo(verba.getAplicarProporcionalidadeAQuantidade()));
        formulaReflexo.getQuantidade().setTipoImportadaCalendarioEnum(verba.getTipoImportadaCalendario());
        formulaReflexo.getQuantidade().setTipoImportadadoDoCartaoDePonto(verba.getTipoImportadadoDoCartaoDePonto());
        formulaReflexo.getQuantidade().setValorInformado(verba.getValorInformadoDaQuantidade());
        this.setComportamentoDoReflexo(verba.getComportamentoDoReflexo());
        this.setPeriodoMediaReflexo(verba.getPeriodoMediaReflexo());
        this.setTratamentoDaFracaoDeMesDoReflexo(verba.getTratamentoDaFracaoDeMesDoReflexo());
        if (RegimeDoContratoEnum.INTERMITENTE.equals((Object)this.getCalculo().getRegimeDoContrato()) && (CaracteristicaDaVerbaEnum.DECIMO_TERCEIRO_SALARIO.equals((Object)verba.getCaracteristica()) || CaracteristicaDaVerbaEnum.FERIAS.equals((Object)verba.getCaracteristica()))) {
            formulaReflexo.getDivisor().setTipo(DivisorDeVerbaEnum.OUTRO_VALOR);
            formulaReflexo.getDivisor().setOutroValor(new BigDecimal("12"));
            formulaReflexo.getQuantidade().setTipo(TipoDeQuantidadeEnum.INFORMADA);
            formulaReflexo.getQuantidade().setValorInformado(BigDecimal.ONE);
            this.setComportamentoDoReflexo(ComportamentoDoReflexoEnum.VALOR_MENSAL);
            this.setTratamentoDaFracaoDeMesDoReflexo(TratamentoDaFracaoDeMesDoReflexoEnum.MANTER);
        }
    }

    public void ativar() {
        if (this.getAtivo().booleanValue()) {
            this.gerarOcorrencias(false);
        }
        super.salvar();
    }

    @Override
    public boolean isPrincipal() {
        return false;
    }

    @Override
    public boolean isInformada() {
        return false;
    }

    @Override
    public VerbaDeCalculo consistirPeriodoInicial() {
        super.consistirPeriodoInicial();
        if (this.formula != null) {
            FormulaReflexo formulaReflexo = (FormulaReflexo)this.getFormula();
            for (ItemBaseVerba itemBaseverba : formulaReflexo.getBaseVerba().getItens()) {
                if (!itemBaseverba.getVerbaDeCalculo().isPrincipal()) continue;
                if (!HelperDate.getInstance(this.getPeriodoInicial()).lessThen(itemBaseverba.getVerbaDeCalculo().getPeriodoInicial())) break;
                throw new NegocioException(new MensagemDeRecurso("periodoInicial", Mensagens.MSG0008, "Data Inicial", "Data Inicial da Verba Principal"));
            }
        }
        return this;
    }

    @Override
    public VerbaDeCalculo validar() {
        super.validar();
        NegocioException ne = new NegocioException();
        if (this.getFormula(FormulaReflexo.class).getBaseVerba().getItens().isEmpty()) {
            ne.adicionarMensagemDeRecurso(new MensagemDeRecurso("baseVerbaDeCalculo", Mensagens.MSG0003, "Verba"));
        }
        if (ne.existeMensagensDeRecurso()) {
            throw ne;
        }
        return this;
    }
}

