/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.constantes.LogicoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoSalarioPagoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoSolicitacaoSeguroDesempregoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorSeguroDesempregoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.ItemHistoricoSalarialDeSeguroDesemprego;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.ItemSalarioDevidoDeSeguroDesemprego;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.LegendaDaFormulaDeSeguroDesemprego;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.MaquinaDeCalculoDeSeguroDesemprego;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.segurodesemprego.RepositorioSeguroDesemprego;
import java.math.BigDecimal;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.Set;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBSEGURODESEMPREGO")
@SequenceGenerator(name="SQSEGURODESEMPREGO", sequenceName="SQSEGURODESEMPREGO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="seguroDesemprego")
public class SeguroDesemprego
extends EntidadeBase {
    private static final long serialVersionUID = -8157382505863633017L;
    public static final Date VINTE_E_OITO_FEVEREIRO_2015 = HelperDate.getInstance(2015, 1, 28).getDate();
    public static final Date DEZESSETE_JUNHO_2015 = HelperDate.getInstance(2015, 5, 17).getDate();
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQSEGURODESEMPREGO")
    @Column(name="IIDSEGURODESEMPREGO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @OneToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="SFLAPURARSEGURODESEMPREGO", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarSeguroDesemprego = Boolean.FALSE;
    @Column(name="SFLEMPREGADODOMESTICO", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean empregadoDomestico = Boolean.FALSE;
    @Column(name="STPSEGURODESEMPREGO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorSeguroDesempregoEnum")})
    private TipoValorSeguroDesempregoEnum tipoValorDoSeguroDesemprego = TipoValorSeguroDesempregoEnum.CALCULADO;
    @Column(name="STPSOLICITACAO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoSolicitacaoSeguroDesempregoEnum")})
    private TipoSolicitacaoSeguroDesempregoEnum tipoSolicitacao;
    @Column(name="IQTPARCELAS")
    @Required
    private Integer numeroDeParcelas = 0;
    @Column(name="STPSALARIOPAGO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoSalarioPagoEnum")})
    private TipoSalarioPagoEnum tipoSalarioPago = TipoSalarioPagoEnum.HISTORICO_SALARIAL;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="seguroDesemprego")
    private Set<ItemHistoricoSalarialDeSeguroDesemprego> itensHistoricoSalarialDeSegudoDesemprego;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="seguroDesemprego")
    private Set<ItemSalarioDevidoDeSeguroDesemprego> itensSalarioDevidoDeSeguroDesemprego;
    @Column(name="RVLREMUNERACAOMENSAL", precision=38, scale=25)
    private BigDecimal remuneracaoMensal = BigDecimal.ZERO;
    @Column(name="RVFINALFAIXAUMUSADO", precision=19, scale=2)
    private BigDecimal limiteFaixa1 = BigDecimal.ZERO;
    @Column(name="RVLPERCENTUALFAIXAUMUSADO", precision=5, scale=2)
    private BigDecimal valorPercentualFaixa1 = BigDecimal.ZERO;
    @Column(name="RVLPERCENTUALFAIXADOISUSADO", precision=5, scale=2)
    private BigDecimal valorPercentualFaixa2 = BigDecimal.ZERO;
    @Column(name="RVLSOMAFAIXADOISUSADO", precision=19, scale=2)
    private BigDecimal somaFaixa2 = BigDecimal.ZERO;
    @Column(name="RVLPISOUSADO", precision=19, scale=2)
    private BigDecimal valorPiso = BigDecimal.ZERO;
    @Column(name="RVLTETOUSADO", precision=19, scale=2)
    private BigDecimal valorTeto = BigDecimal.ZERO;
    @Column(name="RVLSEGURODESEMPREGO", precision=38, scale=25)
    private BigDecimal valorSeguroDesemprego = BigDecimal.ZERO;
    @Column(name="RVLINDICECORRECAO", precision=38, scale=25)
    private BigDecimal indiceDeCorrecao = BigDecimal.ZERO;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25)
    private BigDecimal taxaDeJuros = BigDecimal.ZERO;
    @Transient
    protected MaquinaDeCalculoDeSeguroDesemprego maquinaDeCalculoDeSeguroDesemprego;
    @Transient
    protected LegendaDaFormulaDeSeguroDesemprego legendaDaFormula;
    @Column(name="SFLCOMPORPRINCIPAL", columnDefinition="VARCHAR2(2)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="LogicoEnum")})
    private LogicoEnum comporPrincipal = LogicoEnum.SIM;

    public SeguroDesemprego() {
        super(RepositorioSeguroDesemprego.class);
        this.maquinaDeCalculoDeSeguroDesemprego = new MaquinaDeCalculoDeSeguroDesemprego(this);
    }

    public SeguroDesemprego(Calculo calculo) {
        this();
        this.calculo = calculo;
        this.sugerirQuantidadeDeParcelas();
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public Boolean getApurarSeguroDesemprego() {
        return this.apurarSeguroDesemprego;
    }

    public void setApurarSeguroDesemprego(Boolean apurarSeguroDesemprego) {
        this.apurarSeguroDesemprego = apurarSeguroDesemprego;
    }

    public TipoValorSeguroDesempregoEnum getTipoValorDoSeguroDesemprego() {
        return this.tipoValorDoSeguroDesemprego;
    }

    public void setTipoValorDoSeguroDesemprego(TipoValorSeguroDesempregoEnum tipoValorDoSeguroDesemprego) {
        this.tipoValorDoSeguroDesemprego = tipoValorDoSeguroDesemprego;
    }

    public TipoSolicitacaoSeguroDesempregoEnum getTipoSolicitacao() {
        return this.tipoSolicitacao;
    }

    public void setTipoSolicitacao(TipoSolicitacaoSeguroDesempregoEnum tipoSolicitacao) {
        this.tipoSolicitacao = tipoSolicitacao;
    }

    public Integer getNumeroDeParcelas() {
        return this.numeroDeParcelas;
    }

    public void setNumeroDeParcelas(Integer numeroDeParcelas) {
        this.numeroDeParcelas = numeroDeParcelas;
    }

    public TipoSalarioPagoEnum getTipoSalarioPago() {
        return this.tipoSalarioPago;
    }

    public void setTipoSalarioPago(TipoSalarioPagoEnum tipoSalarioPago) {
        this.tipoSalarioPago = tipoSalarioPago;
    }

    public Set<ItemHistoricoSalarialDeSeguroDesemprego> getItensHistoricoSalarialDeSegudoDesemprego() {
        if (Utils.nulo(this.itensHistoricoSalarialDeSegudoDesemprego)) {
            this.itensHistoricoSalarialDeSegudoDesemprego = new LinkedHashSet<ItemHistoricoSalarialDeSeguroDesemprego>();
        }
        return this.itensHistoricoSalarialDeSegudoDesemprego;
    }

    public void setItensHistoricoSalarialDeSegudoDesemprego(Set<ItemHistoricoSalarialDeSeguroDesemprego> itensHistoricoSalarialDeSegudoDesemprego) {
        this.itensHistoricoSalarialDeSegudoDesemprego = itensHistoricoSalarialDeSegudoDesemprego;
    }

    public Set<ItemSalarioDevidoDeSeguroDesemprego> getItensSalarioDevidoDeSeguroDesemprego() {
        if (Utils.nulo(this.itensSalarioDevidoDeSeguroDesemprego)) {
            this.itensSalarioDevidoDeSeguroDesemprego = new LinkedHashSet<ItemSalarioDevidoDeSeguroDesemprego>();
        }
        return this.itensSalarioDevidoDeSeguroDesemprego;
    }

    public void setItensSalarioDevidoDeSeguroDesemprego(Set<ItemSalarioDevidoDeSeguroDesemprego> itensSalarioDevidoDeSeguroDesemprego) {
        this.itensSalarioDevidoDeSeguroDesemprego = itensSalarioDevidoDeSeguroDesemprego;
    }

    public BigDecimal getRemuneracaoMensal() {
        return this.remuneracaoMensal;
    }

    public void setRemuneracaoMensal(BigDecimal remuneracaoMensal) {
        this.remuneracaoMensal = remuneracaoMensal;
    }

    public BigDecimal getLimiteFaixa1() {
        return this.limiteFaixa1;
    }

    public void setLimiteFaixa1(BigDecimal limiteFaixa1) {
        this.limiteFaixa1 = limiteFaixa1;
    }

    public BigDecimal getValorPercentualFaixa1() {
        return this.valorPercentualFaixa1;
    }

    public void setValorPercentualFaixa1(BigDecimal valorPercentualFaixa1) {
        this.valorPercentualFaixa1 = valorPercentualFaixa1;
    }

    public BigDecimal getValorPercentualFaixa2() {
        return this.valorPercentualFaixa2;
    }

    public void setValorPercentualFaixa2(BigDecimal valorPercentualFaixa2) {
        this.valorPercentualFaixa2 = valorPercentualFaixa2;
    }

    public BigDecimal getSomaFaixa2() {
        return this.somaFaixa2;
    }

    public void setSomaFaixa2(BigDecimal somaFaixa2) {
        this.somaFaixa2 = somaFaixa2;
    }

    public BigDecimal getValorPiso() {
        return this.valorPiso;
    }

    public void setValorPiso(BigDecimal valorPiso) {
        this.valorPiso = valorPiso;
    }

    public BigDecimal getValorTeto() {
        return this.valorTeto;
    }

    public void setValorTeto(BigDecimal valorTeto) {
        this.valorTeto = valorTeto;
    }

    public BigDecimal getValorSeguroDesemprego() {
        return this.valorSeguroDesemprego;
    }

    public void setValorSeguroDesemprego(BigDecimal valorSeguroDesemprego) {
        this.valorSeguroDesemprego = valorSeguroDesemprego;
    }

    public BigDecimal getIndiceDeCorrecao() {
        return this.indiceDeCorrecao;
    }

    public void setIndiceDeCorrecao(BigDecimal indiceDeCorrecao) {
        this.indiceDeCorrecao = indiceDeCorrecao;
    }

    public BigDecimal getTaxaDeJuros() {
        return this.taxaDeJuros;
    }

    public void setTaxaDeJuros(BigDecimal taxaDeJuros) {
        this.taxaDeJuros = taxaDeJuros;
    }

    public LogicoEnum getComporPrincipal() {
        return this.comporPrincipal;
    }

    public void setComporPrincipal(LogicoEnum comporPrincipal) {
        this.comporPrincipal = comporPrincipal;
    }

    public Long getId() {
        return this.id;
    }

    public Integer calculaQuantidadeDeParcelas() {
        Integer sugestaoQtdeParcelas;
        block32: {
            long qtdeMeses;
            block34: {
                block33: {
                    sugestaoQtdeParcelas = 0;
                    if (!Utils.naoNulo(this.calculo) || !Utils.naoNulo(this.calculo.getDataDemissao())) break block32;
                    qtdeMeses = this.calculo.obterQuantidadeDeMesesEntreAdmissaoEDemissaoParaSeguroDesemprego();
                    if (this.empregadoDomestico.booleanValue()) {
                        if (qtdeMeses >= 15L) {
                            sugestaoQtdeParcelas = 3;
                        }
                        return sugestaoQtdeParcelas;
                    }
                    if (!HelperDate.dateAfterOrEquals(this.calculo.getDataDemissao(), DEZESSETE_JUNHO_2015)) break block33;
                    if (Utils.nulo((Object)this.tipoSolicitacao)) {
                        this.tipoSolicitacao = TipoSolicitacaoSeguroDesempregoEnum.PRIMEIRA;
                    }
                    switch (this.tipoSolicitacao) {
                        case DEMAIS: {
                            if (qtdeMeses >= 6L && qtdeMeses < 12L) {
                                sugestaoQtdeParcelas = 3;
                                break;
                            }
                            if (qtdeMeses >= 12L && qtdeMeses < 24L) {
                                sugestaoQtdeParcelas = 4;
                                break;
                            }
                            if (qtdeMeses >= 24L) {
                                sugestaoQtdeParcelas = 5;
                                break;
                            }
                            break block32;
                        }
                        case SEGUNDA: {
                            if (qtdeMeses >= 9L && qtdeMeses < 12L) {
                                sugestaoQtdeParcelas = 3;
                                break;
                            }
                            if (qtdeMeses >= 12L && qtdeMeses < 24L) {
                                sugestaoQtdeParcelas = 4;
                                break;
                            }
                            if (qtdeMeses >= 24L) {
                                sugestaoQtdeParcelas = 5;
                                break;
                            }
                            break block32;
                        }
                        default: {
                            if (qtdeMeses >= 12L && qtdeMeses < 24L) {
                                sugestaoQtdeParcelas = 4;
                                break;
                            }
                            if (qtdeMeses >= 24L) {
                                sugestaoQtdeParcelas = 5;
                                break;
                            }
                            break block32;
                        }
                    }
                    break block32;
                }
                if (!HelperDate.dateAfterOrEquals(this.calculo.getDataDemissao(), VINTE_E_OITO_FEVEREIRO_2015)) break block34;
                if (Utils.nulo((Object)this.tipoSolicitacao)) {
                    this.tipoSolicitacao = TipoSolicitacaoSeguroDesempregoEnum.PRIMEIRA;
                }
                switch (this.tipoSolicitacao) {
                    case DEMAIS: {
                        if (qtdeMeses >= 6L && qtdeMeses < 12L) {
                            sugestaoQtdeParcelas = 3;
                            break;
                        }
                        if (qtdeMeses >= 12L && qtdeMeses < 24L) {
                            sugestaoQtdeParcelas = 4;
                            break;
                        }
                        if (qtdeMeses >= 24L) {
                            sugestaoQtdeParcelas = 5;
                            break;
                        }
                        break block32;
                    }
                    case SEGUNDA: {
                        if (qtdeMeses >= 12L && qtdeMeses < 24L) {
                            sugestaoQtdeParcelas = 4;
                            break;
                        }
                        if (qtdeMeses >= 24L) {
                            sugestaoQtdeParcelas = 5;
                            break;
                        }
                        break block32;
                    }
                    default: {
                        if (qtdeMeses >= 18L && qtdeMeses < 24L) {
                            sugestaoQtdeParcelas = 4;
                            break;
                        }
                        if (qtdeMeses >= 24L) {
                            sugestaoQtdeParcelas = 5;
                            break;
                        }
                        break block32;
                    }
                }
                break block32;
            }
            if (qtdeMeses >= 6L && qtdeMeses < 12L) {
                sugestaoQtdeParcelas = 3;
            } else if (qtdeMeses >= 12L && qtdeMeses < 24L) {
                sugestaoQtdeParcelas = 4;
            } else if (qtdeMeses >= 24L) {
                sugestaoQtdeParcelas = 5;
            }
        }
        return sugestaoQtdeParcelas;
    }

    public void sugerirQuantidadeDeParcelas() {
        if (!this.apurarSeguroDesemprego.booleanValue()) {
            return;
        }
        this.setNumeroDeParcelas(this.calculaQuantidadeDeParcelas());
    }

    public void sugerirBaseDoSalarioPago() {
        Calculo calculo = this.getCalculo();
        if (Utils.naoNulo(calculo)) {
            if (!this.getCalculo().getHistoricosSalariais().isEmpty()) {
                this.setTipoSalarioPago(TipoSalarioPagoEnum.HISTORICO_SALARIAL);
            } else if (Utils.naoNulo(calculo.getValorUltimaRemuneracao())) {
                this.setTipoSalarioPago(TipoSalarioPagoEnum.ULTIMA_REMUNERACAO);
            } else if (Utils.naoNulo(calculo.getValorMaiorRemuneracao())) {
                this.setTipoSalarioPago(TipoSalarioPagoEnum.MAIOR_REMUNERACAO);
            } else {
                this.setTipoSalarioPago(TipoSalarioPagoEnum.NENHUM);
            }
        } else {
            this.setTipoSalarioPago(TipoSalarioPagoEnum.NENHUM);
        }
    }

    public void adicionarEmItemHistoricoSalarial(ItemHistoricoSalarialDeSeguroDesemprego historico) {
        this.getItensHistoricoSalarialDeSegudoDesemprego().add(historico.validar());
    }

    public void removerDeItemHistoricoSalarial(ItemHistoricoSalarialDeSeguroDesemprego historico) {
        this.getItensHistoricoSalarialDeSegudoDesemprego().remove(historico);
    }

    public void adicionarEmItemSalarioDevido(ItemSalarioDevidoDeSeguroDesemprego verba) {
        this.getItensSalarioDevidoDeSeguroDesemprego().add(verba.validar());
    }

    public void removerDeItemSalarioDevido(ItemSalarioDevidoDeSeguroDesemprego salarioDevido) {
        this.getItensSalarioDevidoDeSeguroDesemprego().remove(salarioDevido);
    }

    public void liquidar() {
        this.maquinaDeCalculoDeSeguroDesemprego.liquidar();
    }

    public void limparJuros() {
        this.setTaxaDeJuros(null);
    }

    public void calcularJuros() {
        this.maquinaDeCalculoDeSeguroDesemprego.calcularJuros();
    }

    @Override
    public void salvar() {
        this.validar();
        super.salvar();
    }

    @Override
    public SeguroDesemprego validar() {
        if (Boolean.TRUE.equals(this.getApurarSeguroDesemprego())) {
            GerenciadorDeValidadores.getInstance().validar(SeguroDesemprego.class, this);
            if (!this.isCalculoComDemissao()) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0100, new Object[0]));
            }
            if (this.isDataDemissaoAnteriorADataPrescricaoQuinquenal()) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0074, new Object[0]));
            }
            if (this.isDataTerminoCalculoAnteriorADemissao()) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0101, new Object[0]));
            }
            if (this.tipoValorDoSeguroDesemprego == TipoValorSeguroDesempregoEnum.CALCULADO) {
                if (TipoSalarioPagoEnum.HISTORICO_SALARIAL == this.tipoSalarioPago && this.getItensHistoricoSalarialDeSegudoDesemprego().isEmpty()) {
                    throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0047, "Hist\u00f3rico"));
                }
                if (TipoSalarioPagoEnum.NENHUM == this.tipoSalarioPago && this.getItensSalarioDevidoDeSeguroDesemprego().isEmpty() && !this.empregadoDomestico.booleanValue()) {
                    throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0061, new Object[0]));
                }
                if (!TipoSalarioPagoEnum.HISTORICO_SALARIAL.equals((Object)this.tipoSalarioPago)) {
                    this.getItensHistoricoSalarialDeSegudoDesemprego().clear();
                }
            }
        }
        return this;
    }

    public BigDecimal getValorDevido() {
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorSeguroDesemprego(), new BigDecimal(this.getNumeroDeParcelas())));
    }

    public BigDecimal getValorDevidoCorrigido() {
        return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.indiceDeCorrecao, this.getValorDevido(), this.getValorDevido()));
    }

    public BigDecimal getJuros() {
        return Utils.arredondarValorMonetario(Utils.aplicarJuros(this.getTaxaDeJuros(), this.getValorDevidoCorrigido()));
    }

    public BigDecimal getTotal() {
        return Utils.somar(this.getValorDevidoCorrigido(), this.getJuros(), this.getValorDevidoCorrigido());
    }

    public boolean isCalculoComDemissao() {
        if (Utils.naoNulo(this.getCalculo())) {
            return this.getCalculo().existeDataDeDemissao();
        }
        return false;
    }

    public LegendaDaFormulaDeSeguroDesemprego getLegendaDaFormula() {
        if (Utils.nulo(this.legendaDaFormula)) {
            this.legendaDaFormula = new LegendaDaFormulaDeSeguroDesemprego(this);
        }
        return this.legendaDaFormula;
    }

    public boolean existemDadosParaRelatorio() {
        return Utils.naoNulo(this.getId()) && this.isCalculoComDemissao() && this.getApurarSeguroDesemprego() != false;
    }

    public boolean isComporOPrincipal() {
        return LogicoEnum.SIM == this.getComporPrincipal();
    }

    public boolean isDataDemissaoAnteriorADataPrescricaoQuinquenal() {
        if (Utils.naoNulo(this.getCalculo())) {
            return this.getCalculo().isDataDemissaoAnteriorADataPrescricaoQuinquenal();
        }
        return false;
    }

    public boolean isDataTerminoCalculoAnteriorADemissao() {
        if (Utils.naoNulo(this.getCalculo())) {
            return this.getCalculo().isDataTerminoCalculoAnteriorADemissao();
        }
        return false;
    }

    public Boolean getEmpregadoDomestico() {
        return this.empregadoDomestico;
    }

    public void setEmpregadoDomestico(Boolean empregadoDomestico) {
        this.empregadoDomestico = empregadoDomestico;
    }
}

