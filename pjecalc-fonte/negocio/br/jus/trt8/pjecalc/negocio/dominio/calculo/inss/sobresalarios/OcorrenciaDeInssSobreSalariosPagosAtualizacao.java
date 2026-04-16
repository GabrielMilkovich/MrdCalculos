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
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInssAtualizacao;
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
@Table(name="TBOCORRINSSSALPAGATUALIZ")
@SequenceGenerator(name="SQOCORRINSSSALPAGATUALIZ", sequenceName="SQOCORRINSSSALPAGATUALIZ", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="ocorrenciaDeInssSobreSalariosPagosAtualizacao")
public class OcorrenciaDeInssSobreSalariosPagosAtualizacao
extends OcorrenciaDeInssAtualizacao {
    private static final long serialVersionUID = 671138475821995722L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRINSSSALPAGATUALIZ")
    @Column(name="IIDOCORRENCIAINSS")
    private final Long id = null;
    @ManyToOne
    @JoinColumn(name="IIDINSSSALARIOSPAGOS")
    private InssSobreSalariosPagos inssSobreSalariosPagos;

    public OcorrenciaDeInssSobreSalariosPagosAtualizacao() {
        super((Class<? extends RepositorioDeOcorrenciaDeInssAtualizacao<? extends OcorrenciaDeInssAtualizacao>>)RepositorioDeOcorrenciaDeInssSobreSalariosPagosAtualizacao.class);
    }

    public static void salvar(OcorrenciaDeInssSobreSalariosPagosAtualizacao ocorrenciaAtualizacao) {
        OcorrenciaDeInssSobreSalariosPagosAtualizacao.getRepositorio(RepositorioDeOcorrenciaDeInssSobreSalariosPagosAtualizacao.class).salvar(ocorrenciaAtualizacao);
    }

    public OcorrenciaDeInssSobreSalariosPagosAtualizacao(OcorrenciaDeInssSobreSalariosPagos ocorrenciaPagos) {
        this.setInssSobreSalariosPagos(ocorrenciaPagos.getInssSobreSalariosPagos());
        this.setDataInicioPeriodo(ocorrenciaPagos.getDataInicioPeriodo());
        this.setDataTerminoPeriodo(ocorrenciaPagos.getDataTerminoPeriodo());
        this.setDataOcorrenciaInss(ocorrenciaPagos.getDataOcorrenciaInss());
        this.setIndiceCorrecao(ocorrenciaPagos.getIndiceCorrecao());
        this.setOcorrenciaDecimoTerceiro(ocorrenciaPagos.getOcorrenciaDecimoTerceiro());
        this.setPago(BigDecimal.ZERO);
        BigDecimal valorDevidoTotal = BigDecimal.ZERO;
        BigDecimal valorDevidoCorrigidoTotal = BigDecimal.ZERO;
        BigDecimal valorJurosTotal = BigDecimal.ZERO;
        BigDecimal valorMultaTotal = BigDecimal.ZERO;
        BigDecimal valorFinalTotal = BigDecimal.ZERO;
        if (Utils.naoNulo(ocorrenciaPagos.getValorDevidoSeguradoFinal())) {
            valorDevidoTotal = Utils.somar(valorDevidoTotal, ocorrenciaPagos.getValorDevidoSeguradoFinal());
        }
        if (Utils.naoNulo(ocorrenciaPagos.getValorDevidoEmpresaFinal())) {
            valorDevidoTotal = Utils.somar(valorDevidoTotal, ocorrenciaPagos.getValorDevidoEmpresaFinal());
        }
        if (Utils.naoNulo(ocorrenciaPagos.getValorDevidoSAT())) {
            valorDevidoTotal = Utils.somar(valorDevidoTotal, ocorrenciaPagos.getValorDevidoSAT());
        }
        if (Utils.naoNulo(ocorrenciaPagos.getValorDevidoTerceiros())) {
            valorDevidoTotal = Utils.somar(valorDevidoTotal, ocorrenciaPagos.getValorDevidoTerceiros());
        }
        valorDevidoCorrigidoTotal = Utils.aplicarCorrecaoMonetaria(ocorrenciaPagos.getIndiceCorrecao(), valorDevidoTotal);
        if (Utils.naoNulo(ocorrenciaPagos.getJurosValorDevidoSeguradoFinal())) {
            valorJurosTotal = Utils.somar(valorJurosTotal, ocorrenciaPagos.getJurosValorDevidoSeguradoFinal());
        }
        if (Utils.naoNulo(ocorrenciaPagos.getJurosValorDevidoEmpresaFinal())) {
            valorJurosTotal = Utils.somar(valorJurosTotal, ocorrenciaPagos.getJurosValorDevidoEmpresaFinal());
        }
        if (Utils.naoNulo(ocorrenciaPagos.getJurosValorDevidoSAT())) {
            valorJurosTotal = Utils.somar(valorJurosTotal, ocorrenciaPagos.getJurosValorDevidoSAT());
        }
        if (Utils.naoNulo(ocorrenciaPagos.getJurosValorDevidoTerceiros())) {
            valorJurosTotal = Utils.somar(valorJurosTotal, ocorrenciaPagos.getJurosValorDevidoTerceiros());
        }
        if (this.getInssSobreSalariosPagos().getInss().getCalculo().isCalculoExterno().booleanValue()) {
            valorJurosTotal = this.atualizarJurosDoCalculoExterno(valorJurosTotal, ocorrenciaPagos.getOcorrenciaDecimoTerceiro(), ocorrenciaPagos.getIndiceCorrecao());
        }
        if (Utils.naoNulo(ocorrenciaPagos.getMultaValorDevidoSeguradoFinal())) {
            valorMultaTotal = Utils.somar(valorMultaTotal, ocorrenciaPagos.getMultaValorDevidoSeguradoFinal());
        }
        if (Utils.naoNulo(ocorrenciaPagos.getMultaValorDevidoEmpresaFinal())) {
            valorMultaTotal = Utils.somar(valorMultaTotal, ocorrenciaPagos.getMultaValorDevidoEmpresaFinal());
        }
        if (Utils.naoNulo(ocorrenciaPagos.getMultaValorDevidoSAT())) {
            valorMultaTotal = Utils.somar(valorMultaTotal, ocorrenciaPagos.getMultaValorDevidoSAT());
        }
        if (Utils.naoNulo(ocorrenciaPagos.getMultaValorDevidoTerceiros())) {
            valorMultaTotal = Utils.somar(valorMultaTotal, ocorrenciaPagos.getMultaValorDevidoTerceiros());
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
        Calculo calculo = this.getInssSobreSalariosPagos().getInss().getCalculo();
        if (Utils.nulo(indiceCorrecao)) {
            indiceCorrecao = BigDecimal.ONE;
        }
        ParcelasAtualizaveisOutrosDebitosReclamado parcelasExternoOutrosDebitosReclamado = ParcelasAtualizaveisOutrosDebitosReclamado.obterDoCalculo(calculo);
        if (calculo.getParametrosDeAtualizacao().getLei11941Pago().booleanValue() && decimoTerceiro.booleanValue()) {
            valorJurosTotal = Utils.somar(valorJurosTotal, Utils.aplicarCorrecaoMonetaria(indiceCorrecao, parcelasExternoOutrosDebitosReclamado.getValorJurosAposFev2009ContribSocialPagos()), valorJurosTotal);
        } else if (calculo.getParametrosDeAtualizacao().getLei11941Pago().booleanValue() && !decimoTerceiro.booleanValue()) {
            valorJurosTotal = Utils.somar(valorJurosTotal, Utils.aplicarCorrecaoMonetaria(indiceCorrecao, parcelasExternoOutrosDebitosReclamado.getValorJurosAteFev2009ContribSocialPagos()), valorJurosTotal);
        } else if (!decimoTerceiro.booleanValue()) {
            valorJurosTotal = Utils.somar(valorJurosTotal, Utils.aplicarCorrecaoMonetaria(indiceCorrecao, parcelasExternoOutrosDebitosReclamado.getValorJurosContribSocialPagos()), valorJurosTotal);
        }
        return valorJurosTotal;
    }

    public OcorrenciaDeInssSobreSalariosPagosAtualizacao(OcorrenciaDeInssSobreSalariosPagos ocorrenciaPagos, OcorrenciaDeInssSobreSalariosPagosAtualizacao ultimaAmortizada) {
        BigDecimal valorMultaTotal;
        this.setInssSobreSalariosPagos(ocorrenciaPagos.getInssSobreSalariosPagos());
        this.setDataInicioPeriodo(ocorrenciaPagos.getDataInicioPeriodo());
        this.setDataTerminoPeriodo(ocorrenciaPagos.getDataTerminoPeriodo());
        this.setDataOcorrenciaInss(ocorrenciaPagos.getDataOcorrenciaInss());
        this.setIndiceCorrecao(ocorrenciaPagos.getIndiceCorrecao());
        this.setOcorrenciaDecimoTerceiro(ocorrenciaPagos.getOcorrenciaDecimoTerceiro());
        this.setPago(BigDecimal.ZERO);
        BigDecimal valorDevidoTotal = ultimaAmortizada.getDevidoDiferenca();
        BigDecimal valorDevidoCorrigidoTotal = Utils.aplicarCorrecaoMonetaria(ocorrenciaPagos.getIndiceCorrecao(), valorDevidoTotal);
        BigDecimal valorJurosTotal = Utils.aplicarJuros(ocorrenciaPagos.getTaxaDeJuros(), valorDevidoCorrigidoTotal);
        if (Utils.nulo(valorJurosTotal)) {
            valorJurosTotal = BigDecimal.ZERO;
        }
        if (this.getInssSobreSalariosPagos().getInss().getCalculo().isCalculoExterno().booleanValue()) {
            valorJurosTotal = Utils.somar(valorJurosTotal, ultimaAmortizada.getJurosDiferenca(), valorJurosTotal);
        }
        if (Utils.nulo(valorMultaTotal = Utils.aplicarMulta(ocorrenciaPagos.getTaxaDeMulta(), valorDevidoCorrigidoTotal))) {
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

    public InssSobreSalariosPagos getInssSobreSalariosPagos() {
        return this.inssSobreSalariosPagos;
    }

    public void setInssSobreSalariosPagos(InssSobreSalariosPagos inssSobreSalariosPagos) {
        this.inssSobreSalariosPagos = inssSobreSalariosPagos;
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
        OcorrenciaDeInssSobreSalariosPagosAtualizacao other = (OcorrenciaDeInssSobreSalariosPagosAtualizacao)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }
}

