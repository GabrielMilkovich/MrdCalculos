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
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInssSobreSalariosPagos;
import java.math.BigDecimal;
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
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBOCORRENCIAINSSSALARIOSPAGOS")
@SequenceGenerator(name="SQOCORRENCIAINSSSALARIOSPAGOS", sequenceName="SQOCORRENCIAINSSSALARIOSPAGOS", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="ocorrenciaDeInssSobreSalariosPagos")
public class OcorrenciaDeInssSobreSalariosPagos
extends OcorrenciaDeInss {
    private static final long serialVersionUID = 671138475821995722L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIAINSSSALARIOSPAGOS")
    @Column(name="IIDOCORRENCIAINSS")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDINSSSALARIOSPAGOS")
    private InssSobreSalariosPagos inssSobreSalariosPagos;
    @OneToOne(fetch=FetchType.EAGER, cascade={CascadeType.ALL})
    @JoinColumn(name="IIDOCORRENCIAINSSORIGINAL")
    private OcorrenciaDeInssSobreSalariosPagos ocorrenciaOriginal;
    @Column(name="RVLBASERECOLHIDO", precision=38, scale=25)
    private BigDecimal valorBaseRecolhido;
    @Column(name="RVLALIQUOTARECOLHIDOSEGURADO", precision=5, scale=2)
    private BigDecimal aliquotaRecolhidoSegurado;
    @Column(name="RVLRECOLHIDOSEGURADO", precision=38, scale=25)
    private BigDecimal valorRecolhidoSegurado;
    @Column(name="STPRECOLHIDOSEGURADO", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorEnum")})
    private TipoValorEnum tipoValorDoRecolhidoSegurado = TipoValorEnum.CALCULADO;
    @Column(name="RVLRECOLHIDOEMPRESA", precision=38, scale=25)
    private BigDecimal valorRecolhidoEmpresa;
    @Column(name="STPRECOLHIDOEMPRESA", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorEnum")})
    private TipoValorEnum tipoValorDoRecolhidoEmpresa = TipoValorEnum.CALCULADO;
    @Column(name="RVLINSSPAGOSAT", precision=38, scale=25)
    private BigDecimal valorTotalInssSAT;
    @Column(name="RVLRECOLHIDOSAT", precision=38, scale=25)
    private BigDecimal valorRecolhidoSAT;
    @Column(name="STPRECOLHIDOSAT", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorEnum")})
    private TipoValorEnum tipoValorDoRecolhidoSAT = TipoValorEnum.CALCULADO;
    @Column(name="RVLINSSPAGOTERCEIROS", precision=38, scale=25)
    private BigDecimal valorTotalInssTerceiros;
    @Column(name="RVLRECOLHIDOTERCEIROS", precision=38, scale=25)
    private BigDecimal valorRecolhidoTerceiros;
    @Column(name="STPRECOLHIDOTERCEIROS", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorEnum")})
    private TipoValorEnum tipoValorDoRecolhidoTerceiros = TipoValorEnum.CALCULADO;

    public OcorrenciaDeInssSobreSalariosPagos() {
        super((Class<? extends RepositorioDeOcorrenciaDeInss<? extends OcorrenciaDeInss>>)RepositorioDeOcorrenciaDeInssSobreSalariosPagos.class);
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public InssSobreSalariosPagos getInssSobreSalariosPagos() {
        return this.inssSobreSalariosPagos;
    }

    public void setInssSobreSalariosPagos(InssSobreSalariosPagos inssSobreSalariosPagos) {
        this.inssSobreSalariosPagos = inssSobreSalariosPagos;
    }

    public BigDecimal getValorBaseRecolhido() {
        return this.valorBaseRecolhido;
    }

    public void setValorBaseRecolhido(BigDecimal valorBaseRecolhido) {
        this.valorBaseRecolhido = valorBaseRecolhido;
    }

    public BigDecimal getAliquotaRecolhidoSegurado() {
        return this.aliquotaRecolhidoSegurado;
    }

    public void setAliquotaRecolhidoSegurado(BigDecimal aliquotaRecolhidoSegurado) {
        this.aliquotaRecolhidoSegurado = aliquotaRecolhidoSegurado;
    }

    public BigDecimal getValorRecolhidoSegurado() {
        return this.valorRecolhidoSegurado;
    }

    public void setValorRecolhidoSegurado(BigDecimal valorRecolhidoSegurado) {
        this.valorRecolhidoSegurado = valorRecolhidoSegurado;
    }

    public TipoValorEnum getTipoValorDoRecolhidoSegurado() {
        return this.tipoValorDoRecolhidoSegurado;
    }

    public void setTipoValorDoRecolhidoSegurado(TipoValorEnum tipoValorDoRecolhidoSegurado) {
        this.tipoValorDoRecolhidoSegurado = tipoValorDoRecolhidoSegurado;
    }

    public BigDecimal getValorRecolhidoEmpresa() {
        return this.valorRecolhidoEmpresa;
    }

    public void setValorRecolhidoEmpresa(BigDecimal valorRecolhidoEmpresa) {
        this.valorRecolhidoEmpresa = valorRecolhidoEmpresa;
    }

    public TipoValorEnum getTipoValorDoRecolhidoEmpresa() {
        return this.tipoValorDoRecolhidoEmpresa;
    }

    public void setTipoValorDoRecolhidoEmpresa(TipoValorEnum tipoValorDoRecolhidoEmpresa) {
        this.tipoValorDoRecolhidoEmpresa = tipoValorDoRecolhidoEmpresa;
    }

    public BigDecimal getValorTotalInssSAT() {
        return this.valorTotalInssSAT;
    }

    public void setValorTotalInssSAT(BigDecimal valorTotalInssSAT) {
        this.valorTotalInssSAT = valorTotalInssSAT;
    }

    public BigDecimal getValorRecolhidoSAT() {
        return this.valorRecolhidoSAT;
    }

    public void setValorRecolhidoSAT(BigDecimal valorRecolhidoSAT) {
        this.valorRecolhidoSAT = valorRecolhidoSAT;
    }

    public TipoValorEnum getTipoValorDoRecolhidoSAT() {
        return this.tipoValorDoRecolhidoSAT;
    }

    public void setTipoValorDoRecolhidoSAT(TipoValorEnum tipoValorDoRecolhidoSAT) {
        this.tipoValorDoRecolhidoSAT = tipoValorDoRecolhidoSAT;
    }

    public BigDecimal getValorRecolhidoTerceiros() {
        return this.valorRecolhidoTerceiros;
    }

    public void setValorRecolhidoTerceiros(BigDecimal valorRecolhidoTerceiros) {
        this.valorRecolhidoTerceiros = valorRecolhidoTerceiros;
    }

    public TipoValorEnum getTipoValorDoRecolhidoTerceiros() {
        return this.tipoValorDoRecolhidoTerceiros;
    }

    public void setTipoValorDoRecolhidoTerceiros(TipoValorEnum tipoValorDoRecolhidoTerceiros) {
        this.tipoValorDoRecolhidoTerceiros = tipoValorDoRecolhidoTerceiros;
    }

    public OcorrenciaDeInssSobreSalariosPagos getOcorrenciaOriginal() {
        return this.ocorrenciaOriginal;
    }

    public void setOcorrenciaOriginal(OcorrenciaDeInssSobreSalariosPagos ocorrenciaOriginal) {
        this.ocorrenciaOriginal = ocorrenciaOriginal;
    }

    public BigDecimal getValorTotalInssTerceiros() {
        return this.valorTotalInssTerceiros;
    }

    public void setValorTotalInssTerceiros(BigDecimal valorTotalInssTerceiros) {
        this.valorTotalInssTerceiros = valorTotalInssTerceiros;
    }

    public boolean isValorRecolhidoSeguradoCalculado() {
        return TipoValorEnum.CALCULADO == this.tipoValorDoRecolhidoSegurado;
    }

    public boolean isValorRecolhidoSeguradoInformado() {
        return TipoValorEnum.INFORMADO == this.tipoValorDoRecolhidoSegurado;
    }

    public boolean isValorRecolhidoEmpresaCalculado() {
        return TipoValorEnum.CALCULADO == this.tipoValorDoRecolhidoEmpresa;
    }

    public boolean isValorRecolhidoEmpresaInformado() {
        return TipoValorEnum.INFORMADO == this.tipoValorDoRecolhidoEmpresa;
    }

    public boolean isValorRecolhidoSATCalculado() {
        return TipoValorEnum.CALCULADO == this.tipoValorDoRecolhidoSAT;
    }

    public boolean isValorRecolhidoSATInformado() {
        return TipoValorEnum.INFORMADO == this.tipoValorDoRecolhidoSAT;
    }

    public boolean isValorRecolhidoTerceirosCalculado() {
        return TipoValorEnum.CALCULADO == this.tipoValorDoRecolhidoTerceiros;
    }

    public boolean isValorRecolhidoTerceirosInformado() {
        return TipoValorEnum.INFORMADO == this.tipoValorDoRecolhidoTerceiros;
    }

    public void copiar(OcorrenciaDeInssSobreSalariosPagos original) {
        this.setInssSobreSalariosPagos(original.getInssSobreSalariosPagos());
        this.setDataInicioPeriodo(original.getDataInicioPeriodo());
        this.setDataTerminoPeriodo(original.getDataTerminoPeriodo());
        this.setDataOcorrenciaInss(original.getDataOcorrenciaInss());
        this.setValorBase(original.getValorBase());
        this.setTipoValorDaBase(original.getTipoValorDaBase());
        this.setAliquotaSegurado(original.getAliquotaSegurado());
        this.setValorTetoSegurado(original.getValorTetoSegurado());
        this.setValorTotalInssSegurado(original.getValorTotalInssSegurado());
        this.setValorBaseRecolhido(original.getValorBaseRecolhido());
        this.setAliquotaRecolhidoSegurado(original.getAliquotaRecolhidoSegurado());
        this.setValorRecolhidoSegurado(original.getValorRecolhidoSegurado());
        this.setTipoValorDoRecolhidoSegurado(original.getTipoValorDoRecolhidoSegurado());
        this.setValorDevidoSeguradoFinal(original.getValorDevidoSeguradoFinal());
        this.setAliquotaEmpresa(original.getAliquotaEmpresa());
        this.setValorTetoEmpresa(original.getValorTetoEmpresa());
        this.setValorTotalInssEmpresa(original.getValorTotalInssEmpresa());
        this.setValorRecolhidoEmpresa(original.getValorRecolhidoEmpresa());
        this.setTipoValorDoRecolhidoEmpresa(original.getTipoValorDoRecolhidoEmpresa());
        this.setValorDevidoEmpresaFinal(original.getValorDevidoEmpresaFinal());
        this.setAliquotaSAT(original.getAliquotaSAT());
        this.setValorTotalInssSAT(original.getValorTotalInssSAT());
        this.setValorRecolhidoSAT(original.getValorRecolhidoSAT());
        this.setTipoValorDoRecolhidoSAT(original.getTipoValorDoRecolhidoSAT());
        this.setValorDevidoSAT(original.getValorDevidoSAT());
        this.setAliquotaTerceiros(original.getAliquotaTerceiros());
        this.setValorTotalInssTerceiros(original.getValorTotalInssTerceiros());
        this.setValorRecolhidoTerceiros(original.getValorRecolhidoTerceiros());
        this.setTipoValorDoRecolhidoTerceiros(original.getTipoValorDoRecolhidoTerceiros());
        this.setValorDevidoTerceiros(original.getValorDevidoTerceiros());
        this.setIndiceDeCorrecaoTrabalhistaUtilizado(original.getIndiceDeCorrecaoTrabalhistaUtilizado());
        this.setIndiceDeCorrecaoPrevidenciariaUtilizado(original.getIndiceDeCorrecaoPrevidenciariaUtilizado());
    }

    public void recuperarValorOriginal() {
        if (Utils.naoNulo(this.getOcorrenciaOriginal())) {
            this.copiar(this.getOcorrenciaOriginal());
        }
    }

    public void copiarValoresInformadosAnteriormente(OcorrenciaDeInssSobreSalariosPagos antiga) {
        if (Utils.nulo(antiga)) {
            return;
        }
        super.copiarValoresInformadosAnteriormente(antiga);
        if (antiga.isValorRecolhidoSeguradoInformado()) {
            this.setValorRecolhidoSegurado(antiga.getValorRecolhidoSegurado());
            this.setTipoValorDoRecolhidoSegurado(antiga.getTipoValorDoRecolhidoSegurado());
        }
        if (antiga.isValorRecolhidoEmpresaInformado()) {
            this.setValorRecolhidoEmpresa(antiga.getValorRecolhidoEmpresa());
            this.setTipoValorDoRecolhidoEmpresa(antiga.getTipoValorDoRecolhidoEmpresa());
        }
        if (antiga.isValorRecolhidoSATInformado()) {
            this.setValorRecolhidoSAT(antiga.getValorRecolhidoSAT());
            this.setTipoValorDoRecolhidoSAT(antiga.getTipoValorDoRecolhidoSAT());
        }
        if (antiga.isValorRecolhidoTerceirosInformado()) {
            this.setValorRecolhidoTerceiros(antiga.getValorRecolhidoTerceiros());
            this.setTipoValorDoRecolhidoTerceiros(antiga.getTipoValorDoRecolhidoTerceiros());
        }
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = super.hashCode();
        result = 31 * result + (this.aliquotaRecolhidoSegurado == null ? 0 : this.aliquotaRecolhidoSegurado.hashCode());
        result = 31 * result + (this.inssSobreSalariosPagos == null ? 0 : this.inssSobreSalariosPagos.hashCode());
        result = 31 * result + (this.tipoValorDoRecolhidoEmpresa == null ? 0 : this.tipoValorDoRecolhidoEmpresa.hashCode());
        result = 31 * result + (this.tipoValorDoRecolhidoSAT == null ? 0 : this.tipoValorDoRecolhidoSAT.hashCode());
        result = 31 * result + (this.tipoValorDoRecolhidoSegurado == null ? 0 : this.tipoValorDoRecolhidoSegurado.hashCode());
        result = 31 * result + (this.tipoValorDoRecolhidoTerceiros == null ? 0 : this.tipoValorDoRecolhidoTerceiros.hashCode());
        result = 31 * result + (this.valorBaseRecolhido == null ? 0 : this.valorBaseRecolhido.hashCode());
        result = 31 * result + (this.valorRecolhidoEmpresa == null ? 0 : this.valorRecolhidoEmpresa.hashCode());
        result = 31 * result + (this.valorRecolhidoSAT == null ? 0 : this.valorRecolhidoSAT.hashCode());
        result = 31 * result + (this.valorRecolhidoSegurado == null ? 0 : this.valorRecolhidoSegurado.hashCode());
        result = 31 * result + (this.valorRecolhidoTerceiros == null ? 0 : this.valorRecolhidoTerceiros.hashCode());
        result = 31 * result + (this.valorTotalInssSAT == null ? 0 : this.valorTotalInssSAT.hashCode());
        result = 31 * result + (this.valorTotalInssTerceiros == null ? 0 : this.valorTotalInssTerceiros.hashCode());
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
        OcorrenciaDeInssSobreSalariosPagos other = (OcorrenciaDeInssSobreSalariosPagos)obj;
        if (this.aliquotaRecolhidoSegurado == null ? other.aliquotaRecolhidoSegurado != null : !this.aliquotaRecolhidoSegurado.equals(other.aliquotaRecolhidoSegurado)) {
            return false;
        }
        if (this.inssSobreSalariosPagos == null ? other.inssSobreSalariosPagos != null : !this.inssSobreSalariosPagos.equals(other.inssSobreSalariosPagos)) {
            return false;
        }
        if (this.tipoValorDoRecolhidoEmpresa != other.tipoValorDoRecolhidoEmpresa) {
            return false;
        }
        if (this.tipoValorDoRecolhidoSAT != other.tipoValorDoRecolhidoSAT) {
            return false;
        }
        if (this.tipoValorDoRecolhidoSegurado != other.tipoValorDoRecolhidoSegurado) {
            return false;
        }
        if (this.tipoValorDoRecolhidoTerceiros != other.tipoValorDoRecolhidoTerceiros) {
            return false;
        }
        if (this.valorBaseRecolhido == null ? other.valorBaseRecolhido != null : !this.valorBaseRecolhido.equals(other.valorBaseRecolhido)) {
            return false;
        }
        if (this.valorRecolhidoEmpresa == null ? other.valorRecolhidoEmpresa != null : !this.valorRecolhidoEmpresa.equals(other.valorRecolhidoEmpresa)) {
            return false;
        }
        if (this.valorRecolhidoSAT == null ? other.valorRecolhidoSAT != null : !this.valorRecolhidoSAT.equals(other.valorRecolhidoSAT)) {
            return false;
        }
        if (this.valorRecolhidoSegurado == null ? other.valorRecolhidoSegurado != null : !this.valorRecolhidoSegurado.equals(other.valorRecolhidoSegurado)) {
            return false;
        }
        if (this.valorRecolhidoTerceiros == null ? other.valorRecolhidoTerceiros != null : !this.valorRecolhidoTerceiros.equals(other.valorRecolhidoTerceiros)) {
            return false;
        }
        if (this.valorTotalInssSAT == null ? other.valorTotalInssSAT != null : !this.valorTotalInssSAT.equals(other.valorTotalInssSAT)) {
            return false;
        }
        return !(this.valorTotalInssTerceiros == null ? other.valorTotalInssTerceiros != null : !this.valorTotalInssTerceiros.equals(other.valorTotalInssTerceiros));
    }

    @Override
    public boolean isJurosEMultaPrevidenciario() {
        return this.getInssSobreSalariosPagos().getCorrecaoPrevidenciaria() != false && (this.getInssSobreSalariosPagos().getCorrecaoTrabalhista() == false || this.getInssSobreSalariosPagos().getCorrecaoTrabalhista() != false && HelperDate.dateAfter(this.getDataOcorrenciaInss(), this.getInssSobreSalariosPagos().getDataLimiteCorrecaoTrabalhista())) || this.getInssSobreSalariosPagos().getCorrecao11941() != false && HelperDate.dateAfter(this.getDataOcorrenciaInss(), this.getInssSobreSalariosPagos().getDataLimiteCorrecao11941()) && this.getInssSobreSalariosPagos().getCorrecaoTrabalhista() != false;
    }
}

