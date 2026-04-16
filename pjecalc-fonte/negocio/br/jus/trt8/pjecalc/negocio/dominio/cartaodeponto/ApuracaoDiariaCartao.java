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
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.RepositorioApuracaoDiariaCartao;
import java.io.Serializable;
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
import javax.persistence.Transient;
import javax.persistence.Version;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBAPURACAODIARIACARTAO")
@SequenceGenerator(name="SQAPURACAODIARIACARTAO", sequenceName="SQAPURACAODIARIACARTAO", allocationSize=1)
@Name(value="apuracaoDiariaCartao")
public class ApuracaoDiariaCartao
extends EntidadeBase
implements Serializable,
Comparable<ApuracaoDiariaCartao> {
    private static final long serialVersionUID = -8065420814118036939L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQAPURACAODIARIACARTAO")
    @Column(name="IIDAPURACAODIARIACARTAO")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="DDTOCORRENCIA")
    @Temporal(value=TemporalType.DATE)
    private Date dataOcorrencia;
    @Column(name="SDSFREQUENCIADIARIA", columnDefinition="VARCHAR2(150)")
    private String frequenciaDiaria;
    @Column(name="MVLHRTRABALHADAS", precision=12, scale=4)
    private BigDecimal horasTrabalhadas;
    @Column(name="MVLHRNOTURNAS", precision=12, scale=4)
    private BigDecimal horasNoturnas;
    @Column(name="MVLHRPRORROGNOT", precision=12, scale=4)
    private BigDecimal horasProrrogNoturnas;
    @Column(name="MVLHREXTRASDIARIA", precision=12, scale=4)
    private BigDecimal horasExtrasDiaria;
    @Column(name="MVLHRPRIMEXTSEPARADO", precision=12, scale=4)
    private BigDecimal horasPrimExtSeparado;
    @Column(name="MVLHRADICSUM85", precision=12, scale=4)
    private BigDecimal horasAdicionalSumula85;
    @Column(name="MVLHREXTRASNOTURNA", precision=12, scale=4)
    private BigDecimal horasExtrasNoturna;
    @Column(name="MVLHREXTRASDOM", precision=12, scale=4)
    private BigDecimal horasDomingo;
    @Column(name="MVLHREXTRASNOTURNASDOM", precision=12, scale=4)
    private BigDecimal horasNoturnasDomingo;
    @Column(name="MVLHREXTRASFER", precision=12, scale=4)
    private BigDecimal horasFeriado;
    @Column(name="MVLHREXTRASNOTURNASFER", precision=12, scale=4)
    private BigDecimal horasNoturnasFeriado;
    @Column(name="MVLHREXTRASDOMFER", precision=12, scale=4)
    private BigDecimal horasDomingoFeriado;
    @Column(name="MVLHREXTRASSEMANAL", precision=12, scale=4)
    private BigDecimal horasExtrasSemanal;
    @Column(name="MVLHREXTRASMENSAL", precision=12, scale=4)
    private BigDecimal horasExtrasMensal;
    @Column(name="MVLHRINTRAJORNADA", precision=12, scale=4)
    private BigDecimal horasIntraJornada;
    @Column(name="MVLHREXCESSOINTRA", precision=12, scale=4)
    private BigDecimal horasExcessoIntraJornada;
    @Column(name="MVLHRINTERJORNADAS", precision=12, scale=4)
    private BigDecimal horasInterJornadas;
    @Column(name="MVLHRART384", precision=12, scale=4)
    private BigDecimal horasArt384;
    @Column(name="MVLHRART253", precision=12, scale=4)
    private BigDecimal horasArt253;
    @Column(name="MVLHRART72", precision=12, scale=4)
    private BigDecimal horasArt72;
    @Column(name="IQTFERIADOTRABALHADO")
    private Integer qtFeriadoTrabalhado = 0;
    @Column(name="IQTREPOUSOTRABALHADO")
    private Integer qtRepousoTrabalhado = 0;
    @Column(name="IQTFERIADOREPOUSOTRABALHADO")
    private Integer qtFeriadoRepousoTrabalhado = 0;
    @Column(name="SFLFERIADOCONSIDERADO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean feriadoConsiderado = Boolean.TRUE;
    @Transient
    private ApuracaoCartaoDePonto apuracaoCartaoDePonto;

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public ApuracaoDiariaCartao() {
        super(RepositorioApuracaoDiariaCartao.class);
    }

    public Long getId() {
        return this.id;
    }

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Date getDataOcorrencia() {
        return this.dataOcorrencia;
    }

    public void setDataOcorrencia(Date dataOcorrencia) {
        this.dataOcorrencia = dataOcorrencia;
    }

    public String getFrequenciaDiaria() {
        return this.frequenciaDiaria;
    }

    public void setFrequenciaDiaria(String frequenciaDiaria) {
        this.frequenciaDiaria = frequenciaDiaria;
    }

    public BigDecimal getHorasTrabalhadas() {
        return this.horasTrabalhadas;
    }

    public void setHorasTrabalhadas(BigDecimal horasTrabalhadas) {
        this.horasTrabalhadas = horasTrabalhadas;
    }

    public BigDecimal getHorasNoturnas() {
        return this.horasNoturnas;
    }

    public void setHorasNoturnas(BigDecimal horasNoturnas) {
        this.horasNoturnas = horasNoturnas;
    }

    public BigDecimal getHorasProrrogNoturnas() {
        return this.horasProrrogNoturnas;
    }

    public void setHorasProrrogNoturnas(BigDecimal horasProrrogNoturnas) {
        this.horasProrrogNoturnas = horasProrrogNoturnas;
    }

    public BigDecimal getHorasExtrasDiaria() {
        return this.horasExtrasDiaria;
    }

    public void setHorasExtrasDiaria(BigDecimal horasExtrasDiaria) {
        this.horasExtrasDiaria = horasExtrasDiaria;
    }

    public BigDecimal getHorasPrimExtSeparado() {
        return this.horasPrimExtSeparado;
    }

    public void setHorasPrimExtSeparado(BigDecimal horasPrimExtSeparado) {
        this.horasPrimExtSeparado = horasPrimExtSeparado;
    }

    public BigDecimal getHorasAdicionalSumula85() {
        return this.horasAdicionalSumula85;
    }

    public void setHorasAdicionalSumula85(BigDecimal horasAdicionalSumula85) {
        this.horasAdicionalSumula85 = horasAdicionalSumula85;
    }

    public BigDecimal getHorasExtrasNoturna() {
        return this.horasExtrasNoturna;
    }

    public void setHorasExtrasNoturna(BigDecimal horasExtrasNoturna) {
        this.horasExtrasNoturna = horasExtrasNoturna;
    }

    public BigDecimal getHorasDomingo() {
        return this.horasDomingo;
    }

    public void setHorasDomingo(BigDecimal horasDomingo) {
        this.horasDomingo = horasDomingo;
    }

    public BigDecimal getHorasFeriado() {
        return this.horasFeriado;
    }

    public void setHorasFeriado(BigDecimal horasFeriado) {
        this.horasFeriado = horasFeriado;
    }

    public BigDecimal getHorasDomingoFeriado() {
        return this.horasDomingoFeriado;
    }

    public void setHorasDomingoFeriado(BigDecimal horasDomingoFeriado) {
        this.horasDomingoFeriado = horasDomingoFeriado;
    }

    public BigDecimal getHorasNoturnasDomingo() {
        return this.horasNoturnasDomingo;
    }

    public void setHorasNoturnasDomingo(BigDecimal horasNoturnasDomingo) {
        this.horasNoturnasDomingo = horasNoturnasDomingo;
    }

    public BigDecimal getHorasNoturnasFeriado() {
        return this.horasNoturnasFeriado;
    }

    public void setHorasNoturnasFeriado(BigDecimal horasNoturnasFeriado) {
        this.horasNoturnasFeriado = horasNoturnasFeriado;
    }

    public BigDecimal getHorasExtrasSemanal() {
        return this.horasExtrasSemanal;
    }

    public void setHorasExtrasSemanal(BigDecimal horasExtrasSemanal) {
        this.horasExtrasSemanal = horasExtrasSemanal;
    }

    public BigDecimal getHorasExtrasMensal() {
        return this.horasExtrasMensal;
    }

    public void setHorasExtrasMensal(BigDecimal horasExtrasMensal) {
        this.horasExtrasMensal = horasExtrasMensal;
    }

    public BigDecimal getHorasIntraJornada() {
        return this.horasIntraJornada;
    }

    public void setHorasIntraJornada(BigDecimal horasIntraJornada) {
        this.horasIntraJornada = horasIntraJornada;
    }

    public BigDecimal getHorasExcessoIntraJornada() {
        return this.horasExcessoIntraJornada;
    }

    public void setHorasExcessoIntraJornada(BigDecimal horasExcessoIntraJornada) {
        this.horasExcessoIntraJornada = horasExcessoIntraJornada;
    }

    public BigDecimal getHorasInterJornadas() {
        return this.horasInterJornadas;
    }

    public void setHorasInterJornadas(BigDecimal horasInterJornadas) {
        this.horasInterJornadas = horasInterJornadas;
    }

    public BigDecimal getHorasArt384() {
        return this.horasArt384;
    }

    public void setHorasArt384(BigDecimal horasArt384) {
        this.horasArt384 = horasArt384;
    }

    public BigDecimal getHorasArt253() {
        return this.horasArt253;
    }

    public void setHorasArt253(BigDecimal horasArt253) {
        this.horasArt253 = horasArt253;
    }

    public BigDecimal getHorasArt72() {
        return this.horasArt72;
    }

    public void setHorasArt72(BigDecimal horasArt72) {
        this.horasArt72 = horasArt72;
    }

    public Integer getQtFeriadoTrabalhado() {
        return this.qtFeriadoTrabalhado;
    }

    public void setQtFeriadoTrabalhado(Integer qtFeriadoTrabalhado) {
        this.qtFeriadoTrabalhado = qtFeriadoTrabalhado;
    }

    public Integer getQtRepousoTrabalhado() {
        return this.qtRepousoTrabalhado;
    }

    public void setQtRepousoTrabalhado(Integer qtRepousoTrabalhado) {
        this.qtRepousoTrabalhado = qtRepousoTrabalhado;
    }

    public Integer getQtFeriadoRepousoTrabalhado() {
        return this.qtFeriadoRepousoTrabalhado;
    }

    public void setQtFeriadoRepousoTrabalhado(Integer qtFeriadoRepousoTrabalhado) {
        this.qtFeriadoRepousoTrabalhado = qtFeriadoRepousoTrabalhado;
    }

    public Boolean getFeriadoConsiderado() {
        return this.feriadoConsiderado;
    }

    public void setFeriadoConsiderado(Boolean feriadoConsiderado) {
        this.feriadoConsiderado = feriadoConsiderado;
    }

    public ApuracaoCartaoDePonto getApuracaoCartaoDePonto() {
        return this.apuracaoCartaoDePonto;
    }

    public void setApuracaoCartaoDePonto(ApuracaoCartaoDePonto apuracaoCartaoDePonto) {
        this.apuracaoCartaoDePonto = apuracaoCartaoDePonto;
    }

    @Override
    public void salvar() {
        super.salvar();
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
        if (obj == null || !super.equals(obj) || this.getClass() != obj.getClass()) {
            return false;
        }
        ApuracaoDiariaCartao other = (ApuracaoDiariaCartao)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }

    @Override
    public int compareTo(ApuracaoDiariaCartao o) {
        return this.dataOcorrencia.compareTo(o.getDataOcorrencia());
    }
}

