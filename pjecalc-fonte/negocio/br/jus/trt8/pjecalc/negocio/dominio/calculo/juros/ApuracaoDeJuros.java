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
package br.jus.trt8.pjecalc.negocio.dominio.calculo.juros;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.juros.RepositorioDeApuracaoDeJuros;
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
@Table(name="TBAPURACAOJUROSCALCULO")
@SequenceGenerator(name="SQAPURACAOJUROSCALCULO", sequenceName="SQAPURACAOJUROSCALCULO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="apuracaoDeJuros")
public class ApuracaoDeJuros
extends EntidadeBase {
    private static final long serialVersionUID = 6872629805146414382L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQAPURACAOJUROSCALCULO")
    @Column(name="IIDOCORRENCIAAPURACAO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="DDTOCORRENCIA", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date competencia;
    @Column(name="DDTINICIAL", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date dataInicial;
    @Column(name="RVLCORRIGIDOVERBA", precision=19, scale=2)
    private BigDecimal valorCorrigido = BigDecimal.ZERO;
    @Column(name="RVLVERBACONTRSOCIAL", precision=19, scale=2)
    private BigDecimal valorVerbaParaContribuicaoSocial = BigDecimal.ZERO;
    @Column(name="RVLVERBACONTRSOCIAL13", precision=19, scale=2)
    private BigDecimal valorVerbaParaContribuicaoSocialDecimoTerceiro = BigDecimal.ZERO;
    @Column(name="RVLVERBAPREVPRIVADA", precision=19, scale=2)
    private BigDecimal valorVerbaParaPrevidenciaPrivada = BigDecimal.ZERO;
    @Column(name="RVLCORRIGIDOVERBAIRPFDECIMO", precision=19, scale=2)
    private BigDecimal valorCorrigidoParaIrpfDecimoTerceiro = BigDecimal.ZERO;
    @Column(name="RVLCORRIGIDOVERBAIRPFFERIAS", precision=19, scale=2)
    private BigDecimal valorCorrigidoParaIrpfFerias = BigDecimal.ZERO;
    @Column(name="RVLCORRIGIDOVERBAIRPFDEMAIS", precision=19, scale=2)
    private BigDecimal valorCorrigidoParaIrpfDemaisVerbas = BigDecimal.ZERO;
    @Column(name="RVLCORRIGIDOCONTRIBUICAOSOCIAL", precision=19, scale=2)
    private BigDecimal contribuicaoSocialNormal = BigDecimal.ZERO;
    @Column(name="RVLCORRIGIDOCONTRSOCIAL13", precision=19, scale=2)
    private BigDecimal contribuicaoSocialDecimoTerceiro = BigDecimal.ZERO;
    @Column(name="RVLCORRIGIDOPREVIDENCIAPRIVADA", precision=19, scale=2)
    private BigDecimal previdenciaPrivada = BigDecimal.ZERO;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25)
    private BigDecimal taxaDeJuros;

    public ApuracaoDeJuros() {
        super(RepositorioDeApuracaoDeJuros.class);
    }

    public ApuracaoDeJuros(Calculo calculo) {
        this();
        this.calculo = calculo;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    public Date getCompetencia() {
        return this.competencia;
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public void setCompetencia(Date competencia) {
        this.competencia = competencia;
    }

    public Date getDataInicial() {
        return this.dataInicial;
    }

    public void setDataInicial(Date dataInicial) {
        this.dataInicial = dataInicial;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public BigDecimal getValorCorrigido() {
        return this.valorCorrigido;
    }

    public void setValorCorrigido(BigDecimal valorCorrigido) {
        this.valorCorrigido = valorCorrigido;
    }

    public BigDecimal getValorVerbaParaContribuicaoSocial() {
        return this.valorVerbaParaContribuicaoSocial;
    }

    public void setValorVerbaParaContribuicaoSocial(BigDecimal valorVerbaParaContribuicaoSocial) {
        this.valorVerbaParaContribuicaoSocial = valorVerbaParaContribuicaoSocial;
    }

    public BigDecimal getValorVerbaParaContribuicaoSocialDecimoTerceiro() {
        return this.valorVerbaParaContribuicaoSocialDecimoTerceiro;
    }

    public void setValorVerbaParaContribuicaoSocialDecimoTerceiro(BigDecimal valorVerbaParaContribuicaoSocialDecimoTerceiro) {
        this.valorVerbaParaContribuicaoSocialDecimoTerceiro = valorVerbaParaContribuicaoSocialDecimoTerceiro;
    }

    public BigDecimal getValorVerbaParaPrevidenciaPrivada() {
        return this.valorVerbaParaPrevidenciaPrivada;
    }

    public void setValorVerbaParaPrevidenciaPrivada(BigDecimal valorVerbaParaPrevidenciaPrivada) {
        this.valorVerbaParaPrevidenciaPrivada = valorVerbaParaPrevidenciaPrivada;
    }

    public BigDecimal getValorCorrigidoParaIrpfDecimoTerceiro() {
        return this.valorCorrigidoParaIrpfDecimoTerceiro;
    }

    public void setValorCorrigidoParaIrpfDecimoTerceiro(BigDecimal valorCorrigidoParaIrpfDecimoTerceiro) {
        this.valorCorrigidoParaIrpfDecimoTerceiro = valorCorrigidoParaIrpfDecimoTerceiro;
    }

    public BigDecimal getValorCorrigidoParaIrpfFerias() {
        return this.valorCorrigidoParaIrpfFerias;
    }

    public void setValorCorrigidoParaIrpfFerias(BigDecimal valorCorrigidoParaIrpfFerias) {
        this.valorCorrigidoParaIrpfFerias = valorCorrigidoParaIrpfFerias;
    }

    public BigDecimal getValorCorrigidoParaIrpfDemaisVerbas() {
        return this.valorCorrigidoParaIrpfDemaisVerbas;
    }

    public void setValorCorrigidoParaIrpfDemaisVerbas(BigDecimal valorCorrigidoParaIrpfDemaisVerbas) {
        this.valorCorrigidoParaIrpfDemaisVerbas = valorCorrigidoParaIrpfDemaisVerbas;
    }

    public BigDecimal getContribuicaoSocialNormal() {
        return this.contribuicaoSocialNormal;
    }

    public void setContribuicaoSocialNormal(BigDecimal contribuicaoSocialNormal) {
        this.contribuicaoSocialNormal = contribuicaoSocialNormal;
    }

    public BigDecimal getContribuicaoSocialDecimoTerceiro() {
        return this.contribuicaoSocialDecimoTerceiro;
    }

    public void setContribuicaoSocialDecimoTerceiro(BigDecimal contribuicaoSocialDecimoTerceiro) {
        this.contribuicaoSocialDecimoTerceiro = contribuicaoSocialDecimoTerceiro;
    }

    public BigDecimal getContribuicaoSocial() {
        return Utils.somar(this.contribuicaoSocialNormal, this.contribuicaoSocialDecimoTerceiro);
    }

    public BigDecimal getPrevidenciaPrivada() {
        return this.previdenciaPrivada;
    }

    public void setPrevidenciaPrivada(BigDecimal previdenciaPrivada) {
        this.previdenciaPrivada = previdenciaPrivada;
    }

    public BigDecimal getTaxaDeJuros() {
        return this.taxaDeJuros;
    }

    public void setTaxaDeJuros(BigDecimal taxaDeJuros) {
        this.taxaDeJuros = taxaDeJuros;
    }

    public BigDecimal getCapital() {
        if (Utils.naoNulo(this.valorCorrigido)) {
            BigDecimal capital = this.valorCorrigido;
            if (Utils.naoNulo(this.getContribuicaoSocial())) {
                capital = capital.subtract(this.getContribuicaoSocial(), Utils.CONTEXTO_MATEMATICO);
            }
            if (Utils.naoNulo(this.previdenciaPrivada)) {
                capital = capital.subtract(this.previdenciaPrivada, Utils.CONTEXTO_MATEMATICO);
            }
            return capital;
        }
        return null;
    }

    public BigDecimal getJuros() {
        BigDecimal capital = this.getCapital();
        if (Utils.naoNulos(capital, this.taxaDeJuros)) {
            return capital.multiply(Utils.obterPercentualPara(this.taxaDeJuros), Utils.CONTEXTO_MATEMATICO);
        }
        return null;
    }

    public BigDecimal getTotal() {
        if (Utils.naoNulos(this.getCapital(), this.getJuros())) {
            return this.getCapital().add(this.getJuros(), Utils.CONTEXTO_MATEMATICO);
        }
        return null;
    }

    public BigDecimal getJurosParaIrpfDecimoTerceiro() {
        if (BigDecimal.ZERO.compareTo(this.getValorCorrigido()) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal jurosIrpfDecimoTerceiro = this.getJuros();
        jurosIrpfDecimoTerceiro = jurosIrpfDecimoTerceiro.multiply(this.getValorCorrigidoParaIrpfDecimoTerceiro(), Utils.CONTEXTO_MATEMATICO);
        jurosIrpfDecimoTerceiro = jurosIrpfDecimoTerceiro.divide(this.getValorCorrigido(), Utils.CONTEXTO_MATEMATICO);
        return jurosIrpfDecimoTerceiro;
    }

    public BigDecimal getJurosParaIrpfFerias() {
        if (BigDecimal.ZERO.compareTo(this.getValorCorrigido()) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal jurosIrpfFerias = this.getJuros();
        jurosIrpfFerias = jurosIrpfFerias.multiply(this.getValorCorrigidoParaIrpfFerias(), Utils.CONTEXTO_MATEMATICO);
        jurosIrpfFerias = jurosIrpfFerias.divide(this.getValorCorrigido(), Utils.CONTEXTO_MATEMATICO);
        return jurosIrpfFerias;
    }

    public BigDecimal getJurosParaIrpfDemaisVerbas() {
        if (BigDecimal.ZERO.compareTo(this.getValorCorrigido()) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal jurosIrpfDemaisVerbas = this.getJuros();
        jurosIrpfDemaisVerbas = jurosIrpfDemaisVerbas.multiply(this.getValorCorrigidoParaIrpfDemaisVerbas(), Utils.CONTEXTO_MATEMATICO);
        jurosIrpfDemaisVerbas = jurosIrpfDemaisVerbas.divide(this.getValorCorrigido(), Utils.CONTEXTO_MATEMATICO);
        return jurosIrpfDemaisVerbas;
    }

    public void remover() {
        ApuracaoDeJuros.getRepositorio(RepositorioDeApuracaoDeJuros.class).remover(this, false);
    }
}

