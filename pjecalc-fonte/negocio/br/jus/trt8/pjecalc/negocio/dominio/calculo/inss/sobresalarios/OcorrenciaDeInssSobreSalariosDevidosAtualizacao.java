/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInssAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInssSobreSalariosDevidosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInssSobreSalariosPagosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisOutrosDebitosReclamado;
import java.math.BigDecimal;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBOCORRINSSSALDEVATUALIZ")
@SequenceGenerator(name="SQOCORRINSSSALDEVATUALIZ", sequenceName="SQOCORRINSSSALDEVATUALIZ", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="ocorrenciaDeInssSobreSalariosDevidosAtualizacao")
public class OcorrenciaDeInssSobreSalariosDevidosAtualizacao
extends OcorrenciaDeInssAtualizacao {
    private static final long serialVersionUID = 671138475821995722L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRINSSSALDEVATUALIZ")
    @Column(name="IIDOCORRENCIAINSS")
    private final Long id = null;
    @ManyToOne
    @JoinColumn(name="IIDINSSSALARIOSDEVIDOS")
    private InssSobreSalariosDevidos inssSobreSalariosDevidos;

    public OcorrenciaDeInssSobreSalariosDevidosAtualizacao() {
        super((Class<? extends RepositorioDeOcorrenciaDeInssAtualizacao<? extends OcorrenciaDeInssAtualizacao>>)RepositorioDeOcorrenciaDeInssSobreSalariosPagosAtualizacao.class);
    }

    public static void salvar(OcorrenciaDeInssSobreSalariosDevidosAtualizacao ocorrenciaAtualizacao) {
        OcorrenciaDeInssSobreSalariosDevidosAtualizacao.getRepositorio(RepositorioDeOcorrenciaDeInssSobreSalariosDevidosAtualizacao.class).salvar(ocorrenciaAtualizacao);
    }

    public OcorrenciaDeInssSobreSalariosDevidosAtualizacao(OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDevidos) {
        this.setInssSobreSalariosDevidos(ocorrenciaDevidos.getInssSobreSalariosDevidos());
        this.setDataInicioPeriodo(ocorrenciaDevidos.getDataInicioPeriodo());
        this.setDataTerminoPeriodo(ocorrenciaDevidos.getDataTerminoPeriodo());
        this.setDataOcorrenciaInss(ocorrenciaDevidos.getDataOcorrenciaInss());
        this.setIndiceCorrecao(ocorrenciaDevidos.getIndiceCorrecao());
        this.setOcorrenciaDecimoTerceiro(ocorrenciaDevidos.getOcorrenciaDecimoTerceiro());
        this.setPago(BigDecimal.ZERO);
        BigDecimal valorDevidoTotal = BigDecimal.ZERO;
        BigDecimal valorDevidoCorrigidoTotal = BigDecimal.ZERO;
        BigDecimal valorJurosTotal = BigDecimal.ZERO;
        BigDecimal valorMultaTotal = BigDecimal.ZERO;
        BigDecimal valorFinalTotal = BigDecimal.ZERO;
        if (Utils.naoNulo(ocorrenciaDevidos.getValorDevidoSeguradoFinal())) {
            valorDevidoTotal = Utils.somar(valorDevidoTotal, ocorrenciaDevidos.getValorDevidoSeguradoFinal());
        }
        if (Utils.naoNulo(ocorrenciaDevidos.getValorDevidoEmpresaFinal())) {
            valorDevidoTotal = Utils.somar(valorDevidoTotal, ocorrenciaDevidos.getValorDevidoEmpresaFinal());
        }
        if (Utils.naoNulo(ocorrenciaDevidos.getValorDevidoSAT())) {
            valorDevidoTotal = Utils.somar(valorDevidoTotal, ocorrenciaDevidos.getValorDevidoSAT());
        }
        if (Utils.naoNulo(ocorrenciaDevidos.getValorDevidoTerceiros())) {
            valorDevidoTotal = Utils.somar(valorDevidoTotal, ocorrenciaDevidos.getValorDevidoTerceiros());
        }
        valorDevidoCorrigidoTotal = Utils.aplicarCorrecaoMonetaria(ocorrenciaDevidos.getIndiceCorrecao(), valorDevidoTotal);
        if (Utils.naoNulo(ocorrenciaDevidos.getJurosValorDevidoSeguradoFinal())) {
            valorJurosTotal = Utils.somar(valorJurosTotal, ocorrenciaDevidos.getJurosValorDevidoSeguradoFinal());
        }
        if (Utils.naoNulo(ocorrenciaDevidos.getJurosValorDevidoEmpresaFinal())) {
            valorJurosTotal = Utils.somar(valorJurosTotal, ocorrenciaDevidos.getJurosValorDevidoEmpresaFinal());
        }
        if (Utils.naoNulo(ocorrenciaDevidos.getJurosValorDevidoSAT())) {
            valorJurosTotal = Utils.somar(valorJurosTotal, ocorrenciaDevidos.getJurosValorDevidoSAT());
        }
        if (Utils.naoNulo(ocorrenciaDevidos.getJurosValorDevidoTerceiros())) {
            valorJurosTotal = Utils.somar(valorJurosTotal, ocorrenciaDevidos.getJurosValorDevidoTerceiros());
        }
        if (this.getInssSobreSalariosDevidos().getInss().getCalculo().isCalculoExterno().booleanValue()) {
            valorJurosTotal = this.atualizarJurosDoCalculoExterno(valorJurosTotal, ocorrenciaDevidos.getOcorrenciaDecimoTerceiro(), ocorrenciaDevidos.getIndiceCorrecao());
        }
        if (Utils.naoNulo(ocorrenciaDevidos.getMultaValorDevidoSeguradoFinal())) {
            valorMultaTotal = Utils.somar(valorMultaTotal, ocorrenciaDevidos.getMultaValorDevidoSeguradoFinal());
        }
        if (Utils.naoNulo(ocorrenciaDevidos.getMultaValorDevidoEmpresaFinal())) {
            valorMultaTotal = Utils.somar(valorMultaTotal, ocorrenciaDevidos.getMultaValorDevidoEmpresaFinal());
        }
        if (Utils.naoNulo(ocorrenciaDevidos.getMultaValorDevidoSAT())) {
            valorMultaTotal = Utils.somar(valorMultaTotal, ocorrenciaDevidos.getMultaValorDevidoSAT());
        }
        if (Utils.naoNulo(ocorrenciaDevidos.getMultaValorDevidoTerceiros())) {
            valorMultaTotal = Utils.somar(valorMultaTotal, ocorrenciaDevidos.getMultaValorDevidoTerceiros());
        }
        valorFinalTotal = Utils.somar(valorDevidoCorrigidoTotal, Utils.somar(valorJurosTotal, valorMultaTotal));
        this.setDevido(Utils.arredondarValorMonetario(valorDevidoTotal));
        this.setDevidoCorrigido(Utils.arredondarValorMonetario(valorDevidoCorrigidoTotal));
        this.setJuros(Utils.arredondarValorMonetario(valorJurosTotal));
        this.setMulta(Utils.arredondarValorMonetario(valorMultaTotal));
        this.setTotal(Utils.arredondarValorMonetario(valorFinalTotal));
        this.setDevidoDiferenca(this.getDevidoCorrigido());
        this.setJurosDiferenca(this.getJuros());
        this.setMultaDiferenca(this.getMulta());
        this.setTotalDiferenca(this.getTotal());
    }

    private BigDecimal atualizarJurosDoCalculoExterno(BigDecimal valorJurosTotal, Boolean decimoTerceiro, BigDecimal indiceCorrecao) {
        Calculo calculo = this.getInssSobreSalariosDevidos().getInss().getCalculo();
        if (Utils.nulo(indiceCorrecao)) {
            indiceCorrecao = BigDecimal.ONE;
        }
        ParcelasAtualizaveisOutrosDebitosReclamado parcelasExternoOutrosDebitosReclamado = ParcelasAtualizaveisOutrosDebitosReclamado.obterDoCalculo(calculo);
        if (calculo.getParametrosDeAtualizacao().getLei11941().booleanValue() && decimoTerceiro.booleanValue()) {
            valorJurosTotal = Utils.somar(valorJurosTotal, Utils.aplicarCorrecaoMonetaria(indiceCorrecao, parcelasExternoOutrosDebitosReclamado.getValorJurosAposFev2009ContribSocialPatronal()), valorJurosTotal);
            valorJurosTotal = Utils.somar(valorJurosTotal, Utils.aplicarCorrecaoMonetaria(indiceCorrecao, parcelasExternoOutrosDebitosReclamado.getValorJurosAposFev2009ContribSocialSegurado()), valorJurosTotal);
        } else if (calculo.getParametrosDeAtualizacao().getLei11941().booleanValue() && !decimoTerceiro.booleanValue()) {
            valorJurosTotal = Utils.somar(valorJurosTotal, Utils.aplicarCorrecaoMonetaria(indiceCorrecao, parcelasExternoOutrosDebitosReclamado.getValorJurosAteFev2009ContribSocialPatronal()), valorJurosTotal);
            valorJurosTotal = Utils.somar(valorJurosTotal, Utils.aplicarCorrecaoMonetaria(indiceCorrecao, parcelasExternoOutrosDebitosReclamado.getValorJurosAteFev2009ContribSocialSegurado()), valorJurosTotal);
        } else if (!decimoTerceiro.booleanValue()) {
            valorJurosTotal = Utils.somar(valorJurosTotal, Utils.aplicarCorrecaoMonetaria(indiceCorrecao, parcelasExternoOutrosDebitosReclamado.getValorJurosContribSocialPatronal()), valorJurosTotal);
            valorJurosTotal = Utils.somar(valorJurosTotal, Utils.aplicarCorrecaoMonetaria(indiceCorrecao, parcelasExternoOutrosDebitosReclamado.getValorJurosContribSocialSegurado()), valorJurosTotal);
        }
        return valorJurosTotal;
    }

    public OcorrenciaDeInssSobreSalariosDevidosAtualizacao(OcorrenciaDeInssSobreSalariosDevidos ocorrenciaDevidos, OcorrenciaDeInssSobreSalariosDevidosAtualizacao ultimaAmortizada) {
        BigDecimal valorMultaTotal;
        this.setInssSobreSalariosDevidos(ocorrenciaDevidos.getInssSobreSalariosDevidos());
        this.setDataInicioPeriodo(ocorrenciaDevidos.getDataInicioPeriodo());
        this.setDataTerminoPeriodo(ocorrenciaDevidos.getDataTerminoPeriodo());
        this.setDataOcorrenciaInss(ocorrenciaDevidos.getDataOcorrenciaInss());
        this.setIndiceCorrecao(ocorrenciaDevidos.getIndiceCorrecao());
        this.setOcorrenciaDecimoTerceiro(ocorrenciaDevidos.getOcorrenciaDecimoTerceiro());
        this.setPago(BigDecimal.ZERO);
        BigDecimal valorDevidoTotal = ultimaAmortizada.getDevidoDiferenca();
        BigDecimal valorDevidoCorrigidoTotal = Utils.aplicarCorrecaoMonetaria(ocorrenciaDevidos.getIndiceCorrecao(), valorDevidoTotal);
        BigDecimal valorJurosTotal = Utils.aplicarJuros(ocorrenciaDevidos.getTaxaDeJuros(), valorDevidoCorrigidoTotal);
        if (Utils.nulo(valorJurosTotal)) {
            valorJurosTotal = BigDecimal.ZERO;
        }
        if (this.getInssSobreSalariosDevidos().getInss().getCalculo().isCalculoExterno().booleanValue()) {
            valorJurosTotal = Utils.somar(valorJurosTotal, ultimaAmortizada.getJurosDiferenca(), valorJurosTotal);
        }
        if (Utils.nulo(valorMultaTotal = Utils.aplicarMulta(ocorrenciaDevidos.getTaxaDeMulta(), valorDevidoCorrigidoTotal))) {
            valorMultaTotal = BigDecimal.ZERO;
        }
        BigDecimal valorFinalTotal = BigDecimal.ZERO;
        valorFinalTotal = Utils.somar(valorFinalTotal, valorDevidoCorrigidoTotal, valorFinalTotal);
        valorFinalTotal = Utils.somar(valorFinalTotal, valorJurosTotal, valorFinalTotal);
        valorFinalTotal = Utils.somar(valorFinalTotal, valorMultaTotal, valorFinalTotal);
        this.setDevido(Utils.arredondarValorMonetario(valorDevidoTotal));
        this.setDevidoCorrigido(Utils.arredondarValorMonetario(valorDevidoCorrigidoTotal));
        this.setJuros(Utils.arredondarValorMonetario(valorJurosTotal));
        this.setMulta(Utils.arredondarValorMonetario(valorMultaTotal));
        this.setTotal(Utils.arredondarValorMonetario(valorFinalTotal));
        this.setDevidoDiferenca(this.getDevidoCorrigido());
        this.setJurosDiferenca(this.getJuros());
        this.setMultaDiferenca(this.getMulta());
        this.setTotalDiferenca(this.getTotal());
    }

    public Long getId() {
        return this.id;
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
        OcorrenciaDeInssSobreSalariosDevidosAtualizacao other = (OcorrenciaDeInssSobreSalariosDevidosAtualizacao)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }
}

