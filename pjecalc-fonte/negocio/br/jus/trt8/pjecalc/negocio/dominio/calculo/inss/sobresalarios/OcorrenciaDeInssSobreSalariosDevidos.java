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
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInssSobreSalariosDevidos;
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
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBOCORRENCIAINSSSALARIOSDEVIDO")
@SequenceGenerator(name="SQOCORRENCIAINSSSALARIOSDEVIDO", sequenceName="SQOCORRENCIAINSSSALARIOSDEVIDO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="ocorrenciaDeInssSobreSalariosDevidos")
public class OcorrenciaDeInssSobreSalariosDevidos
extends OcorrenciaDeInss {
    private static final long serialVersionUID = -4659751475695895485L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIAINSSSALARIOSDEVIDO")
    @Column(name="IIDOCORRENCIAINSS")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDINSSSALARIOSDEVIDOS")
    private InssSobreSalariosDevidos inssSobreSalariosDevidos;
    @OneToOne(fetch=FetchType.EAGER, cascade={CascadeType.ALL})
    @JoinColumn(name="IIDOCORRENCIAINSSORIGINAL")
    private OcorrenciaDeInssSobreSalariosDevidos ocorrenciaOriginal;
    @Column(name="RVLBASEVERBAS", precision=38, scale=25)
    private BigDecimal valorBaseVerbas;
    @Column(name="RVLALIQUOTACHEIASEGURADO", precision=5, scale=2)
    private BigDecimal aliquotaDoTotalSegurado;
    @Column(name="RVLDEVIDOSEGURADOVERBAS", precision=38, scale=25)
    private BigDecimal valorDevidoSeguradoVerbas;
    @Column(name="RVLDEVIDOEMPRESAVERBAS", precision=38, scale=25)
    private BigDecimal valorDevidoEmpresaVerbas;
    @Column(name="RVLINDICERECLAMANTE", precision=38, scale=25)
    private BigDecimal indiceDeCorrecaoDoReclamante;
    @Column(name="RVLFATORCORRECAO", precision=5)
    private BigDecimal fatorCorrecao = BigDecimal.ONE;

    public OcorrenciaDeInssSobreSalariosDevidos() {
        super((Class<? extends RepositorioDeOcorrenciaDeInss<? extends OcorrenciaDeInss>>)RepositorioDeOcorrenciaDeInssSobreSalariosDevidos.class);
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public boolean isRealizarCalculoParaSegurado() {
        return this.getInssSobreSalariosDevidos().getApurarInssSegurado();
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public InssSobreSalariosDevidos getInssSobreSalariosDevidos() {
        return this.inssSobreSalariosDevidos;
    }

    public void setInssSobreSalariosDevidos(InssSobreSalariosDevidos inssSobreSalariosDevidos) {
        this.inssSobreSalariosDevidos = inssSobreSalariosDevidos;
    }

    public OcorrenciaDeInssSobreSalariosDevidos getOcorrenciaOriginal() {
        return this.ocorrenciaOriginal;
    }

    public void setOcorrenciaOriginal(OcorrenciaDeInssSobreSalariosDevidos ocorrenciaOriginal) {
        this.ocorrenciaOriginal = ocorrenciaOriginal;
    }

    public BigDecimal getValorBaseVerbas() {
        return Utils.zerarSeNegativo(this.valorBaseVerbas);
    }

    public void setValorBaseVerbas(BigDecimal valorBaseVerbas) {
        this.valorBaseVerbas = valorBaseVerbas;
    }

    public BigDecimal getAliquotaDoTotalSegurado() {
        return this.aliquotaDoTotalSegurado;
    }

    public void setAliquotaDoTotalSegurado(BigDecimal aliquotaDoTotalSegurado) {
        this.aliquotaDoTotalSegurado = aliquotaDoTotalSegurado;
    }

    public BigDecimal getValorDevidoSeguradoVerbas() {
        return Utils.zerarSeNegativo(this.valorDevidoSeguradoVerbas);
    }

    public void setValorDevidoSeguradoVerbas(BigDecimal valorDevidoSeguradoVerbas) {
        this.valorDevidoSeguradoVerbas = valorDevidoSeguradoVerbas;
    }

    public BigDecimal getValorDevidoEmpresaVerbas() {
        return this.valorDevidoEmpresaVerbas;
    }

    public void setValorDevidoEmpresaVerbas(BigDecimal valorDevidoEmpresaVerbas) {
        this.valorDevidoEmpresaVerbas = valorDevidoEmpresaVerbas;
    }

    public BigDecimal getIndiceDeCorrecaoDoReclamante() {
        if (BigDecimal.ONE.compareTo(this.fatorCorrecao) != 0) {
            return Utils.dividir(this.indiceDeCorrecaoDoReclamante, this.fatorCorrecao);
        }
        return this.indiceDeCorrecaoDoReclamante;
    }

    public void setIndiceDeCorrecaoDoReclamante(BigDecimal indiceDeCorrecaoDoReclamante) {
        this.indiceDeCorrecaoDoReclamante = indiceDeCorrecaoDoReclamante;
    }

    public BigDecimal getFatorCorrecao() {
        return this.fatorCorrecao;
    }

    public void setFatorCorrecao(BigDecimal fatorCorrecao) {
        this.fatorCorrecao = fatorCorrecao;
    }

    public BigDecimal getValorSomaDasBases() {
        BigDecimal soma = this.getValorBase();
        if (Utils.naoNulo(this.getValorBaseVerbas())) {
            soma = soma.add(this.getValorBaseVerbas(), Utils.CONTEXTO_MATEMATICO);
        }
        return soma;
    }

    public BigDecimal getValorDevidoReclamanteCorrigido() {
        if (Utils.naoNulos(this.getValorDevidoSeguradoFinal(), this.getIndiceDeCorrecaoDoReclamante())) {
            return this.getValorDevidoSeguradoFinal().multiply(this.getIndiceDeCorrecaoDoReclamante(), Utils.CONTEXTO_MATEMATICO);
        }
        return null;
    }

    public void copiar(OcorrenciaDeInssSobreSalariosDevidos original) {
        this.setInssSobreSalariosDevidos(original.getInssSobreSalariosDevidos());
        this.setDataInicioPeriodo(original.getDataInicioPeriodo());
        this.setDataTerminoPeriodo(original.getDataTerminoPeriodo());
        this.setDataOcorrenciaInss(original.getDataOcorrenciaInss());
        this.setValorBase(original.getValorBase());
        this.setTipoValorDaBase(original.getTipoValorDaBase());
        this.setAliquotaSegurado(original.getAliquotaSegurado());
        this.setValorTetoSegurado(original.getValorTetoSegurado());
        this.setValorTotalInssSegurado(original.getValorTotalInssSegurado());
        this.setValorBaseVerbas(original.getValorBaseVerbas());
        this.setAliquotaDoTotalSegurado(original.getAliquotaDoTotalSegurado());
        this.setValorDevidoSeguradoVerbas(original.getValorDevidoSeguradoVerbas());
        this.setValorDevidoSeguradoFinal(original.getValorDevidoSeguradoFinal());
        this.setAliquotaEmpresa(original.getAliquotaEmpresa());
        this.setValorTetoEmpresa(original.getValorTetoEmpresa());
        this.setValorTotalInssEmpresa(original.getValorTotalInssEmpresa());
        this.setValorDevidoEmpresaVerbas(original.getValorDevidoEmpresaVerbas());
        this.setValorDevidoEmpresaFinal(original.getValorDevidoEmpresaFinal());
        this.setAliquotaSAT(original.getAliquotaSAT());
        this.setValorDevidoSAT(original.getValorDevidoSAT());
        this.setAliquotaTerceiros(original.getAliquotaTerceiros());
        this.setValorDevidoTerceiros(original.getValorDevidoTerceiros());
        this.setIndiceDeCorrecaoDoReclamante(original.getIndiceDeCorrecaoDoReclamante());
        this.setFatorCorrecao(original.getFatorCorrecao());
        this.setIndiceDeCorrecaoTrabalhistaUtilizado(original.getIndiceDeCorrecaoTrabalhistaUtilizado());
        this.setIndiceDeCorrecaoPrevidenciariaUtilizado(original.getIndiceDeCorrecaoPrevidenciariaUtilizado());
    }

    public void recuperarValorOriginal() {
        if (Utils.naoNulo(this.getOcorrenciaOriginal())) {
            this.copiar(this.getOcorrenciaOriginal());
        }
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = super.hashCode();
        result = 31 * result + (this.aliquotaDoTotalSegurado == null ? 0 : this.aliquotaDoTotalSegurado.hashCode());
        result = 31 * result + (this.indiceDeCorrecaoDoReclamante == null ? 0 : this.indiceDeCorrecaoDoReclamante.hashCode());
        result = 31 * result + (this.inssSobreSalariosDevidos == null ? 0 : this.inssSobreSalariosDevidos.hashCode());
        result = 31 * result + (this.valorBaseVerbas == null ? 0 : this.valorBaseVerbas.hashCode());
        result = 31 * result + (this.valorDevidoEmpresaVerbas == null ? 0 : this.valorDevidoEmpresaVerbas.hashCode());
        result = 31 * result + (this.valorDevidoSeguradoVerbas == null ? 0 : this.valorDevidoSeguradoVerbas.hashCode());
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
        OcorrenciaDeInssSobreSalariosDevidos other = (OcorrenciaDeInssSobreSalariosDevidos)obj;
        if (this.aliquotaDoTotalSegurado == null ? other.aliquotaDoTotalSegurado != null : !this.aliquotaDoTotalSegurado.equals(other.aliquotaDoTotalSegurado)) {
            return false;
        }
        if (this.indiceDeCorrecaoDoReclamante == null ? other.indiceDeCorrecaoDoReclamante != null : !this.indiceDeCorrecaoDoReclamante.equals(other.indiceDeCorrecaoDoReclamante)) {
            return false;
        }
        if (this.inssSobreSalariosDevidos == null ? other.inssSobreSalariosDevidos != null : !this.inssSobreSalariosDevidos.equals(other.inssSobreSalariosDevidos)) {
            return false;
        }
        if (this.valorBaseVerbas == null ? other.valorBaseVerbas != null : !this.valorBaseVerbas.equals(other.valorBaseVerbas)) {
            return false;
        }
        if (this.valorDevidoEmpresaVerbas == null ? other.valorDevidoEmpresaVerbas != null : !this.valorDevidoEmpresaVerbas.equals(other.valorDevidoEmpresaVerbas)) {
            return false;
        }
        return !(this.valorDevidoSeguradoVerbas == null ? other.valorDevidoSeguradoVerbas != null : !this.valorDevidoSeguradoVerbas.equals(other.valorDevidoSeguradoVerbas));
    }

    @Override
    public boolean isJurosEMultaPrevidenciario() {
        return this.getInssSobreSalariosDevidos().getCorrecaoPrevidenciaria() != false && (this.getInssSobreSalariosDevidos().getCorrecaoTrabalhista() == false || this.getInssSobreSalariosDevidos().getCorrecao11941() != false && HelperDate.dateAfter(this.getDataOcorrenciaInss(), this.getInssSobreSalariosDevidos().getDataLimiteCorrecao11941()) && HelperDate.dateAfter(this.getDataOcorrenciaInss(), this.getInssSobreSalariosDevidos().getDataLimiteCorrecaoTrabalhista())) || this.getInssSobreSalariosDevidos().getCorrecao11941() != false && HelperDate.dateAfter(this.getDataOcorrenciaInss(), this.getInssSobreSalariosDevidos().getDataLimiteCorrecao11941()) && this.getInssSobreSalariosDevidos().getCorrecaoTrabalhista() != false;
    }
}

