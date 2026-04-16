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
import br.jus.trt8.pjecalc.negocio.constantes.TipoVinculoDeHonorarioDoPagamentoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
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
@Table(name="TBVINCULOPAGAMENTOHONORARIO")
@SequenceGenerator(name="SQVINCULOPAGAMENTOHONORARIO", sequenceName="SQVINCULOPAGAMENTOHONORARIO", allocationSize=1)
@Name(value="honorarioDoPagamento")
public class HonorarioDoPagamento
extends EntidadeAgregada {
    private static final long serialVersionUID = 4466529296239033805L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQVINCULOPAGAMENTOHONORARIO")
    @Column(name="IIDVINCULOPAGAMENTOHONORARIO")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDHONORARIO")
    private Honorario honorario;
    @OneToOne
    @JoinColumn(name="IIDPAGAMENTO")
    private Pagamento pagamento;
    @Column(name="STPVINCULO", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoVinculoDeHonorarioDoPagamentoEnum")})
    private TipoVinculoDeHonorarioDoPagamentoEnum tipoVinculo = TipoVinculoDeHonorarioDoPagamentoEnum.DEBITOSRECLAMANTE;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLAPURARHONORARIO", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean apurarHonorario = true;
    @Column(name="MVLHONORARIO", precision=12, scale=2)
    private BigDecimal valorHonorario;

    public HonorarioDoPagamento() {
    }

    public HonorarioDoPagamento(Honorario honorario, Pagamento pagamento, BigDecimal valorHonorario, Boolean apurarHonorario, TipoVinculoDeHonorarioDoPagamentoEnum tipoVinculo) {
        this();
        this.honorario = honorario;
        this.pagamento = pagamento;
        this.valorHonorario = valorHonorario;
        this.apurarHonorario = apurarHonorario;
        this.tipoVinculo = tipoVinculo;
    }

    public HonorarioDoPagamento(HonorarioDoPagamento pagamentoParaClonar) {
        this(pagamentoParaClonar.getHonorario(), pagamentoParaClonar.getPagamento(), pagamentoParaClonar.getValorHonorario(), pagamentoParaClonar.getApurarHonorario(), pagamentoParaClonar.getTipoVinculo());
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Honorario getHonorario() {
        return this.honorario;
    }

    public void setHonorario(Honorario honorario) {
        this.honorario = honorario;
    }

    public Pagamento getPagamento() {
        return this.pagamento;
    }

    public void setPagamento(Pagamento pagamento) {
        this.pagamento = pagamento;
    }

    public TipoVinculoDeHonorarioDoPagamentoEnum getTipoVinculo() {
        return this.tipoVinculo;
    }

    public void setTipoVinculo(TipoVinculoDeHonorarioDoPagamentoEnum tipoVinculo) {
        this.tipoVinculo = tipoVinculo;
    }

    public BigDecimal getValorHonorario() {
        return this.valorHonorario;
    }

    public void setValorHonorario(BigDecimal valorHonorario) {
        this.valorHonorario = valorHonorario;
    }

    public Boolean getApurarHonorario() {
        return this.apurarHonorario;
    }

    public void setApurarHonorario(Boolean apurarHonorario) {
        this.apurarHonorario = apurarHonorario;
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
        HonorarioDoPagamento other = (HonorarioDoPagamento)obj;
        if (this.pagamento == null ? other.pagamento != null : !this.pagamento.equals(other.pagamento)) {
            return false;
        }
        if (this.id == null ? other.id != null : !this.id.equals(other.id)) {
            return false;
        }
        if (this.tipoVinculo != other.tipoVinculo) {
            return false;
        }
        return !(this.honorario == null ? other.honorario != null : !this.honorario.equals(other.honorario));
    }
}

