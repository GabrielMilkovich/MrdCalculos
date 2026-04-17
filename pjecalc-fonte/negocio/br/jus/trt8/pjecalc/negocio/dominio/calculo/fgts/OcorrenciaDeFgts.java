/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
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
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.apache.commons.lang.builder.EqualsBuilder
 *  org.apache.commons.lang.builder.HashCodeBuilder
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.constantes.AliquotaDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeBaseDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeCorrecaoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeDepositadoDoFgtsEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.Fgts;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.fgts.RepositorioDeOcorrenciaDeFgts;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
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
import javax.persistence.Transient;
import javax.persistence.Version;
import org.apache.commons.lang.builder.EqualsBuilder;
import org.apache.commons.lang.builder.HashCodeBuilder;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBOCORRENCIAFGTS")
@SequenceGenerator(name="SQOCORRENCIAFGTS", sequenceName="SQOCORRENCIAFGTS", allocationSize=1)
@Name(value="ocorrenciaDeFgts")
public class OcorrenciaDeFgts
extends EntidadeBase
implements Serializable {
    private static final long serialVersionUID = 5262035940732791839L;
    private static final BigDecimal TAXA_CONTRIBUICAO_SOCIAL = new BigDecimal("0.5");
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIAFGTS")
    @Column(name="IIDOCORRENCIAFGTS")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDFGTSCALCULO")
    private Fgts fgts;
    @Column(name="DDTOCORRENCIAFGTS")
    @Temporal(value=TemporalType.DATE)
    @Required
    private Date ocorrencia;
    @Column(name="RVLBASEHISTORICO", precision=38, scale=25)
    @Required
    private BigDecimal baseHistorico;
    @Column(name="STPBASEHISTORICO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeBaseDoFgtsEnum")})
    @Required
    private TipoDeBaseDoFgtsEnum tipoDeBaseDoFgts = TipoDeBaseDoFgtsEnum.CALCULADA;
    @Column(name="RVLBASEVERBA", precision=38, scale=38)
    @Required
    private BigDecimal baseVerba;
    @Column(name="RVLBASEVERBASEMAVISO", precision=38, scale=25)
    @Required
    private BigDecimal baseVerbaSemAvisoPrevio;
    @Column(name="STPALIQUOTA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="AliquotaDoFgtsEnum")})
    @Required
    private AliquotaDoFgtsEnum aliquotaDoFgtsEnum;
    @Column(name="RVLDEPOSITADO", precision=38, scale=38)
    @Required
    private BigDecimal depositado;
    @Column(name="STPDEPOSITADO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeDepositadoDoFgtsEnum")})
    @Required
    private TipoDeDepositadoDoFgtsEnum tipoDeDepositadoDoFgts = TipoDeDepositadoDoFgtsEnum.CALCULADA;
    @OneToOne(fetch=FetchType.EAGER, cascade={CascadeType.ALL})
    @JoinColumn(name="IIDOCORRENCIAFGTSORIGINAL")
    private OcorrenciaDeFgts ocorrenciaOriginal;
    @Column(name="RVLINDICEUTILIZADO", precision=38, scale=38)
    private BigDecimal indiceAcumulado;
    @Column(name="RVLINDICEUTILIZADOMULTA", precision=38, scale=38)
    private BigDecimal indiceAcumuladoDaMulta;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25)
    private BigDecimal taxaDeJuros;
    @Transient
    private Boolean selecionada = Boolean.FALSE;
    @Transient
    private static final HelperDate DATA_INICIAL_DA_CONTRIBUICAO_SOCIAL_05 = HelperDate.getInstance(2002, 0, 1);
    @Transient
    private static final HelperDate DATA_FINAL_DA_CONTRIBUICAO_SOCIAL_05 = HelperDate.getInstance(2006, 11, 1);

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public OcorrenciaDeFgts() {
        super(RepositorioDeOcorrenciaDeFgts.class);
    }

    public OcorrenciaDeFgts(Fgts fgts) {
        this();
        this.setFgts(fgts);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public void copiar(OcorrenciaDeFgts original) {
        this.ocorrencia = original.getOcorrencia();
        this.baseHistorico = original.getBaseHistorico();
        this.tipoDeBaseDoFgts = original.getTipoDeBaseDoFgts();
        this.baseVerba = original.getBaseVerba();
        this.aliquotaDoFgtsEnum = original.getAliquotaDoFgtsEnum();
        this.depositado = original.getDepositado();
        this.tipoDeDepositadoDoFgts = original.getTipoDeDepositadoDoFgts();
    }

    public void recuperarValorOriginal() {
        if (this.getOcorrenciaOriginal() != null) {
            this.copiar(this.getOcorrenciaOriginal());
        }
    }

    public static List<OcorrenciaDeFgts> obterPorFgts(Fgts fgts) {
        return OcorrenciaDeFgts.getRepositorio(RepositorioDeOcorrenciaDeFgts.class).obterPorFgts(fgts);
    }

    public Long getId() {
        return this.id;
    }

    public Fgts getFgts() {
        return this.fgts;
    }

    public void setFgts(Fgts fgts) {
        this.fgts = fgts;
    }

    public Date getOcorrencia() {
        return this.ocorrencia;
    }

    public void setOcorrencia(Date ocorrencia) {
        this.ocorrencia = ocorrencia;
    }

    public BigDecimal getBaseHistorico() {
        return this.baseHistorico;
    }

    public void setBaseHistorico(BigDecimal baseHistorico) {
        this.baseHistorico = baseHistorico;
    }

    public TipoDeBaseDoFgtsEnum getTipoDeBaseDoFgts() {
        return this.tipoDeBaseDoFgts;
    }

    public void setTipoDeBaseDoFgts(TipoDeBaseDoFgtsEnum tipoDeBaseDoFgts) {
        this.tipoDeBaseDoFgts = tipoDeBaseDoFgts;
    }

    public BigDecimal getBaseVerba() {
        return this.baseVerba;
    }

    public void setBaseVerba(BigDecimal baseVerba) {
        this.baseVerba = baseVerba;
    }

    public BigDecimal getBaseVerbaSemAvisoPrevio() {
        return this.baseVerbaSemAvisoPrevio;
    }

    public void setBaseVerbaSemAvisoPrevio(BigDecimal baseVerbaSemAvisoPrevio) {
        this.baseVerbaSemAvisoPrevio = baseVerbaSemAvisoPrevio;
    }

    public AliquotaDoFgtsEnum getAliquotaDoFgtsEnum() {
        return this.aliquotaDoFgtsEnum;
    }

    public void setAliquotaDoFgtsEnum(AliquotaDoFgtsEnum aliquotaDoFgtsEnum) {
        this.aliquotaDoFgtsEnum = aliquotaDoFgtsEnum;
    }

    public BigDecimal getDepositado() {
        return this.depositado;
    }

    public void setDepositado(BigDecimal depositado) {
        this.depositado = depositado;
    }

    public TipoDeDepositadoDoFgtsEnum getTipoDeDepositadoDoFgts() {
        return this.tipoDeDepositadoDoFgts;
    }

    public void setTipoDeDepositadoDoFgts(TipoDeDepositadoDoFgtsEnum tipoDeDepositadoDoFgts) {
        this.tipoDeDepositadoDoFgts = tipoDeDepositadoDoFgts;
    }

    public OcorrenciaDeFgts getOcorrenciaOriginal() {
        return this.ocorrenciaOriginal;
    }

    public void setOcorrenciaOriginal(OcorrenciaDeFgts ocorrenciaOriginal) {
        this.ocorrenciaOriginal = ocorrenciaOriginal;
    }

    public Boolean getSelecionada() {
        return this.selecionada;
    }

    public void setSelecionada(Boolean selecionada) {
        this.selecionada = selecionada;
    }

    public boolean isOriginal() {
        return Utils.nulo(this.getOcorrenciaOriginal());
    }

    public boolean isValorCalculado() {
        return TipoDeBaseDoFgtsEnum.CALCULADA.equals((Object)this.tipoDeBaseDoFgts);
    }

    public boolean isValorInformado() {
        return TipoDeBaseDoFgtsEnum.INFORMADA.equals((Object)this.tipoDeBaseDoFgts);
    }

    public boolean isDepositadoInformado() {
        return TipoDeDepositadoDoFgtsEnum.INFORMADA.equals((Object)this.tipoDeDepositadoDoFgts);
    }

    public BigDecimal getIndiceAcumulado() {
        return this.indiceAcumulado;
    }

    public void setIndiceAcumulado(BigDecimal indiceAcumulado) {
        this.indiceAcumulado = indiceAcumulado;
    }

    public BigDecimal getValorDevido() {
        return this.aliquotaDoFgtsEnum.calcular(this.getSomaDasBases());
    }

    public BigDecimal getValorDevidoSemAviso() {
        return this.aliquotaDoFgtsEnum.calcular(this.getSomaDasBases(Boolean.TRUE));
    }

    public BigDecimal getIndiceAcumuladoDaMulta() {
        return this.indiceAcumuladoDaMulta;
    }

    public void setIndiceAcumuladoDaMulta(BigDecimal indiceAcumuladoDaMulta) {
        this.indiceAcumuladoDaMulta = indiceAcumuladoDaMulta;
    }

    public BigDecimal getSomaDasBases() {
        return this.getSomaDasBases(Boolean.FALSE);
    }

    public BigDecimal getSomaDasBases(Boolean excluirAviso) {
        BigDecimal soma = BigDecimal.ZERO;
        BigDecimal bigDecimal = soma = Utils.naoNulo(this.baseHistorico) ? soma.add(this.baseHistorico, Utils.CONTEXTO_MATEMATICO) : BigDecimal.ZERO;
        soma = excluirAviso != false ? (Utils.naoNulo(this.baseVerbaSemAvisoPrevio) ? soma.add(this.baseVerbaSemAvisoPrevio, Utils.CONTEXTO_MATEMATICO) : soma) : (Utils.naoNulo(this.baseVerba) ? soma.add(this.baseVerba, Utils.CONTEXTO_MATEMATICO) : soma);
        return soma;
    }

    public BigDecimal getValorDevidoCorrigido(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return Utils.aplicarCorrecaoMonetaria(tipoDeCorrecao.indice(this), this.getValorDevido());
    }

    public BigDecimal getValorDevidoSemAvisoCorrigido(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return Utils.aplicarCorrecaoMonetaria(tipoDeCorrecao.indice(this), this.getValorDevidoSemAviso());
    }

    public BigDecimal getValorDaContribuicaoSocialDe05() {
        if (HelperDate.getInstance(this.getOcorrencia()).between(DATA_INICIAL_DA_CONTRIBUICAO_SOCIAL_05, DATA_FINAL_DA_CONTRIBUICAO_SOCIAL_05)) {
            return Utils.aplicarTaxa(TAXA_CONTRIBUICAO_SOCIAL, this.getSomaDasBases(), BigDecimal.ZERO);
        }
        return BigDecimal.ZERO;
    }

    public BigDecimal getValorDaContribuicaoSocialDe05Corrigido() {
        return Utils.aplicarCorrecaoMonetaria(this.getIndiceAcumulado(), this.getValorDaContribuicaoSocialDe05());
    }

    public BigDecimal getDiferenca() {
        return this.getDiferenca(Boolean.FALSE);
    }

    public BigDecimal getDiferenca(Boolean excluiAviso) {
        BigDecimal diferenca;
        BigDecimal valorDepositado;
        BigDecimal valorDevido;
        BigDecimal bigDecimal = valorDevido = excluiAviso != false ? this.getValorDevidoSemAviso() : this.getValorDevido();
        if (Utils.nulo(valorDevido)) {
            valorDevido = BigDecimal.ZERO;
        }
        if (Utils.nulo(valorDepositado = this.getDepositado())) {
            valorDepositado = BigDecimal.ZERO;
        }
        if ((diferenca = valorDevido.subtract(valorDepositado, Utils.CONTEXTO_MATEMATICO)).signum() == -1) {
            diferenca = BigDecimal.ZERO;
        }
        return diferenca;
    }

    public BigDecimal getDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        return this.getDiferencaCorrigida(tipoDeCorrecao, Boolean.FALSE);
    }

    public BigDecimal getDiferencaCorrigida(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao, Boolean excluiAviso) {
        BigDecimal diferenca;
        BigDecimal bigDecimal = diferenca = excluiAviso != false ? this.getDiferenca(Boolean.TRUE) : this.getDiferenca(Boolean.FALSE);
        if (Utils.nulo(diferenca)) {
            return BigDecimal.ZERO;
        }
        return Utils.aplicarCorrecaoMonetaria(tipoDeCorrecao.indice(this), diferenca);
    }

    public BigDecimal getTaxaDeJuros() {
        return this.taxaDeJuros;
    }

    public BigDecimal getJuros(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        if (Utils.nulo(this.taxaDeJuros)) {
            return BigDecimal.ZERO;
        }
        return this.getDiferencaCorrigida(tipoDeCorrecao).multiply(Utils.obterPercentualPara(this.taxaDeJuros), Utils.CONTEXTO_MATEMATICO);
    }

    public BigDecimal getTotal(TipoDeCorrecaoDoFgtsEnum tipoDeCorrecao) {
        BigDecimal diferencaCorrigida = this.getDiferencaCorrigida(tipoDeCorrecao);
        if (Utils.naoNulo(diferencaCorrigida)) {
            return diferencaCorrigida.add(this.getJuros(tipoDeCorrecao), Utils.CONTEXTO_MATEMATICO);
        }
        return null;
    }

    public BigDecimal getJurosDaContribuicaoSocialDe05() {
        if (Utils.nulo(this.taxaDeJuros)) {
            return null;
        }
        return this.getValorDaContribuicaoSocialDe05Corrigido().multiply(Utils.obterPercentualPara(this.taxaDeJuros), Utils.CONTEXTO_MATEMATICO);
    }

    public BigDecimal getTotalDaContribuicaoSocialDe05() {
        return Utils.somar(this.getValorDaContribuicaoSocialDe05Corrigido(), this.getJurosDaContribuicaoSocialDe05(), this.getValorDaContribuicaoSocialDe05Corrigido());
    }

    public void setTaxaDeJuros(BigDecimal taxaDeJuros) {
        this.taxaDeJuros = taxaDeJuros;
    }

    public void copiarValoresInformadosAnteriormente(OcorrenciaDeFgts antiga) {
        if (Utils.nulo(antiga)) {
            return;
        }
        if (antiga.isValorInformado()) {
            this.setBaseHistorico(antiga.getBaseHistorico());
            this.setTipoDeBaseDoFgts(antiga.getTipoDeBaseDoFgts());
        }
        if (antiga.isDepositadoInformado()) {
            this.setDepositado(antiga.getDepositado());
            this.setTipoDeDepositadoDoFgts(antiga.getTipoDeDepositadoDoFgts());
        }
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder(1, 31).append((Object)this.id).append((Object)this.ocorrencia).append((Object)this.baseHistorico).append((Object)this.tipoDeBaseDoFgts).append((Object)this.baseVerba).append((Object)this.aliquotaDoFgtsEnum).append((Object)this.depositado).append((Object)this.tipoDeDepositadoDoFgts).toHashCode();
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
        OcorrenciaDeFgts other = (OcorrenciaDeFgts)obj;
        return new EqualsBuilder().appendSuper(super.equals(obj)).append((Object)this.ocorrencia, (Object)other.ocorrencia).append((Object)this.baseHistorico, (Object)other.baseHistorico).append((Object)this.tipoDeBaseDoFgts, (Object)other.tipoDeBaseDoFgts).append((Object)this.baseVerba, (Object)other.baseVerba).append((Object)this.aliquotaDoFgtsEnum, (Object)other.aliquotaDoFgtsEnum).append((Object)this.depositado, (Object)other.depositado).append((Object)this.tipoDeDepositadoDoFgts, (Object)other.tipoDeDepositadoDoFgts).isEquals();
    }
}

