/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.MappedSuperclass
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.apache.commons.lang.builder.EqualsBuilder
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInss;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.MappedSuperclass;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.apache.commons.lang.builder.EqualsBuilder;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;

@MappedSuperclass
public abstract class OcorrenciaDeInss
extends EntidadeBase
implements Comparable<OcorrenciaDeInss> {
    private static final long serialVersionUID = 963715969685692563L;
    @Column(name="DDTINICIAL", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date dataInicioPeriodo;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="DDTFINAL", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date dataTerminoPeriodo;
    @Column(name="DDTOCORRENCIAINSS", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date dataOcorrenciaInss;
    @Column(name="RVLBASE", precision=38, scale=25)
    private BigDecimal valorBase = BigDecimal.ZERO;
    @Column(name="STPBASE", columnDefinition="VARCHAR2(1)")
    @NotNull
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoValorEnum")})
    private TipoValorEnum tipoValorDaBase = TipoValorEnum.CALCULADO;
    @Column(name="RVLALIQUOTASEGURADO", precision=5, scale=2)
    private BigDecimal aliquotaSegurado;
    @Column(name="RVLTETOSEGURADO", precision=19, scale=2)
    private BigDecimal valorTetoSegurado;
    @Column(name="RVLALIQUOTAEMPRESA", precision=5, scale=4)
    private BigDecimal aliquotaEmpresa;
    @Column(name="RVLTETOEMPRESA", precision=19, scale=2)
    private BigDecimal valorTetoEmpresa;
    @Column(name="RVLALIQUOTASAT", precision=5, scale=4)
    private BigDecimal aliquotaSAT;
    @Column(name="RVLALIQUOTATERCEIROS", precision=5, scale=4)
    private BigDecimal aliquotaTerceiros;
    @Column(name="RVLINSSPAGOSEGURADO", precision=38, scale=25)
    private BigDecimal valorTotalInssSegurado;
    @Column(name="RVLDEVIDOSEGURADOFINAL", precision=38, scale=25)
    private BigDecimal valorDevidoSeguradoFinal;
    @Column(name="RVLINDICEUTILIZADOTRABALHISTA", precision=38, scale=25)
    private BigDecimal indiceDeCorrecaoTrabalhistaUtilizado;
    @Column(name="RVLINDICEUTILIZADOPREVIDENCIA", precision=38, scale=25)
    private BigDecimal indiceDeCorrecaoPrevidenciariaUtilizado;
    @Column(name="RVLINSSPAGOEMPRESA", precision=38, scale=25)
    private BigDecimal valorTotalInssEmpresa;
    @Column(name="RVLDEVIDOEMPRESAFINAL", precision=38, scale=25)
    private BigDecimal valorDevidoEmpresaFinal;
    @Column(name="RVLDEVIDOSAT", precision=38, scale=25)
    private BigDecimal valorDevidoSAT;
    @Column(name="RVLDEVIDOTERCEIROS", precision=38, scale=25)
    private BigDecimal valorDevidoTerceiros;
    @Column(name="SFLOCORRENCIADECIMOTERCEIRO", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean ocorrenciaDecimoTerceiro = Boolean.FALSE;
    @Column(name="RVLTAXAJUROS", precision=38, scale=25)
    private BigDecimal taxaDeJuros;
    @Column(name="RVLTAXAMULTA", precision=38, scale=25)
    private BigDecimal taxaDeMulta;
    @Transient
    private Boolean selecionada = Boolean.FALSE;
    @Transient
    private Boolean baseVazia = Boolean.TRUE;
    @Transient
    private BigDecimal valorDevidoSeguradoFinalCorrigido = null;
    @Transient
    private BigDecimal valorDevidoEmpresaFinalCorrigido = null;
    @Transient
    private BigDecimal valorDevidoSATCorrigido = null;
    @Transient
    private BigDecimal valorDevidoTerceirosCorrigido = null;

    public OcorrenciaDeInss(Class<? extends RepositorioDeOcorrenciaDeInss<? extends OcorrenciaDeInss>> classeDoRepositorio) {
        super(classeDoRepositorio);
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public Date getDataInicioPeriodo() {
        return this.dataInicioPeriodo;
    }

    public void setDataInicioPeriodo(Date dataInicioPeriodo) {
        this.dataInicioPeriodo = dataInicioPeriodo;
    }

    public Date getDataTerminoPeriodo() {
        return this.dataTerminoPeriodo;
    }

    public void setDataTerminoPeriodo(Date dataTerminoPeriodo) {
        this.dataTerminoPeriodo = dataTerminoPeriodo;
    }

    public Date getDataOcorrenciaInss() {
        return this.dataOcorrenciaInss;
    }

    public void setDataOcorrenciaInss(Date dataOcorrenciaInss) {
        this.dataOcorrenciaInss = dataOcorrenciaInss;
    }

    public BigDecimal getValorBase() {
        return this.valorBase;
    }

    public void setValorBase(BigDecimal valorBase) {
        this.valorBase = valorBase;
    }

    public TipoValorEnum getTipoValorDaBase() {
        return this.tipoValorDaBase;
    }

    public void setTipoValorDaBase(TipoValorEnum tipoValorDaBase) {
        this.tipoValorDaBase = tipoValorDaBase;
    }

    public BigDecimal getAliquotaSegurado() {
        return this.aliquotaSegurado;
    }

    public void setAliquotaSegurado(BigDecimal aliquotaSegurado) {
        this.aliquotaSegurado = aliquotaSegurado;
    }

    public BigDecimal getValorTetoSegurado() {
        return this.valorTetoSegurado;
    }

    public void setValorTetoSegurado(BigDecimal valorTetoSegurado) {
        this.valorTetoSegurado = valorTetoSegurado;
    }

    public BigDecimal getAliquotaEmpresa() {
        return this.aliquotaEmpresa;
    }

    public void setAliquotaEmpresa(BigDecimal aliquotaEmpresa) {
        this.aliquotaEmpresa = aliquotaEmpresa;
    }

    public BigDecimal getValorTetoEmpresa() {
        return this.valorTetoEmpresa;
    }

    public void setValorTetoEmpresa(BigDecimal valorTetoEmpresa) {
        this.valorTetoEmpresa = valorTetoEmpresa;
    }

    public BigDecimal getAliquotaSAT() {
        return this.aliquotaSAT;
    }

    public void setAliquotaSAT(BigDecimal aliquotaSAT) {
        this.aliquotaSAT = aliquotaSAT;
    }

    public BigDecimal getAliquotaTerceiros() {
        return this.aliquotaTerceiros;
    }

    public void setAliquotaTerceiros(BigDecimal aliquotaTerceiros) {
        this.aliquotaTerceiros = aliquotaTerceiros;
    }

    public abstract boolean isJurosEMultaPrevidenciario();

    public BigDecimal getValorTotalInssSegurado() {
        return this.valorTotalInssSegurado;
    }

    public void setValorTotalInssSegurado(BigDecimal valorTotalInssSegurado) {
        this.valorTotalInssSegurado = valorTotalInssSegurado;
    }

    public BigDecimal getValorDevidoSeguradoFinal() {
        return this.valorDevidoSeguradoFinal;
    }

    public BigDecimal getValorDevidoSeguradoFinalCorrigido() {
        if (Utils.nulo(this.valorDevidoSeguradoFinalCorrigido)) {
            return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.getValorDevidoSeguradoFinal());
        }
        return this.valorDevidoSeguradoFinalCorrigido;
    }

    public BigDecimal getJurosValorDevidoSeguradoFinal() {
        BigDecimal juros = Utils.aplicarJuros(this.getTaxaDeJuros(), this.getValorDevidoSeguradoFinalCorrigido());
        if (this.isJurosEMultaPrevidenciario() && Utils.naoNulo(juros)) {
            return juros.setScale(2, RoundingMode.DOWN);
        }
        return juros;
    }

    public BigDecimal getMultaValorDevidoSeguradoFinal() {
        return Utils.aplicarMulta(this.getTaxaDeMulta(), this.getValorDevidoSeguradoFinalCorrigido());
    }

    public BigDecimal getTotalValorDevidoSeguradoFinal() {
        BigDecimal valor = this.getValorDevidoSeguradoFinalCorrigido();
        valor = Utils.somar(valor, this.getJurosValorDevidoSeguradoFinal(), valor);
        valor = Utils.somar(valor, this.getMultaValorDevidoSeguradoFinal(), valor);
        return valor;
    }

    public void setValorDevidoSeguradoFinal(BigDecimal valorDevidoSeguradoFinal) {
        this.valorDevidoSeguradoFinal = valorDevidoSeguradoFinal;
    }

    public BigDecimal getIndiceDeCorrecaoTrabalhistaUtilizado() {
        return this.indiceDeCorrecaoTrabalhistaUtilizado;
    }

    public void setIndiceDeCorrecaoTrabalhistaUtilizado(BigDecimal indiceDeCorrecaoTrabalhistaUtilizado) {
        this.indiceDeCorrecaoTrabalhistaUtilizado = indiceDeCorrecaoTrabalhistaUtilizado;
    }

    public BigDecimal getIndiceDeCorrecaoPrevidenciariaUtilizado() {
        return this.indiceDeCorrecaoPrevidenciariaUtilizado;
    }

    public void setIndiceDeCorrecaoPrevidenciariaUtilizado(BigDecimal indiceDeCorrecaoPrevidenciariaUtilizado) {
        this.indiceDeCorrecaoPrevidenciariaUtilizado = indiceDeCorrecaoPrevidenciariaUtilizado;
    }

    public BigDecimal getValorTotalInssEmpresa() {
        return this.valorTotalInssEmpresa;
    }

    public void setValorTotalInssEmpresa(BigDecimal valorTotalInssEmpresa) {
        this.valorTotalInssEmpresa = valorTotalInssEmpresa;
    }

    public BigDecimal getValorDevidoEmpresaFinal() {
        return this.valorDevidoEmpresaFinal;
    }

    public BigDecimal getIndiceCorrecao() {
        return this.getIndiceDeCorrecaoTrabalhistaUtilizado().multiply(this.getIndiceDeCorrecaoPrevidenciariaUtilizado(), Utils.CONTEXTO_MATEMATICO);
    }

    public BigDecimal getValorDevidoEmpresaFinalCorrigido() {
        if (Utils.nulo(this.valorDevidoEmpresaFinalCorrigido)) {
            return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.getValorDevidoEmpresaFinal());
        }
        return this.valorDevidoEmpresaFinalCorrigido;
    }

    public BigDecimal getJurosValorDevidoEmpresaFinal() {
        BigDecimal juros = Utils.aplicarJuros(this.getTaxaDeJuros(), this.getValorDevidoEmpresaFinalCorrigido());
        if (this.isJurosEMultaPrevidenciario() && Utils.naoNulo(juros)) {
            return juros.setScale(2, RoundingMode.DOWN);
        }
        return juros;
    }

    public BigDecimal getMultaValorDevidoEmpresaFinal() {
        return Utils.aplicarMulta(this.getTaxaDeMulta(), this.getValorDevidoEmpresaFinalCorrigido());
    }

    public BigDecimal getTotalValorDevidoEmpresaFinal() {
        BigDecimal valor = this.getValorDevidoEmpresaFinalCorrigido();
        valor = Utils.somar(valor, this.getJurosValorDevidoEmpresaFinal(), valor);
        valor = Utils.somar(valor, this.getMultaValorDevidoEmpresaFinal(), valor);
        return valor;
    }

    public void setValorDevidoEmpresaFinal(BigDecimal valorDevidoEmpresaFinal) {
        this.valorDevidoEmpresaFinal = valorDevidoEmpresaFinal;
    }

    public BigDecimal getValorDevidoSAT() {
        return this.valorDevidoSAT;
    }

    public BigDecimal getValorDevidoSATCorrigido() {
        if (Utils.nulo(this.valorDevidoSATCorrigido)) {
            return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.getValorDevidoSAT());
        }
        return this.valorDevidoSATCorrigido;
    }

    public BigDecimal getJurosValorDevidoSAT() {
        BigDecimal juros = Utils.aplicarJuros(this.getTaxaDeJuros(), this.getValorDevidoSATCorrigido());
        if (this.isJurosEMultaPrevidenciario() && Utils.naoNulo(juros)) {
            return juros.setScale(2, RoundingMode.DOWN);
        }
        return juros;
    }

    public BigDecimal getMultaValorDevidoSAT() {
        return Utils.aplicarMulta(this.getTaxaDeMulta(), this.getValorDevidoSATCorrigido());
    }

    public BigDecimal getTotalValorDevidoSAT() {
        BigDecimal valor = this.getValorDevidoSATCorrigido();
        valor = Utils.somar(valor, this.getJurosValorDevidoSAT(), valor);
        valor = Utils.somar(valor, this.getMultaValorDevidoSAT(), valor);
        return valor;
    }

    public void setValorDevidoSAT(BigDecimal valorDevidoSAT) {
        this.valorDevidoSAT = valorDevidoSAT;
    }

    public BigDecimal getValorDevidoTerceiros() {
        return this.valorDevidoTerceiros;
    }

    public BigDecimal getValorDevidoTerceirosCorrigido() {
        if (Utils.nulo(this.valorDevidoTerceirosCorrigido)) {
            return Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecao(), this.getValorDevidoTerceiros());
        }
        return this.valorDevidoTerceirosCorrigido;
    }

    public BigDecimal getJurosValorDevidoTerceiros() {
        BigDecimal juros = Utils.aplicarJuros(this.getTaxaDeJuros(), this.getValorDevidoTerceirosCorrigido());
        if (this.isJurosEMultaPrevidenciario() && Utils.naoNulo(juros)) {
            return juros.setScale(2, RoundingMode.DOWN);
        }
        return juros;
    }

    public BigDecimal getMultaValorDevidoTerceiros() {
        return Utils.aplicarMulta(this.getTaxaDeMulta(), this.getValorDevidoTerceirosCorrigido());
    }

    public BigDecimal getTotalValorDevidoTerceiros() {
        BigDecimal valor = this.getValorDevidoTerceirosCorrigido();
        valor = Utils.somar(valor, this.getJurosValorDevidoTerceiros(), valor);
        valor = Utils.somar(valor, this.getMultaValorDevidoTerceiros(), valor);
        return valor;
    }

    public void setValorDevidoTerceiros(BigDecimal valorDevidoTerceiros) {
        this.valorDevidoTerceiros = valorDevidoTerceiros;
    }

    public Boolean getOcorrenciaDecimoTerceiro() {
        return this.ocorrenciaDecimoTerceiro;
    }

    public void setOcorrenciaDecimoTerceiro(Boolean ocorrenciaDecimoTerceiro) {
        this.ocorrenciaDecimoTerceiro = ocorrenciaDecimoTerceiro;
    }

    public BigDecimal getTaxaDeJuros() {
        return this.taxaDeJuros;
    }

    public void setTaxaDeJuros(BigDecimal taxaDeJuros) {
        this.taxaDeJuros = taxaDeJuros;
    }

    public BigDecimal getTaxaDeMulta() {
        return this.taxaDeMulta;
    }

    public void setTaxaDeMulta(BigDecimal taxaDeMulta) {
        this.taxaDeMulta = taxaDeMulta;
    }

    public Boolean getSelecionada() {
        return this.selecionada;
    }

    public void setSelecionada(Boolean selecionada) {
        this.selecionada = selecionada;
    }

    public boolean isValorBaseCalculado() {
        return TipoValorEnum.CALCULADO == this.tipoValorDaBase;
    }

    public boolean isValorBaseInformado() {
        return TipoValorEnum.INFORMADO == this.tipoValorDaBase;
    }

    public boolean isLimitarTetoSegurado() {
        return Utils.naoNulo(this.valorTetoSegurado);
    }

    public boolean isLimitarTetoEmpresa() {
        return Utils.naoNulo(this.valorTetoEmpresa);
    }

    public boolean isRealizarCalculoParaEmpresa() {
        return Utils.naoNulo(this.aliquotaEmpresa);
    }

    public boolean isRealizarCalculoParaSAT() {
        return Utils.naoNulo(this.aliquotaSAT);
    }

    public boolean isRealizarCalculoParaTerceiros() {
        return Utils.naoNulo(this.aliquotaTerceiros);
    }

    public boolean isRealizarCalculoParaSegurado() {
        return Utils.naoNulo(this.aliquotaSegurado);
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    @Override
    public void salvar(boolean flush) {
        super.salvar(flush);
    }

    public Boolean isBaseVazia() {
        return this.baseVazia;
    }

    public void setBaseVazia(Boolean baseVazia) {
        this.baseVazia = baseVazia;
    }

    @Override
    public int compareTo(OcorrenciaDeInss o) {
        return this.getDataOcorrenciaInss().compareTo(o.getDataOcorrenciaInss());
    }

    public void copiarValoresInformadosAnteriormente(OcorrenciaDeInss antiga) {
        if (Utils.nulo(antiga)) {
            return;
        }
        if (antiga.isValorBaseInformado()) {
            this.setValorBase(antiga.getValorBase());
            this.setTipoValorDaBase(antiga.getTipoValorDaBase());
        }
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.dataOcorrenciaInss == null ? 0 : this.dataOcorrenciaInss.hashCode());
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
        OcorrenciaDeInss other = (OcorrenciaDeInss)obj;
        return new EqualsBuilder().appendSuper(super.equals(obj)).append((Object)this.dataInicioPeriodo, (Object)other.dataInicioPeriodo).append((Object)this.dataTerminoPeriodo, (Object)other.dataTerminoPeriodo).append((Object)this.dataOcorrenciaInss, (Object)other.dataOcorrenciaInss).append((Object)this.valorBase, (Object)other.valorBase).append((Object)this.tipoValorDaBase, (Object)other.tipoValorDaBase).append((Object)this.aliquotaSegurado, (Object)other.aliquotaSegurado).append((Object)this.valorTetoSegurado, (Object)other.valorTetoSegurado).append((Object)this.aliquotaEmpresa, (Object)other.aliquotaEmpresa).append((Object)this.valorTetoEmpresa, (Object)other.valorTetoEmpresa).append((Object)this.aliquotaSAT, (Object)other.aliquotaSAT).append((Object)this.aliquotaTerceiros, (Object)other.aliquotaTerceiros).append((Object)this.valorTotalInssSegurado, (Object)other.valorTotalInssSegurado).append((Object)this.valorDevidoSeguradoFinal, (Object)other.valorDevidoSeguradoFinal).append((Object)this.indiceDeCorrecaoTrabalhistaUtilizado, (Object)other.indiceDeCorrecaoTrabalhistaUtilizado).append((Object)this.indiceDeCorrecaoPrevidenciariaUtilizado, (Object)other.indiceDeCorrecaoPrevidenciariaUtilizado).append((Object)this.valorTotalInssEmpresa, (Object)other.valorTotalInssEmpresa).append((Object)this.valorDevidoEmpresaFinal, (Object)other.valorDevidoEmpresaFinal).append((Object)this.valorDevidoSAT, (Object)other.valorDevidoSAT).append((Object)this.valorDevidoTerceiros, (Object)other.valorDevidoTerceiros).append((Object)this.ocorrenciaDecimoTerceiro, (Object)other.ocorrenciaDecimoTerceiro).isEquals();
    }
}

