/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
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
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.ParametrosDeAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.RepositorioDeCombinacaoDeIndice;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.atualizacao.regras.DataGeralParametrosAtualizacaoValidRule;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
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
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBCOMBINACAOINDICE")
@SequenceGenerator(name="SQCOMBINACAOINDICE", sequenceName="SQCOMBINACAOINDICE", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="combinacaoIndice")
public class CombinacaoDeIndice
extends EntidadeBase
implements Comparable<CombinacaoDeIndice> {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCOMBINACAOINDICE")
    @Column(name="IIDCOMBINACAOINDICE", nullable=false)
    private Long id;
    @Version
    @Column(name="IIDVERSAO", nullable=false)
    private Long versao = 0L;
    @ManyToOne
    @JoinColumn(name="IIDPARAMATUALIZACAOCALCULO", nullable=false)
    private ParametrosDeAtualizacao parametrosDeAtualizacao;
    @Column(name="STPINDICETRABALHISTA", nullable=false)
    @Required
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    private IndiceMonetarioEnum outroIndiceTrabalhista;
    @Column(name="DDTAPARTIRDE", nullable=false)
    @Required
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=DataGeralParametrosAtualizacaoValidRule.class)
    private Date apartirDeOutroIndice;

    public CombinacaoDeIndice() {
        super(RepositorioDeCombinacaoDeIndice.class);
    }

    @Override
    public EntidadeBase validar() {
        GerenciadorDeValidadores.getInstance().validar(CombinacaoDeIndice.class, this);
        return super.validar();
    }

    @Override
    public Long obterChavePrimaria() {
        return this.id;
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Long getId() {
        return this.id;
    }

    public ParametrosDeAtualizacao getParametrosDeAtualizacao() {
        return this.parametrosDeAtualizacao;
    }

    public void setParametrosDeAtualizacao(ParametrosDeAtualizacao parametrosDeAtualizacao) {
        this.parametrosDeAtualizacao = parametrosDeAtualizacao;
    }

    public IndiceMonetarioEnum getOutroIndiceTrabalhista() {
        return this.outroIndiceTrabalhista;
    }

    public void setOutroIndiceTrabalhista(IndiceMonetarioEnum outroIndiceTrabalhista) {
        this.outroIndiceTrabalhista = outroIndiceTrabalhista;
    }

    public Date getApartirDeOutroIndice() {
        return this.apartirDeOutroIndice;
    }

    public void setApartirDeOutroIndice(Date apartirDeOutroIndice) {
        this.apartirDeOutroIndice = apartirDeOutroIndice;
    }

    @Override
    public int compareTo(CombinacaoDeIndice o) {
        Date este = HelperDate.getInstance(this.apartirDeOutroIndice).removeTime().getDate();
        Date outro = HelperDate.getInstance(o.apartirDeOutroIndice).removeTime().getDate();
        return este.compareTo(outro);
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = super.hashCode();
        result = 31 * result + (this.apartirDeOutroIndice == null ? 0 : this.apartirDeOutroIndice.hashCode());
        result = 31 * result + (this.outroIndiceTrabalhista == null ? 0 : this.outroIndiceTrabalhista.hashCode());
        result = 31 * result + (this.parametrosDeAtualizacao == null ? 0 : this.parametrosDeAtualizacao.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null || !super.equals(obj) || this.getClass() != obj.getClass()) {
            return false;
        }
        CombinacaoDeIndice other = (CombinacaoDeIndice)obj;
        boolean comparadosIguais = true;
        if (this.apartirDeOutroIndice == null) {
            if (other.apartirDeOutroIndice != null) {
                comparadosIguais = false;
            }
        } else if (!this.apartirDeOutroIndice.equals(other.apartirDeOutroIndice)) {
            comparadosIguais = false;
        }
        if (this.outroIndiceTrabalhista != other.outroIndiceTrabalhista) {
            comparadosIguais = false;
        }
        if (this.parametrosDeAtualizacao == null) {
            if (other.parametrosDeAtualizacao != null) {
                comparadosIguais = false;
            }
        } else if (!this.parametrosDeAtualizacao.equals(other.parametrosDeAtualizacao)) {
            comparadosIguais = false;
        }
        return comparadosIguais;
    }

    public static void remover(CombinacaoDeIndice indice) {
        if (indice != null && indice.getId() != null) {
            CombinacaoDeIndice.getRepositorio(RepositorioDeCombinacaoDeIndice.class).removerPorId(indice.getId());
        }
    }
}

