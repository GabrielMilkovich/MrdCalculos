/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoProporcionalizar;
import br.jus.trt8.pjecalc.negocio.constantes.BaseDeCalculoDoPrincipalEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorPagoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Termo;
import java.math.BigDecimal;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBVALORPAGO")
@SequenceGenerator(name="SQVALORPAGO", sequenceName="SQVALORPAGO", allocationSize=1)
@Name(value="valorPago")
public class ValorPago
implements Termo {
    private static final long serialVersionUID = 124303570048290922L;
    private static final long TRINTA_DIAS = 30L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQVALORPAGO")
    @Column(name="IIDVALORPAGO")
    private final Long id = null;
    @Column(name="STPVALORPAGO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorPagoEnum")})
    @NotNull
    private TipoValorPagoEnum tipo = TipoValorPagoEnum.INFORMADO;
    @Column(name="RVLOUTROVALOR", precision=38, scale=25)
    private BigDecimal valorInformado = new BigDecimal("0");
    @Column(name="RVLQUANTIDADE", precision=7, scale=4)
    private BigDecimal quantidade;
    @Column(name="SFLPROPORCIONALIDADE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarProporcionalidade = false;
    @Column(name="STPBASE", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="BaseDeCalculoDoPrincipalEnum")})
    private BaseDeCalculoDoPrincipalEnum baseTabelada;

    @Override
    public BigDecimal resolverValor(ParametroDoTermo parametro) {
        BigDecimal valor = null;
        if (this.tipo == TipoValorPagoEnum.INFORMADO) {
            valor = this.valorInformado;
            if (valor != null && this.getAplicarProporcionalidade().booleanValue()) {
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
                parametro.setValorIntegral(valor);
                CalculoDoProporcionalizar calculoDoProporcionalizar = new CalculoDoProporcionalizar(parametro.getPeriodo(), valor, diasParaExcluir);
                calculoDoProporcionalizar.executar();
                valor = calculoDoProporcionalizar.getResultado();
            }
        } else {
            valor = this.baseTabelada.criarProxyDeTermoParaFormula().resolverValor(parametro);
            if (valor != null) {
                if (CaracteristicaDaVerbaEnum.FERIAS.equals((Object)parametro.getVerbaDeCalculo().getCaracteristica())) {
                    if (HelperDate.dateEquals(parametro.getPeriodo().getInicial(), parametro.getPeriodo().getFinal()) && Utils.naoNulo(parametro.getCalculo().getDataDemissao()) && HelperDate.dateEquals(parametro.getPeriodo().getInicial(), parametro.getCalculo().getDataDemissao())) {
                        boolean encontrouFerias = false;
                        for (Ferias ferias : parametro.getCalculo().getListaDeFerias()) {
                            if (!ferias.getPeriodoAquisitivo().isMesmoPeriodo(parametro.getPeriodoAquisitivo())) continue;
                            encontrouFerias = true;
                            if (parametro.isFeriasIndenizadas()) {
                                Integer totalDeDias = ferias.getPrazo();
                                if (ferias.getPeriodoDeGozo1() != null) {
                                    totalDeDias = totalDeDias - ferias.getPeriodoDeGozo1().totalDeDias();
                                }
                                if (ferias.getPeriodoDeGozo2() != null) {
                                    totalDeDias = totalDeDias - ferias.getPeriodoDeGozo2().totalDeDias();
                                }
                                if (ferias.getPeriodoDeGozo3() != null) {
                                    totalDeDias = totalDeDias - ferias.getPeriodoDeGozo3().totalDeDias();
                                }
                                valor = valor.multiply(new BigDecimal(totalDeDias), Utils.CONTEXTO_MATEMATICO);
                            }
                            if (!this.isTipoMaiorOuUltimaRemuneracao()) break;
                            valor = valor.divide(new BigDecimal(30L), Utils.CONTEXTO_MATEMATICO);
                            break;
                        }
                        if (!encontrouFerias) {
                            int prazo = Ferias.encontrarPrazoFeriasProporcionais(parametro);
                            valor = valor.multiply(new BigDecimal(prazo), Utils.CONTEXTO_MATEMATICO);
                            if (this.isTipoMaiorOuUltimaRemuneracao()) {
                                valor = valor.divide(new BigDecimal(30L), Utils.CONTEXTO_MATEMATICO);
                            }
                        }
                    } else if (this.isTipoMaiorOuUltimaRemuneracao()) {
                        valor = valor.divide(new BigDecimal(30L), Utils.CONTEXTO_MATEMATICO);
                        valor = valor.multiply(new BigDecimal(parametro.getPeriodo().totalDeDias()), Utils.CONTEXTO_MATEMATICO);
                    }
                } else if (this.isTipoMaiorOuUltimaRemuneracao() && this.getAplicarProporcionalidade().booleanValue()) {
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
                    CalculoDoProporcionalizar proporcionalizar = new CalculoDoProporcionalizar(parametro.getPeriodo(), valor, diasParaExcluir);
                    proporcionalizar.executar();
                    parametro.setValorIntegral(valor);
                    valor = proporcionalizar.getResultado();
                }
                valor = valor != null ? valor.multiply(this.quantidade, Utils.CONTEXTO_MATEMATICO) : null;
                parametro.setValorIntegral(parametro.getValorIntegral() != null ? parametro.getValorIntegral().multiply(this.quantidade, Utils.CONTEXTO_MATEMATICO) : null);
            }
        }
        return valor;
    }

    public TipoValorPagoEnum getTipo() {
        return this.tipo;
    }

    public void setTipo(TipoValorPagoEnum tipo) {
        this.tipo = tipo;
    }

    public BigDecimal getValorInformado() {
        return this.valorInformado;
    }

    public void setValorInformado(BigDecimal valorInformado) {
        this.valorInformado = valorInformado;
    }

    public BigDecimal getQuantidade() {
        return this.quantidade;
    }

    public void setQuantidade(BigDecimal quantidade) {
        this.quantidade = quantidade;
    }

    public Boolean getAplicarProporcionalidade() {
        return this.aplicarProporcionalidade;
    }

    public void setAplicarProporcionalidade(Boolean aplicarProporcionalidade) {
        this.aplicarProporcionalidade = aplicarProporcionalidade;
    }

    public Long getId() {
        return this.id;
    }

    public void setBaseTabelada(BaseDeCalculoDoPrincipalEnum baseTabelada) {
        this.baseTabelada = baseTabelada;
    }

    public BaseDeCalculoDoPrincipalEnum getBaseTabelada() {
        return this.baseTabelada;
    }

    public boolean isInformado() {
        return TipoValorPagoEnum.INFORMADO.equals((Object)this.tipo);
    }

    public boolean isCalculado() {
        return TipoValorPagoEnum.CALCULADO.equals((Object)this.tipo);
    }

    private ValorPago consistirValorInformado() {
        if (this.isInformado() && this.valorInformado.compareTo(BigDecimal.ZERO) < 0) {
            throw new NegocioException(new MensagemDeRecurso("valorInformadoPago", Mensagens.MSG0004, "Valor Pago"));
        }
        return this;
    }

    private ValorPago consistirQuantidade() {
        if (this.isCalculado() && this.quantidade.compareTo(BigDecimal.ZERO) <= 0) {
            throw new NegocioException(new MensagemDeRecurso("valorPagoQuantidade", Mensagens.MSG0004, "Quantidade"));
        }
        return this;
    }

    public ValorPago consistir() {
        return this.consistirValorInformado().consistirQuantidade();
    }

    private boolean isTipoMaiorOuUltimaRemuneracao() {
        return BaseDeCalculoDoPrincipalEnum.MAIOR_REMUNERACAO.equals((Object)this.baseTabelada) || BaseDeCalculoDoPrincipalEnum.ULTIMA_REMUNERACAO.equals((Object)this.baseTabelada);
    }

    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.aplicarProporcionalidade == null ? 0 : this.aplicarProporcionalidade.hashCode());
        result = 31 * result + (this.baseTabelada == null ? 0 : this.baseTabelada.hashCode());
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
        result = 31 * result + (this.quantidade == null ? 0 : this.quantidade.hashCode());
        result = 31 * result + (this.tipo == null ? 0 : this.tipo.hashCode());
        result = 31 * result + (this.valorInformado == null ? 0 : this.valorInformado.hashCode());
        return result;
    }

    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        ValorPago other = (ValorPago)obj;
        if (this.aplicarProporcionalidade == null ? other.aplicarProporcionalidade != null : !this.aplicarProporcionalidade.equals(other.aplicarProporcionalidade)) {
            return false;
        }
        if (this.baseTabelada != other.baseTabelada) {
            return false;
        }
        if (this.id == null ? other.id != null : !this.id.equals(other.id)) {
            return false;
        }
        if (this.quantidade == null ? other.quantidade != null : !this.quantidade.equals(other.quantidade)) {
            return false;
        }
        if (this.tipo != other.tipo) {
            return false;
        }
        return !(this.valorInformado == null ? other.valorInformado != null : !this.valorInformado.equals(other.valorInformado));
    }
}

