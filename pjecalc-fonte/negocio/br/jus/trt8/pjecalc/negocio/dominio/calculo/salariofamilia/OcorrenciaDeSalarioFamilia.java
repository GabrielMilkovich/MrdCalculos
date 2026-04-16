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
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.RepositorioDeOcorrenciaDeSalarioFamilia;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.salariofamilia.SalarioFamilia;
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
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBOCORRENCIASALARIOFAMILIA")
@SequenceGenerator(name="SQOCORRENCIASALARIOFAMILIA", sequenceName="SQOCORRENCIASALARIOFAMILIA", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="ocorrenciaDeSalarioFamilia")
public class OcorrenciaDeSalarioFamilia
extends EntidadeBase {
    private static final long serialVersionUID = 3532111768158525998L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIASALARIOFAMILIA")
    @Column(name="IIDOCORRENCIASALARIOFAMILIA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDSALARIOFAMILIA")
    private SalarioFamilia salarioFamilia;
    @Column(name="DDTINICIOOCORRENCIA", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date dataInicioOcorrencia;
    @Column(name="DDTFIMOCORRENCIA", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date dataFimOcorrencia;
    @Column(name="IQTFILHOS")
    private Integer quantidadeFilhos;
    @Column(name="RVLREMUNERACAOMENSAL", precision=38, scale=25)
    private BigDecimal valorRemuneracaoMensal;
    @Column(name="RVLSALARIOFAMILIA", precision=19, scale=2)
    private BigDecimal valorSalarioFamilia;
    @Column(name="RVLINDICEUTILIZADO", precision=38, scale=38)
    private BigDecimal indiceAcumulado;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25)
    private BigDecimal taxaDeJuros;

    public OcorrenciaDeSalarioFamilia() {
        super(RepositorioDeOcorrenciaDeSalarioFamilia.class);
    }

    public OcorrenciaDeSalarioFamilia(SalarioFamilia salarioFamilia) {
        this();
        this.salarioFamilia = salarioFamilia;
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

    public SalarioFamilia getSalarioFamilia() {
        return this.salarioFamilia;
    }

    public void setSalarioFamilia(SalarioFamilia salarioFamilia) {
        this.salarioFamilia = salarioFamilia;
    }

    public Date getDataInicioOcorrencia() {
        return this.dataInicioOcorrencia;
    }

    public void setDataInicioOcorrencia(Date dataInicioOcorrencia) {
        this.dataInicioOcorrencia = dataInicioOcorrencia;
    }

    public Date getDataFimOcorrencia() {
        return this.dataFimOcorrencia;
    }

    public void setDataFimOcorrencia(Date dataFimOcorrencia) {
        this.dataFimOcorrencia = dataFimOcorrencia;
    }

    public Integer getQuantidadeFilhos() {
        return this.quantidadeFilhos;
    }

    public void setQuantidadeFilhos(Integer quantidadeFilhos) {
        this.quantidadeFilhos = quantidadeFilhos;
    }

    public BigDecimal getValorRemuneracaoMensal() {
        return this.valorRemuneracaoMensal;
    }

    public void setValorRemuneracaoMensal(BigDecimal valorRemuneracaoMensal) {
        this.valorRemuneracaoMensal = valorRemuneracaoMensal;
    }

    public BigDecimal getValorSalarioFamilia() {
        return this.valorSalarioFamilia;
    }

    public void setValorSalarioFamilia(BigDecimal valorSalarioFamilia) {
        this.valorSalarioFamilia = valorSalarioFamilia;
    }

    public BigDecimal getIndiceAcumulado() {
        return this.indiceAcumulado;
    }

    public void setIndiceAcumulado(BigDecimal indiceAcumulado) {
        this.indiceAcumulado = indiceAcumulado;
    }

    public BigDecimal getValorDevido() {
        BigDecimal valorSalarioFamilia = this.getValorSalarioFamilia();
        if (Utils.naoNulos(this.quantidadeFilhos, valorSalarioFamilia)) {
            return Utils.arredondarValorMonetario(valorSalarioFamilia.multiply(new BigDecimal(this.quantidadeFilhos), Utils.CONTEXTO_MATEMATICO));
        }
        return null;
    }

    public BigDecimal getValorDevidoCorrigido() {
        BigDecimal valorDevido = this.getValorDevido();
        if (Utils.naoNulos(this.indiceAcumulado, valorDevido)) {
            return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.indiceAcumulado, valorDevido));
        }
        return valorDevido;
    }

    public BigDecimal getTaxaDeJuros() {
        return this.taxaDeJuros;
    }

    public void setTaxaDeJuros(BigDecimal taxaDeJuros) {
        this.taxaDeJuros = taxaDeJuros;
    }

    public BigDecimal getJuros() {
        if (Utils.nulo(this.taxaDeJuros) || Utils.nulo(this.getValorDevidoCorrigido())) {
            return null;
        }
        return Utils.arredondarValorMonetario(this.getValorDevidoCorrigido().multiply(Utils.obterPercentualPara(this.taxaDeJuros), Utils.CONTEXTO_MATEMATICO));
    }

    public BigDecimal getTotal() {
        BigDecimal valorDevidoCorrigido = this.getValorDevidoCorrigido();
        if (Utils.naoNulo(valorDevidoCorrigido)) {
            return Utils.somar(valorDevidoCorrigido, this.getJuros(), valorDevidoCorrigido);
        }
        return valorDevidoCorrigido;
    }

    public Long getId() {
        return this.id;
    }
}

