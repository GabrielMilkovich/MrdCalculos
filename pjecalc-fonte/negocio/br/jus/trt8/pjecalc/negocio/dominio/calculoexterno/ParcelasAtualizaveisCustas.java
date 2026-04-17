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
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCustasUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDebitosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.RepositorioDeParcelasAtualizaveisCustas;
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
@Table(name="TBPARCEATUALIZCUSTAS")
@SequenceGenerator(name="SQPARCEATUALIZCUSTAS", sequenceName="SQPARCEATUALIZCUSTAS", allocationSize=1)
@Name(value="parcelasAtualizaveisCustas")
public class ParcelasAtualizaveisCustas
extends EntidadeBase {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPARCEATUALIZCUSTAS")
    @Column(name="IIDPARCEATUALIZCUSTAS")
    private Long id = null;
    @Column(name="STPCUSTAS", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorEnum")})
    private TipoValorEnum tipoValor = TipoValorEnum.INFORMADO;
    @Column(name="MVLPARCELAINF", precision=19, scale=2)
    private BigDecimal valorParcelaInformado;
    @Column(name="MVLJUROSINF", precision=19, scale=2)
    private BigDecimal valorJurosInformado;
    @Column(name="RVLTAXACALC", precision=38, scale=25)
    private final BigDecimal taxaCalculado;

    public ParcelasAtualizaveisCustas() {
        super(RepositorioDeParcelasAtualizaveisCustas.class);
        this.taxaCalculado = BigDecimal.ZERO;
    }

    public ParcelasAtualizaveisCustas(BigDecimal taxaCalculado) {
        super(RepositorioDeParcelasAtualizaveisCustas.class);
        this.taxaCalculado = taxaCalculado;
    }

    public static void removerCustas(ParcelasAtualizaveisDescontoCreditosReclamante descontoCreditosDoReclamante, ParcelasAtualizaveisOutrosDebitosReclamado outrosDebitosDoReclamado, ParcelasAtualizaveisDebitosReclamante debitosDoReclamante) {
        ParcelasAtualizaveisCustas.getRepositorio(RepositorioDeParcelasAtualizaveisCustas.class).removerCustas(ParcelasAtualizaveisCustasUtils.encontrarCustasParaRemover(descontoCreditosDoReclamante, outrosDebitosDoReclamado, debitosDoReclamante));
    }

    public void consistirDados() {
        ParcelasAtualizaveisCustasUtils.consistirDados(this);
    }

    public TipoValorEnum getTipoValor() {
        return this.tipoValor;
    }

    public void setTipoValor(TipoValorEnum tipoValor) {
        this.tipoValor = tipoValor;
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

    public BigDecimal getTaxaCalculado() {
        return this.taxaCalculado;
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
        return result;
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
        ParcelasAtualizaveisCustas other = (ParcelasAtualizaveisCustas)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }
}

