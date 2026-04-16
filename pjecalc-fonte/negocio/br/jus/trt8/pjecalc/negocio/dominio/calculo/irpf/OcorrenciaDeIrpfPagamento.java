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
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.Irpf;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.irpf.RepositorioDeOcorrenciaDeIrpfPagamento;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
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
import org.hibernate.annotations.Type;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBOCORRENCIAIRPFPAGAMENTO")
@SequenceGenerator(name="SQOCORRENCIAIRPFPAGAMENTO", sequenceName="SQOCORRENCIAIRPFPAGAMENTO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="ocorrenciaDeIrpfPagamento")
public class OcorrenciaDeIrpfPagamento
extends EntidadeBase {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIAIRPFPAGAMENTO")
    @Column(name="IIDOCORRENCIAIRPFPAGAMENTO")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDIMPOSTORENDACALCULO")
    private Irpf irpf;
    @Column(name="DDTEVENTO", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date dataEvento;
    @Column(name="DDTPAGAMENTO", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date dataPagamento;
    @Column(name="RVLDEVIDO", precision=19, scale=2, nullable=false)
    private BigDecimal devido;
    @Column(name="RVLTAXAJUROS", precision=10, scale=4, nullable=false)
    private BigDecimal taxaJuros;
    @Column(name="RVLJUROS", precision=19, scale=2, nullable=false)
    private BigDecimal juros;
    @Column(name="RVLTAXAMULTA", precision=10, scale=4, nullable=false)
    private BigDecimal taxaMulta;
    @Column(name="RVLMULTA", precision=19, scale=2, nullable=false)
    private BigDecimal multa;
    @Column(name="RVLTOTAL", precision=19, scale=2, nullable=false)
    private BigDecimal total;
    @Column(name="RVLPAGO", precision=19, scale=2, nullable=false)
    private BigDecimal pago;
    @Column(name="RVLDEVIDODIFERENCA", precision=19, scale=2, nullable=false)
    private BigDecimal devidoDiferenca;
    @Column(name="RVLTAXAJUROSDIFERENCA", precision=10, scale=4, nullable=false)
    private BigDecimal taxaJurosDiferenca;
    @Column(name="RVLJUROSDIFERENCA", precision=19, scale=2, nullable=false)
    private BigDecimal jurosDiferenca;
    @Column(name="RVLTAXAMULTADIFERENCA", precision=10, scale=4, nullable=false)
    private BigDecimal taxaMultaDiferenca;
    @Column(name="RVLMULTADIFERENCA", precision=19, scale=2, nullable=false)
    private BigDecimal multaDiferenca;
    @Column(name="RVLTOTALDIFERENCA", precision=19, scale=2, nullable=false)
    private BigDecimal totalDiferenca;
    @Column(name="SFLPAGAMENTONOSALDO", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean pagamentoNoSaldo = Boolean.FALSE;
    @Column(name="SFLCALCULADONOSALDO", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean calculadoNoSaldo = Boolean.FALSE;

    public OcorrenciaDeIrpfPagamento() {
        super(RepositorioDeOcorrenciaDeIrpfPagamento.class);
    }

    public OcorrenciaDeIrpfPagamento(Irpf irpf, BigDecimal devido, BigDecimal taxaJuros, BigDecimal taxaMulta, Date dataEvento, Date dataPagamento) {
        super(RepositorioDeOcorrenciaDeIrpfPagamento.class);
        this.irpf = irpf;
        this.dataEvento = dataEvento;
        this.dataPagamento = dataPagamento;
        this.devido = devido;
        this.taxaJuros = taxaJuros;
        this.juros = Utils.multiplicar(taxaJuros.divide(Utils.CEM), devido, BigDecimal.ZERO);
        this.taxaMulta = taxaMulta;
        this.multa = Utils.multiplicar(taxaMulta.divide(Utils.CEM), devido, BigDecimal.ZERO);
        this.total = Utils.somar(this.devido, Utils.somar(this.juros, this.multa));
    }

    public void aplicarPagamento(BigDecimal pago) {
        BigDecimal bigDecimal = this.pago = pago.compareTo(this.total) > 0 ? this.total : pago;
        if (this.pago.compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal proporcaoPago = Utils.dividir(this.pago, this.total);
            this.devidoDiferenca = Utils.multiplicar(this.devido, proporcaoPago);
            this.devidoDiferenca = Utils.subtrair(this.devido, this.devidoDiferenca);
            this.taxaJurosDiferenca = this.taxaJuros;
            this.jurosDiferenca = Utils.multiplicar(this.juros, proporcaoPago);
            this.jurosDiferenca = Utils.subtrair(this.juros, this.jurosDiferenca);
            this.taxaMultaDiferenca = this.taxaMulta;
            this.multaDiferenca = Utils.multiplicar(this.multa, proporcaoPago);
            this.multaDiferenca = Utils.subtrair(this.multa, this.multaDiferenca);
        } else {
            this.devidoDiferenca = this.devido;
            this.taxaJurosDiferenca = this.taxaJuros;
            this.jurosDiferenca = this.juros;
            this.taxaMultaDiferenca = this.taxaMulta;
            this.multaDiferenca = this.multa;
        }
        this.totalDiferenca = Utils.somar(this.devidoDiferenca, Utils.somar(this.jurosDiferenca, this.multaDiferenca));
    }

    public static OcorrenciaDeIrpfPagamento obterOcorrenciaDoSaldoParaDataDoEvento(Date dataEvento, Irpf irpf) {
        return OcorrenciaDeIrpfPagamento.getRepositorio(RepositorioDeOcorrenciaDeIrpfPagamento.class).obterOcorrenciaDoSaldoParaDataDoEvento(dataEvento, irpf);
    }

    public static OcorrenciaDeIrpfPagamento obterParaDataDoEventoComSaldoAPagar(Date dataEvento, Irpf irpf) {
        return OcorrenciaDeIrpfPagamento.getRepositorio(RepositorioDeOcorrenciaDeIrpfPagamento.class).obterParaDataDoEventoComSaldoAPagar(dataEvento, irpf);
    }

    public static List<OcorrenciaDeIrpfPagamento> obterParaDataDoEvento(Irpf irpf) {
        return OcorrenciaDeIrpfPagamento.getRepositorio(RepositorioDeOcorrenciaDeIrpfPagamento.class).obterParaDataDoEvento(irpf);
    }

    public static List<OcorrenciaDeIrpfPagamento> obterParaDataDoEventoPagamentoNosaldo(Irpf irpf, Date dataEvento) {
        return OcorrenciaDeIrpfPagamento.getRepositorio(RepositorioDeOcorrenciaDeIrpfPagamento.class).obterParaDataDoEventoPagamentoNoDiaDoSaldo(dataEvento, irpf);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    public Date getDataEvento() {
        return this.dataEvento;
    }

    public void setDataEvento(Date dataEvento) {
        this.dataEvento = dataEvento;
    }

    public BigDecimal getDevido() {
        return this.devido;
    }

    public void setDevido(BigDecimal devido) {
        this.devido = devido;
    }

    public BigDecimal getTaxaJuros() {
        return this.taxaJuros;
    }

    public void setTaxaJuros(BigDecimal taxaJuros) {
        this.taxaJuros = taxaJuros;
    }

    public BigDecimal getJuros() {
        return this.juros;
    }

    public void setJuros(BigDecimal juros) {
        this.juros = juros;
    }

    public BigDecimal getTaxaMulta() {
        return this.taxaMulta;
    }

    public void setTaxaMulta(BigDecimal taxaMulta) {
        this.taxaMulta = taxaMulta;
    }

    public BigDecimal getMulta() {
        return this.multa;
    }

    public void setMulta(BigDecimal multa) {
        this.multa = multa;
    }

    public BigDecimal getTotal() {
        return this.total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public BigDecimal getPago() {
        return this.pago;
    }

    public void setPago(BigDecimal pago) {
        this.pago = pago;
    }

    public BigDecimal getDevidoDiferenca() {
        return this.devidoDiferenca;
    }

    public void setDevidoDiferenca(BigDecimal devidoDiferenca) {
        this.devidoDiferenca = devidoDiferenca;
    }

    public BigDecimal getTaxaJurosDiferenca() {
        return this.taxaJurosDiferenca;
    }

    public void setTaxaJurosDiferenca(BigDecimal taxaJurosDiferenca) {
        this.taxaJurosDiferenca = taxaJurosDiferenca;
    }

    public BigDecimal getJurosDiferenca() {
        return this.jurosDiferenca;
    }

    public void setJurosDiferenca(BigDecimal jurosDiferenca) {
        this.jurosDiferenca = jurosDiferenca;
    }

    public BigDecimal getTaxaMultaDiferenca() {
        return this.taxaMultaDiferenca;
    }

    public void setTaxaMultaDiferenca(BigDecimal taxaMultaDiferenca) {
        this.taxaMultaDiferenca = taxaMultaDiferenca;
    }

    public BigDecimal getMultaDiferenca() {
        return this.multaDiferenca;
    }

    public void setMultaDiferenca(BigDecimal multaDiferenca) {
        this.multaDiferenca = multaDiferenca;
    }

    public BigDecimal getTotalDiferenca() {
        return this.totalDiferenca;
    }

    public void setTotalDiferenca(BigDecimal totalDiferenca) {
        this.totalDiferenca = totalDiferenca;
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
        if (!super.equals(obj)) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        OcorrenciaDeIrpfPagamento other = (OcorrenciaDeIrpfPagamento)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }

    public Date getDataPagamento() {
        return this.dataPagamento;
    }

    public void setDataPagamento(Date dataPagamento) {
        this.dataPagamento = dataPagamento;
    }

    public Irpf getIrpf() {
        return this.irpf;
    }

    public void setIrpf(Irpf irpf) {
        this.irpf = irpf;
    }

    public Boolean getPagamentoNoSaldo() {
        return this.pagamentoNoSaldo;
    }

    public void setPagamentoNoSaldo(Boolean pagamentoNoSaldo) {
        this.pagamentoNoSaldo = pagamentoNoSaldo;
    }

    public Boolean getCalculadoNoSaldo() {
        return this.calculadoNoSaldo;
    }

    public void setCalculadoNoSaldo(Boolean calculadoNoSaldo) {
        this.calculadoNoSaldo = calculadoNoSaldo;
    }
}

