/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.CascadeType
 *  javax.persistence.Column
 *  javax.persistence.Entity
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
 *  org.apache.commons.lang.StringUtils
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.ValidValue;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoCobrancaReclamanteEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeImpostoDeRendaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDocumentoFiscalEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoHonorarioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.Honorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.regras.DataAPartirDeAplicarJurosHonorarioValidRule;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDebitosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorarioUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.RepositorioDeParcelasAtualizaveisHonorario;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
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
import org.apache.commons.lang.StringUtils;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBPARCEATUALIZHONORARIOS")
@SequenceGenerator(name="SQPARCEATUALIZHONORARIOS", sequenceName="SQPARCEATUALIZHONORARIOS", allocationSize=1)
@Name(value="parcelasAtualizaveisHonorario")
public class ParcelasAtualizaveisHonorario
extends EntidadeBase {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPARCEATUALIZHONORARIOS")
    @Column(name="IIDPARCEATUALIZHONORARIOS")
    private Long id = null;
    @ManyToOne
    @JoinColumn(name="IIDPARCEATUALIZDESCCREDRMTE")
    private ParcelasAtualizaveisDescontoCreditosReclamante descontoCreditosReclamante;
    @ManyToOne
    @JoinColumn(name="IIDPARCEATUALIZOUTROSDEBRMDO")
    private ParcelasAtualizaveisOutrosDebitosReclamado outrosDebitosReclamado;
    @ManyToOne
    @JoinColumn(name="IIDPARCEATUALIZDEBRMTE")
    private ParcelasAtualizaveisDebitosReclamante debitosReclamante;
    @OneToOne(cascade={CascadeType.PERSIST})
    @JoinColumn(name="IIDHONORARIO")
    private Honorario honorario;
    @Column(name="SDSHONORARIO", columnDefinition="VARCHAR2(60)")
    private String descricao;
    @Column(name="STPHONORARIO", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoHonorarioEnum")})
    private TipoHonorarioEnum tipo = TipoHonorarioEnum.ADVOCATICIOS;
    @Column(name="SNMCREDOR", columnDefinition="VARCHAR2(100)")
    private String credor;
    @Column(name="STPDOCFISCALCREDOR", columnDefinition="CHAR(4)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDocumentoFiscalEnum")})
    private TipoDocumentoFiscalEnum tipoDocFiscal = TipoDocumentoFiscalEnum.CPF;
    @Column(name="SNRDOCFISCALCREDOR", columnDefinition="VARCHAR2(14)")
    private String numeroDocFiscal;
    @Column(name="SFLAPURARIRPF", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarIrpf = false;
    @Column(name="SFLAPURARIRPFSOBREJUROS", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean incidirIrpfSobreJuros = false;
    @Column(name="STPIMPOSTORENDA", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeImpostoDeRendaEnum")})
    private TipoDeImpostoDeRendaEnum tipoIrpf = TipoDeImpostoDeRendaEnum.PESSOA_FISICA;
    @Column(name="STPVALOR", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorEnum")})
    private TipoValorEnum tipoValor = TipoValorEnum.INFORMADO;
    @Column(name="MVLPARCELAINF", precision=19, scale=2)
    private BigDecimal valorParcelaInformado;
    @Column(name="MVLJUROSINF", precision=19, scale=2)
    private BigDecimal valorJurosInformado;
    @Column(name="STPINDICETRABALHISTAINF", columnDefinition="VARCHAR2(12)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    private IndiceMonetarioEnum indiceTrabalhistaInformado = IndiceMonetarioEnum.INDICE_TRABALHISTA;
    @Column(name="SFLAPLICARJUROSINF", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarJurosInformado = false;
    @Column(name="DDTAPARTIRDEAPLICARJUROSINF", nullable=true)
    @Temporal(value=TemporalType.DATE)
    @ValidValue(validRule=DataAPartirDeAplicarJurosHonorarioValidRule.class)
    private Date dataApartirDeAplicarJurosInformado;
    @Column(name="SFLDESCONTOCONTRIBSOCIALCALC", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarDescontoContribSocialCalculado = false;
    @Column(name="SFLDESCONTOPREVIDPRIVCALC", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarDescontoPrevPrivadaCalculado = false;
    @Column(name="RVLTAXACALC", precision=38, scale=25)
    private BigDecimal taxaCalculado;
    @Column(name="SFLCOBRANCARECLAMANTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoCobrancaReclamanteEnum")})
    private TipoCobrancaReclamanteEnum tipoCobrancaReclamante = TipoCobrancaReclamanteEnum.DESCONTAR_CREDITO;
    @Transient
    private long timestampCriacao = System.currentTimeMillis();

    public ParcelasAtualizaveisHonorario() {
        super(RepositorioDeParcelasAtualizaveisHonorario.class);
    }

    @Override
    public EntidadeBase validar() {
        NegocioException excecao = new NegocioException();
        if (this.apurarIrpf.booleanValue()) {
            if (StringUtils.isBlank((String)this.numeroDocFiscal)) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0003, "Documento Fiscal"));
            }
            if (this.tipoIrpf == null) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0003, "Tipo de Imposto de Renda"));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public static void removerHonorarios(ParcelasAtualizaveisDescontoCreditosReclamante descontoCreditosDoReclamante, ParcelasAtualizaveisOutrosDebitosReclamado outrosDebitosDoReclamado, ParcelasAtualizaveisDebitosReclamante debitosDoReclamante) {
        ParcelasAtualizaveisHonorario.getRepositorio(RepositorioDeParcelasAtualizaveisHonorario.class).removerHonorarios(descontoCreditosDoReclamante);
        ParcelasAtualizaveisHonorario.getRepositorio(RepositorioDeParcelasAtualizaveisHonorario.class).removerHonorarios(outrosDebitosDoReclamado);
        ParcelasAtualizaveisHonorario.getRepositorio(RepositorioDeParcelasAtualizaveisHonorario.class).removerHonorarios(debitosDoReclamante);
    }

    public void consistirDados() {
        ParcelasAtualizaveisHonorarioUtils.consistirDados(this);
    }

    public ParcelasAtualizaveisHonorario clonar() {
        ParcelasAtualizaveisHonorario clone = new ParcelasAtualizaveisHonorario();
        clone.setAplicarJurosInformado(this.aplicarJurosInformado);
        clone.setDataApartirDeAplicarJurosInformado(this.getDataApartirDeAplicarJurosInformado());
        clone.setApurarIrpf(this.apurarIrpf);
        clone.setCredor(this.credor);
        clone.setDebitosReclamante(this.debitosReclamante);
        clone.setAplicarDescontoContribSocialCalculado(this.aplicarDescontoContribSocialCalculado);
        clone.setDescontoCreditosReclamante(this.descontoCreditosReclamante);
        clone.setAplicarDescontoPrevPrivadaCalculado(this.aplicarDescontoPrevPrivadaCalculado);
        clone.setDescricao(this.descricao);
        clone.setIncidirIrpfSobreJuros(this.incidirIrpfSobreJuros);
        clone.setIndiceTrabalhistaInformado(this.indiceTrabalhistaInformado);
        clone.setNumeroDocFiscal(this.numeroDocFiscal);
        clone.setOutrosDebitosReclamado(this.outrosDebitosReclamado);
        clone.setTaxaCalculado(this.taxaCalculado);
        clone.setTipo(this.tipo);
        clone.setTipoDocFiscal(this.tipoDocFiscal);
        clone.setTipoIrpf(this.tipoIrpf);
        clone.setTipoValor(this.tipoValor);
        clone.setValorJurosInformado(this.valorJurosInformado);
        clone.setValorParcelaInformado(this.valorParcelaInformado);
        clone.setTipoCobrancaReclamante(this.getTipoCobrancaReclamante());
        clone.setHonorario(this.honorario);
        return clone;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public String getDescricao() {
        return this.descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public TipoHonorarioEnum getTipo() {
        return this.tipo;
    }

    public void setTipo(TipoHonorarioEnum tipo) {
        this.tipo = tipo;
    }

    public String getCredor() {
        return this.credor;
    }

    public void setCredor(String credor) {
        this.credor = credor;
    }

    public Boolean getApurarIrpf() {
        return this.apurarIrpf;
    }

    public void setApurarIrpf(Boolean apurarIrpf) {
        this.apurarIrpf = apurarIrpf;
    }

    public Boolean getIncidirIrpfSobreJuros() {
        return this.incidirIrpfSobreJuros;
    }

    public void setIncidirIrpfSobreJuros(Boolean incidirIrpfSobreJuros) {
        this.incidirIrpfSobreJuros = incidirIrpfSobreJuros;
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

    public IndiceMonetarioEnum getIndiceTrabalhistaInformado() {
        return this.indiceTrabalhistaInformado;
    }

    public void setIndiceTrabalhistaInformado(IndiceMonetarioEnum indiceTrabalhistaInformado) {
        this.indiceTrabalhistaInformado = indiceTrabalhistaInformado;
    }

    public Boolean getAplicarJurosInformado() {
        return this.aplicarJurosInformado;
    }

    public void setAplicarJurosInformado(Boolean aplicarJurosInformado) {
        this.aplicarJurosInformado = aplicarJurosInformado;
    }

    public BigDecimal getTaxaCalculado() {
        return this.taxaCalculado;
    }

    public void setTaxaCalculado(BigDecimal taxaCalculado) {
        this.taxaCalculado = taxaCalculado;
    }

    public TipoDeImpostoDeRendaEnum getTipoIrpf() {
        return this.tipoIrpf;
    }

    public void setTipoIrpf(TipoDeImpostoDeRendaEnum tipoIrpf) {
        this.tipoIrpf = tipoIrpf;
    }

    public TipoDocumentoFiscalEnum getTipoDocFiscal() {
        return this.tipoDocFiscal;
    }

    public void setTipoDocFiscal(TipoDocumentoFiscalEnum tipoDocFiscal) {
        this.tipoDocFiscal = tipoDocFiscal;
    }

    public String getNumeroDocFiscal() {
        return this.numeroDocFiscal;
    }

    public void setNumeroDocFiscal(String numeroDocFiscal) {
        this.numeroDocFiscal = numeroDocFiscal;
    }

    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ParcelasAtualizaveisDescontoCreditosReclamante getDescontoCreditosReclamante() {
        return this.descontoCreditosReclamante;
    }

    public void setDescontoCreditosReclamante(ParcelasAtualizaveisDescontoCreditosReclamante descontoCreditosReclamante) {
        this.descontoCreditosReclamante = descontoCreditosReclamante;
    }

    public ParcelasAtualizaveisOutrosDebitosReclamado getOutrosDebitosReclamado() {
        return this.outrosDebitosReclamado;
    }

    public void setOutrosDebitosReclamado(ParcelasAtualizaveisOutrosDebitosReclamado outrosDebitosReclamado) {
        this.outrosDebitosReclamado = outrosDebitosReclamado;
    }

    public ParcelasAtualizaveisDebitosReclamante getDebitosReclamante() {
        return this.debitosReclamante;
    }

    public void setDebitosReclamante(ParcelasAtualizaveisDebitosReclamante debitosReclamante) {
        this.debitosReclamante = debitosReclamante;
    }

    public Honorario getHonorario() {
        return this.honorario;
    }

    public void setHonorario(Honorario honorario) {
        this.honorario = honorario;
    }

    public TipoCobrancaReclamanteEnum getTipoCobrancaReclamante() {
        return this.tipoCobrancaReclamante;
    }

    public void setTipoCobrancaReclamante(TipoCobrancaReclamanteEnum tipoCobrancaReclamante) {
        this.tipoCobrancaReclamante = tipoCobrancaReclamante;
    }

    public Boolean getAplicarDescontoContribSocialCalculado() {
        return this.aplicarDescontoContribSocialCalculado;
    }

    public void setAplicarDescontoContribSocialCalculado(Boolean aplicarDescontoContribSocialCalculado) {
        this.aplicarDescontoContribSocialCalculado = aplicarDescontoContribSocialCalculado;
    }

    public Boolean getAplicarDescontoPrevPrivadaCalculado() {
        return this.aplicarDescontoPrevPrivadaCalculado;
    }

    public void setAplicarDescontoPrevPrivadaCalculado(Boolean aplicarDescontoPrevPrivadaCalculado) {
        this.aplicarDescontoPrevPrivadaCalculado = aplicarDescontoPrevPrivadaCalculado;
    }

    public Date getDataApartirDeAplicarJurosInformado() {
        return this.dataApartirDeAplicarJurosInformado;
    }

    public void setDataApartirDeAplicarJurosInformado(Date dataApartirDeAplicarJurosInformado) {
        this.dataApartirDeAplicarJurosInformado = dataApartirDeAplicarJurosInformado;
    }

    public BigDecimal getValorBaseCalculo() {
        BigDecimal baseCalculo = BigDecimal.ZERO;
        if (this.tipoValor.equals((Object)TipoValorEnum.INFORMADO)) {
            baseCalculo = baseCalculo.add(this.valorParcelaInformado != null ? this.valorParcelaInformado : BigDecimal.ZERO).add(this.valorJurosInformado != null ? this.valorJurosInformado : BigDecimal.ZERO);
        }
        return baseCalculo;
    }

    public String getBaseDeCalculoDescricao() {
        StringBuilder builder = new StringBuilder();
        if (this.tipoValor.equals((Object)TipoValorEnum.CALCULADO)) {
            builder.append("(+) Bruto Dev. Reclamante");
            if (this.aplicarDescontoContribSocialCalculado.booleanValue()) {
                builder.append(" (-) Desc. Contrib. Social");
            }
            if (this.aplicarDescontoPrevPrivadaCalculado.booleanValue()) {
                builder.append(" (-) Desc. Prev. Privada");
            }
        }
        return builder.toString();
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = super.hashCode();
        result = 31 * result + (int)(this.timestampCriacao ^ this.timestampCriacao >>> 32);
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
        if (obj == null) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        ParcelasAtualizaveisHonorario other = (ParcelasAtualizaveisHonorario)obj;
        return this.timestampCriacao == other.timestampCriacao;
    }
}

