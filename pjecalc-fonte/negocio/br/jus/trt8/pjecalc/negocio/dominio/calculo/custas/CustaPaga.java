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
package br.jus.trt8.pjecalc.negocio.dominio.calculo.custas;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDePaganteEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.RepositorioDeCustaPaga;
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
@Table(name="TBCUSTASPAGAS")
@SequenceGenerator(name="SQCUSTASPAGAS", sequenceName="SQCUSTASPAGAS", allocationSize=1)
@Name(value="custaPaga")
public class CustaPaga
extends EntidadeBase {
    private static final long serialVersionUID = -4201142931213627185L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCUSTASPAGAS")
    @Column(name="IIDCUSTAPAGA")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCUSTAS")
    private CustasJudiciais custasJudiciais;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="STPPAGANTE", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDePaganteEnum")})
    private TipoDePaganteEnum tipoDePagante;
    @Column(name="RVLVALORPAGO", precision=12, scale=2, nullable=false)
    private BigDecimal valor;
    @Column(name="DDTVENCIMENTO", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataVencimento;
    @Column(name="RVLINDICECORRECAO", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecao;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJuros;

    public CustaPaga() {
        super(RepositorioDeCustaPaga.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    public CustasJudiciais getCustasJudiciais() {
        return this.custasJudiciais;
    }

    public void setCustasJudiciais(CustasJudiciais custasJudiciais) {
        this.custasJudiciais = custasJudiciais;
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Date getDataVencimento() {
        return this.dataVencimento;
    }

    public void setDataVencimento(Date dataVencimento) {
        this.dataVencimento = dataVencimento;
    }

    public TipoDePaganteEnum getTipoDePagante() {
        return this.tipoDePagante;
    }

    public void setTipoDePagante(TipoDePaganteEnum tipoDePagante) {
        this.tipoDePagante = tipoDePagante;
    }

    public BigDecimal getValor() {
        return this.valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public BigDecimal getIndiceCorrecao() {
        return this.indiceCorrecao;
    }

    public void setIndiceCorrecao(BigDecimal indiceCorrecao) {
        this.indiceCorrecao = indiceCorrecao;
    }

    public BigDecimal getTaxaJuros() {
        return this.taxaJuros;
    }

    public void setTaxaJuros(BigDecimal taxaJuros) {
        this.taxaJuros = taxaJuros;
    }

    public BigDecimal getValorCorrigido() {
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.getValor(), BigDecimal.ZERO);
    }

    public BigDecimal getJuros() {
        return Utils.aplicarJuros(this.getTaxaJuros(), this.getValorCorrigido());
    }

    public BigDecimal getTotal() {
        return Utils.somar(this.getValorCorrigido(), this.getJuros(), this.getValorCorrigido());
    }

    @Override
    public CustaPaga validar() {
        NegocioException excecao = new NegocioException();
        if (Utils.nulo(this.valor)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "valor" + this.tipoDePagante.getValor(), Mensagens.MSG0003, "Valor"));
        }
        if (Utils.nulo(this.dataVencimento)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataVencimento" + this.tipoDePagante.getValor(), Mensagens.MSG0003, "Vencimento"));
        } else {
            Date ajuizamento = this.getCustasJudiciais().getCalculo().getDataAjuizamento();
            if (Utils.naoNulo(ajuizamento) && HelperDate.dateBefore(this.dataVencimento, ajuizamento)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataVencimento" + this.tipoDePagante.getValor(), Mensagens.MSG0008, "Vencimento", "Data de Ajuizamento no C\u00e1lculo"));
            }
            HelperDate hoje = HelperDate.getInstance();
            hoje.removeTime();
            if (hoje.lessThen(this.dataVencimento)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataVencimento" + this.tipoDePagante.getValor(), Mensagens.MSG0010, "Vencimento", "Data de Hoje"));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    @Override
    public void salvar() {
        this.validar();
        super.salvar();
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }
}

