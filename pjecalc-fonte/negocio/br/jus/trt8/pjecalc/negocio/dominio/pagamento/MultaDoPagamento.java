/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.EnumType
 *  javax.persistence.Enumerated
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.negocio.comum.EntidadeAgregada;
import br.jus.trt8.pjecalc.negocio.constantes.TipoVinculoDeMultaDoPagamentoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.multa.Multa;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.Pagamento;
import java.math.BigDecimal;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBVINCULOPAGAMENTOMULTA")
@SequenceGenerator(name="SQVINCULOPAGAMENTOMULTA", sequenceName="SQVINCULOPAGAMENTOMULTA", allocationSize=1)
@Name(value="multaDoPagamento")
public class MultaDoPagamento
extends EntidadeAgregada {
    private static final long serialVersionUID = 4466529296239033805L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQVINCULOPAGAMENTOMULTA")
    @Column(name="IIDVINCULOPAGAMENTOMULTA")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDMULTA")
    private Multa multa;
    @OneToOne
    @JoinColumn(name="IIDPAGAMENTO")
    private Pagamento pagamento;
    @Column(name="STPVINCULO", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoVinculoDeMultaDoPagamentoEnum")})
    private TipoVinculoDeMultaDoPagamentoEnum tipoVinculo = TipoVinculoDeMultaDoPagamentoEnum.DEBITOSRECLAMANTE;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARMULTA", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarMulta = true;
    @Column(name="MVLMULTA", precision=12, scale=2)
    private BigDecimal valorMulta;

    public MultaDoPagamento() {
    }

    public MultaDoPagamento(Multa multa, Pagamento pagamento, BigDecimal valorMulta, Boolean apurarMulta, TipoVinculoDeMultaDoPagamentoEnum tipoVinculo) {
        this();
        this.multa = multa;
        this.pagamento = pagamento;
        this.valorMulta = valorMulta;
        this.apurarMulta = apurarMulta;
        this.tipoVinculo = tipoVinculo;
    }

    public MultaDoPagamento(MultaDoPagamento pagamentoParaClonar) {
        this(pagamentoParaClonar.getMulta(), pagamentoParaClonar.getPagamento(), pagamentoParaClonar.getValorMulta(), pagamentoParaClonar.getApurarMulta(), pagamentoParaClonar.getTipoVinculo());
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Multa getMulta() {
        return this.multa;
    }

    public void setMulta(Multa multa) {
        this.multa = multa;
    }

    public Pagamento getPagamento() {
        return this.pagamento;
    }

    public void setPagamento(Pagamento pagamento) {
        this.pagamento = pagamento;
    }

    public TipoVinculoDeMultaDoPagamentoEnum getTipoVinculo() {
        return this.tipoVinculo;
    }

    public void setTipoVinculo(TipoVinculoDeMultaDoPagamentoEnum tipoVinculo) {
        this.tipoVinculo = tipoVinculo;
    }

    public BigDecimal getValorMulta() {
        return this.valorMulta;
    }

    public void setValorMulta(BigDecimal valorMulta) {
        this.valorMulta = valorMulta;
    }

    public Boolean getApurarMulta() {
        return this.apurarMulta;
    }

    public void setApurarMulta(Boolean apurarMulta) {
        this.apurarMulta = apurarMulta;
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
        MultaDoPagamento other = (MultaDoPagamento)obj;
        if (this.pagamento == null ? other.pagamento != null : !this.pagamento.equals(other.pagamento)) {
            return false;
        }
        if (this.id == null ? other.id != null : !this.id.equals(other.id)) {
            return false;
        }
        if (this.tipoVinculo != other.tipoVinculo) {
            return false;
        }
        return !(this.multa == null ? other.multa != null : !this.multa.equals(other.multa));
    }
}

