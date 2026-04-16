/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Version
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.validators.Min;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCorrecaoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeOperacaoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.RepositorioDeOperacaoDeFgts;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBOPERACAOFGTS")
@SequenceGenerator(name="SQOPERACAOFGTS", sequenceName="SQOPERACAOFGTS", allocationSize=1)
@Name(value="operacaoDeFgts")
public class OperacaoDeFgts
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = 1132053122346490450L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOPERACAOFGTS")
    @Column(name="IIDOPERACAOFGTS")
    private final Long id = 0L;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDFGTSCALCULO")
    private Fgts fgts;
    @Column(name="DDTCOMPETENCIAOPERACAO")
    @Temporal(value=TemporalType.DATE)
    @Required
    private Date competencia;
    @Column(name="STPOPERACAO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeOperacaoDoFgtsEnum")})
    @Required
    private TipoDeOperacaoDoFgtsEnum tipoDeOperacaoDoFgts;
    @Column(name="RVLOPERACAO", precision=19, scale=2)
    @Min(value="0.01")
    @Required
    private BigDecimal valor;
    @Column(name="RVLINDICEUTILIZADO", precision=38, scale=25)
    private BigDecimal indiceAcumulado;
    @Column(name="RVLINDICEUTILIZADOMULTA", precision=38, scale=25)
    private BigDecimal indiceAcumuladoDaMulta;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25)
    private BigDecimal taxaDeJuros;

    public OperacaoDeFgts() {
        super(RepositorioDeOperacaoDeFgts.class);
    }

    public OperacaoDeFgts(Date competencia, BigDecimal valor) {
        this();
        this.competencia = competencia;
        this.valor = valor;
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

    @Override
    public EntidadeBase validar() {
        GerenciadorDeValidadores.getInstance().validar(OperacaoDeFgts.class, this);
        return super.validar();
    }

    public Long getId() {
        return this.id;
    }

    public Date getCompetencia() {
        return this.competencia;
    }

    public void setCompetencia(Date competencia) {
        this.competencia = competencia;
    }

    public TipoDeOperacaoDoFgtsEnum getTipoDeOperacaoDoFgts() {
        return this.tipoDeOperacaoDoFgts;
    }

    public void setTipoDeOperacaoDoFgts(TipoDeOperacaoDoFgtsEnum tipoDeOperacaoDoFgts) {
        this.tipoDeOperacaoDoFgts = tipoDeOperacaoDoFgts;
    }

    public BigDecimal getValor() {
        return this.valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public Fgts getFgts() {
        return this.fgts;
    }

    public void setFgts(Fgts fgts) {
        this.fgts = fgts;
    }

    public BigDecimal getIndiceAcumulado() {
        return this.indiceAcumulado;
    }

    public void setIndiceAcumulado(BigDecimal indiceAcumulado) {
        this.indiceAcumulado = indiceAcumulado;
    }

    public BigDecimal getValorCorrigido(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        if (!Utils.naoNulos(this.valor, this.indiceAcumulado)) {
            return BigDecimal.ZERO;
        }
        if (TipoDeCorrecaoDoFgtsEnum.PELA_DATA_DE_LIQUIDACAO.equals((Object)tipoDeCorrecao)) {
            return Utils.aplicarCorrecaoMonetaria(this.indiceAcumulado, this.valor);
        }
        return Utils.aplicarCorrecaoMonetaria(this.indiceAcumuladoDaMulta, this.valor);
    }

    public BigDecimal getJuros(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        if (this.getFgts().isSomenteJurosJAM()) {
            return null;
        }
        if (!this.getFgts().getDeduzirDoFGTS().booleanValue() || Utils.nulo(this.taxaDeJuros)) {
            return BigDecimal.ZERO;
        }
        return this.getValorCorrigido(tipoDeCorrecao).multiply(Utils.obterPercentualPara(this.taxaDeJuros), Utils.CONTEXTO_MATEMATICO);
    }

    public BigDecimal getTotal(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        BigDecimal valorCorrigido = this.getValorCorrigido(tipoDeCorrecao);
        return Utils.somar(valorCorrigido, this.getJuros(tipoDeCorrecao), valorCorrigido);
    }

    public BigDecimal getIndiceAcumuladoDaMulta() {
        return this.indiceAcumuladoDaMulta;
    }

    public void setIndiceAcumuladoDaMulta(BigDecimal indiceAcumuladoDaMulta) {
        this.indiceAcumuladoDaMulta = indiceAcumuladoDaMulta;
    }

    public BigDecimal getTaxaDeJuros() {
        return this.taxaDeJuros;
    }

    public void setTaxaDeJuros(BigDecimal taxaDeJuros) {
        this.taxaDeJuros = taxaDeJuros;
    }

    @Override
    public int hashCode() {
        return this.getHashCodeBuilder().append((Object)this.competencia).hashCode();
    }

    @Override
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
        return this.getEqualsBuilder(obj).append((Object)this.competencia, (Object)((OperacaoDeFgts)obj).competencia).isEquals();
    }
}

