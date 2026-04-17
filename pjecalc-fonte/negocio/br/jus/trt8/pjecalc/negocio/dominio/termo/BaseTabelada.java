/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Embeddable
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.rotinasdecalculo.CalculoDoProporcionalizar;
import br.jus.trt8.pjecalc.negocio.constantes.BaseDeCalculoDoPrincipalEnum;
import br.jus.trt8.pjecalc.negocio.constantes.CaracteristicaDaVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.RegimeDoContratoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.ferias.Ferias;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Termo;
import java.math.BigDecimal;
import javax.persistence.Column;
import javax.persistence.Embeddable;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;

@Embeddable
public class BaseTabelada
implements Termo {
    private static final long serialVersionUID = 7731955059449935538L;
    private static final long TRINTA_DIAS = 30L;
    @Column(name="STPBASE", columnDefinition="VARCHAR2(3)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="BaseDeCalculoDoPrincipalEnum")})
    private BaseDeCalculoDoPrincipalEnum tipo;
    @Column(name="SFLPROPORCIONALIDADE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarProporcionalidade = false;

    public BaseTabelada(BaseDeCalculoDoPrincipalEnum tipo) {
        this.tipo = tipo;
    }

    public BaseTabelada() {
    }

    @Override
    public BigDecimal resolverValor(ParametroDoTermo parametro) {
        if (this.tipo == null) {
            return null;
        }
        BigDecimal valor = this.tipo.criarProxyDeTermoParaFormula().resolverValor(parametro);
        if (valor != null) {
            if (CaracteristicaDaVerbaEnum.FERIAS.equals((Object)parametro.getVerbaDeCalculo().getCaracteristica()) && !RegimeDoContratoEnum.INTERMITENTE.equals((Object)parametro.getCalculo().getRegimeDoContrato())) {
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
                            if (ferias.getAbono().booleanValue()) {
                                totalDeDias = totalDeDias - ferias.getQuantidadeDiasAbono();
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
        }
        return valor;
    }

    public BaseDeCalculoDoPrincipalEnum getTipo() {
        return this.tipo;
    }

    public void setTipo(BaseDeCalculoDoPrincipalEnum tipo) {
        this.tipo = tipo;
    }

    public Boolean getAplicarProporcionalidade() {
        return this.aplicarProporcionalidade == null ? Boolean.FALSE : this.aplicarProporcionalidade;
    }

    public void setAplicarProporcionalidade(Boolean aplicarProporcionalidade) {
        this.aplicarProporcionalidade = aplicarProporcionalidade;
    }

    private boolean isTipoMaiorOuUltimaRemuneracao() {
        return this.getTipo() == BaseDeCalculoDoPrincipalEnum.MAIOR_REMUNERACAO || this.getTipo() == BaseDeCalculoDoPrincipalEnum.ULTIMA_REMUNERACAO;
    }

    public String toString() {
        return super.toString();
    }
}

