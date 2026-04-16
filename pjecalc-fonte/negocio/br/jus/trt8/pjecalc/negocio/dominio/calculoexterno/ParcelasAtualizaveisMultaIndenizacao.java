/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.constantes.CredorDevedorMultaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.regras.DataAPartirDeAplicarJurosMultaValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDebitosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacaoUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.RepositorioDeParcelasAtualizaveisMultaIndenizacao;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBPARCEATUALIZMULTAS")
@SequenceGenerator(name="SQPARCEATUALIZMULTAS", sequenceName="SQPARCEATUALIZMULTAS", allocationSize=1)
@Name(value="parcelasAtualizaveisMultaIndenizacao")
public class ParcelasAtualizaveisMultaIndenizacao
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPARCEATUALIZMULTAS")
    @Column(name="IIDPARCEATUALIZMULTAS")
    private Long id = null;
    @ManyToOne
    @JoinColumn(name="IIDPARCEATUALIZCREDRMTE")
    private ParcelasAtualizaveisCreditosReclamante creditosReclamante;
    @ManyToOne
    @JoinColumn(name="IIDPARCEATUALIZDESCCREDRMTE")
    private ParcelasAtualizaveisDescontoCreditosReclamante descontoCreditosReclamante;
    @ManyToOne
    @JoinColumn(name="IIDPARCEATUALIZOUTROSDEBRMDO")
    private ParcelasAtualizaveisOutrosDebitosReclamado outrosDebitosReclamado;
    @ManyToOne
    @JoinColumn(name="IIDPARCEATUALIZDEBRMTE")
    private ParcelasAtualizaveisDebitosReclamante debitosReclamante;
    @OneToOne(cascade={CascadeType.PERSIST})
    @JoinColumn(name="IIDMULTA")
    private Multa multa;
    @Column(name="SNMTERCEIRO", columnDefinition="VARCHAR2(100)")
    private String credor;
    @Column(name="SDSMULTA", columnDefinition="VARCHAR2(60)")
    private String descricao;
    @Column(name="STPCREDORDEVEDOR", columnDefinition="VARCHAR2(4)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="CredorDevedorMultaEnum")})
    private CredorDevedorMultaEnum tipoCredorDevedor = CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO;
    @Column(name="STPMULTA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorEnum")})
    private TipoValorEnum tipoValor = TipoValorEnum.INFORMADO;
    @Column(name="MVLPARCELAINF", precision=19, scale=2)
    private BigDecimal valorParcelaInformado;
    @Column(name="MVLJUROSINF", precision=19, scale=2)
    private BigDecimal valorJurosInformado;
    @Column(name="STPINDICETRABALHISTAINF", columnDefinition="VARCHAR2(12)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    private IndiceMonetarioEnum indiceTrabalhistaInformado = IndiceMonetarioEnum.INDICE_TRABALHISTA;
    @Column(name="SFLAPLICARJUROSINF", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarJurosInformado = false;
    @Column(name="DDTAPARTIRDEAPLICARJUROSINF", nullable=true)
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=DataAPartirDeAplicarJurosMultaValidRule.class)
    private Date dataApartirDeAplicarJurosInformado;
    @Column(name="SFLDESCONTOCONTRIBSOCIALCALC", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarDescontoContribSocialCalculado = false;
    @Column(name="SFLDESCONTOPREVIDPRIVCALC", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarDescontoPrevPrivadaCalculado = false;
    @Column(name="RVLTAXACALC", precision=38, scale=25)
    private BigDecimal taxaCalculado;
    @Column(name="SFLCOBRANCARECLAMANTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoCobrancaReclamanteEnum")})
    private TipoCobrancaReclamanteEnum tipoCobrancaReclamante = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;

    public ParcelasAtualizaveisMultaIndenizacao() {
        super(RepositorioDeParcelasAtualizaveisMultaIndenizacao.class);
    }

    public static void removerMultas(ParcelasAtualizaveisCreditosReclamante creditosReclamante, ParcelasAtualizaveisDescontoCreditosReclamante descontoCreditosDoReclamante, ParcelasAtualizaveisOutrosDebitosReclamado outrosDebitosDoReclamado, ParcelasAtualizaveisDebitosReclamante debitosDoReclamante) {
        ParcelasAtualizaveisMultaIndenizacao.getRepositorio(RepositorioDeParcelasAtualizaveisMultaIndenizacao.class).removerMultas(creditosReclamante);
        ParcelasAtualizaveisMultaIndenizacao.getRepositorio(RepositorioDeParcelasAtualizaveisMultaIndenizacao.class).removerMultas(descontoCreditosDoReclamante);
        ParcelasAtualizaveisMultaIndenizacao.getRepositorio(RepositorioDeParcelasAtualizaveisMultaIndenizacao.class).removerMultas(outrosDebitosDoReclamado);
        ParcelasAtualizaveisMultaIndenizacao.getRepositorio(RepositorioDeParcelasAtualizaveisMultaIndenizacao.class).removerMultas(debitosDoReclamante);
    }

    public void consistirDados() {
        ParcelasAtualizaveisMultaIndenizacaoUtils.consistirDados(this);
    }

    public ParcelasAtualizaveisMultaIndenizacao clonar() {
        ParcelasAtualizaveisMultaIndenizacao clone = new ParcelasAtualizaveisMultaIndenizacao();
        clone.setAplicarJurosInformado(this.getAplicarJurosInformado());
        clone.setDataApartirDeAplicarJurosInformado(this.getDataApartirDeAplicarJurosInformado());
        clone.setCreditosReclamante(this.getCreditosReclamante());
        clone.setCredor(this.getCredor());
        clone.setDebitosReclamante(this.getDebitosReclamante());
        clone.setAplicarDescontoContribSocialCalculado(this.getAplicarDescontoContribSocialCalculado());
        clone.setDescontoCreditosReclamante(this.getDescontoCreditosReclamante());
        clone.setAplicarDescontoPrevPrivadaCalculado(this.getAplicarDescontoPrevPrivadaCalculado());
        clone.setDescricao(this.getDescricao());
        clone.setIndiceTrabalhistaInformado(this.getIndiceTrabalhistaInformado());
        clone.setOutrosDebitosReclamado(this.getOutrosDebitosReclamado());
        clone.setTaxaCalculado(this.getTaxaCalculado());
        clone.setTipoCredorDevedor(this.getTipoCredorDevedor());
        clone.setTipoValor(this.getTipoValor());
        clone.setValorJurosInformado(this.getValorJurosInformado());
        clone.setValorParcelaInformado(this.getValorParcelaInformado());
        clone.setTipoCobrancaReclamante(this.getTipoCobrancaReclamante());
        clone.setMulta(this.getMulta());
        return clone;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public String getCredor() {
        return this.credor;
    }

    public void setCredor(String credor) {
        this.credor = credor;
    }

    public String getDescricao() {
        return this.descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public BigDecimal getValorParcelaInformado() {
        return this.valorParcelaInformado;
    }

    public void setValorParcelaInformado(BigDecimal valorParcelaInformado) {
        this.valorParcelaInformado = valorParcelaInformado;
    }

    public BigDecimal getValorJurosInformado() {
        return this.valorJurosInformado;
    }

    public void setValorJurosInformado(BigDecimal valorJurosInformado) {
        this.valorJurosInformado = valorJurosInformado;
    }

    public IndiceMonetarioEnum getIndiceTrabalhistaInformado() {
        return this.indiceTrabalhistaInformado;
    }

    public void setIndiceTrabalhistaInformado(IndiceMonetarioEnum indiceTrabalhistaInformado) {
        this.indiceTrabalhistaInformado = indiceTrabalhistaInformado;
    }

    public Boolean getAplicarJurosInformado() {
        return this.aplicarJurosInformado;
    }

    public void setAplicarJurosInformado(Boolean aplicarJurosInformado) {
        this.aplicarJurosInformado = aplicarJurosInformado;
    }

    public Date getDataApartirDeAplicarJurosInformado() {
        return this.dataApartirDeAplicarJurosInformado;
    }

    public void setDataApartirDeAplicarJurosInformado(Date dataApartirDeAplicarJurosInformado) {
        this.dataApartirDeAplicarJurosInformado = dataApartirDeAplicarJurosInformado;
    }

    public BigDecimal getTaxaCalculado() {
        return this.taxaCalculado;
    }

    public void setTaxaCalculado(BigDecimal taxaCalculado) {
        this.taxaCalculado = taxaCalculado;
    }

    public TipoValorEnum getTipoValor() {
        return this.tipoValor;
    }

    public void setTipoValor(TipoValorEnum tipoValor) {
        this.tipoValor = tipoValor;
    }

    public CredorDevedorMultaEnum getTipoCredorDevedor() {
        return this.tipoCredorDevedor;
    }

    public void setTipoCredorDevedor(CredorDevedorMultaEnum tipoCredorDevedor) {
        this.tipoCredorDevedor = tipoCredorDevedor;
    }

    public Long getId() {
        return this.id;
    }

    public ParcelasAtualizaveisDescontoCreditosReclamante getDescontoCreditosReclamante() {
        return this.descontoCreditosReclamante;
    }

    public void setDescontoCreditosReclamante(ParcelasAtualizaveisDescontoCreditosReclamante descontoCreditosReclamante) {
        this.descontoCreditosReclamante = descontoCreditosReclamante;
    }

    public ParcelasAtualizaveisOutrosDebitosReclamado getOutrosDebitosReclamado() {
        return this.outrosDebitosReclamado;
    }

    public void setOutrosDebitosReclamado(ParcelasAtualizaveisOutrosDebitosReclamado outrosDebitosReclamado) {
        this.outrosDebitosReclamado = outrosDebitosReclamado;
    }

    public ParcelasAtualizaveisDebitosReclamante getDebitosReclamante() {
        return this.debitosReclamante;
    }

    public void setDebitosReclamante(ParcelasAtualizaveisDebitosReclamante debitosReclamante) {
        this.debitosReclamante = debitosReclamante;
    }

    public ParcelasAtualizaveisCreditosReclamante getCreditosReclamante() {
        return this.creditosReclamante;
    }

    public void setCreditosReclamante(ParcelasAtualizaveisCreditosReclamante creditosReclamante) {
        this.creditosReclamante = creditosReclamante;
    }

    public Multa getMulta() {
        return this.multa;
    }

    public void setMulta(Multa multa) {
        this.multa = multa;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public TipoCobrancaReclamanteEnum getTipoCobrancaReclamante() {
        return this.tipoCobrancaReclamante;
    }

    public void setTipoCobrancaReclamante(TipoCobrancaReclamanteEnum tipoCobrancaReclamante) {
        this.tipoCobrancaReclamante = tipoCobrancaReclamante;
    }

    public Boolean getAplicarDescontoContribSocialCalculado() {
        return this.aplicarDescontoContribSocialCalculado;
    }

    public void setAplicarDescontoContribSocialCalculado(Boolean aplicarDescontoContribSocialCalculado) {
        this.aplicarDescontoContribSocialCalculado = aplicarDescontoContribSocialCalculado;
    }

    public Boolean getAplicarDescontoPrevPrivadaCalculado() {
        return this.aplicarDescontoPrevPrivadaCalculado;
    }

    public void setAplicarDescontoPrevPrivadaCalculado(Boolean aplicarDescontoPrevPrivadaCalculado) {
        this.aplicarDescontoPrevPrivadaCalculado = aplicarDescontoPrevPrivadaCalculado;
    }

    public BigDecimal getValorBaseCalculo() {
        BigDecimal baseCalculo = BigDecimal.ZERO;
        if (this.tipoValor.equals((Object)TipoValorEnum.INFORMADO)) {
            baseCalculo = baseCalculo.add(this.valorParcelaInformado != null ? this.valorParcelaInformado : BigDecimal.ZERO).add(this.valorJurosInformado != null ? this.valorJurosInformado : BigDecimal.ZERO);
        }
        return baseCalculo;
    }

    public String getBaseDeCalculoDescricao() {
        StringBuilder builder = new StringBuilder();
        if (this.tipoValor.equals((Object)TipoValorEnum.CALCULADO)) {
            builder.append("(+) Principal");
            if (this.aplicarDescontoContribSocialCalculado.booleanValue()) {
                builder.append(" (-) Desc. Contrib. Social");
            }
            if (this.aplicarDescontoPrevPrivadaCalculado.booleanValue()) {
                builder.append(" (-) Desc. Prev. Privada");
            }
        }
        return builder.toString();
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = super.hashCode();
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null || !super.equals(obj)) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        ParcelasAtualizaveisMultaIndenizacao other = (ParcelasAtualizaveisMultaIndenizacao)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }
}

