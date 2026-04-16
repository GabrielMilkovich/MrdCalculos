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
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculoexterno;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.IndiceMonetarioEnum;
import br.jus.trt8.pjecalc.negocio.dominio.assuntocnj.AssuntoCnj;
import br.jus.trt8.pjecalc.negocio.dominio.assuntocnj.RepositorioDeAssuntoCnj;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCustas;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisDescontoCreditosReclamanteUtils;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorario;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.RepositorioDeParcelasAtualizaveisDescontoCreditosReclamante;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Transient;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBPARCEATUALIZDESCCREDRMTE")
@SequenceGenerator(name="SQPARCEATUALIZDESCCREDRMTE", sequenceName="SQPARCEATUALIZDESCCREDRMTE", allocationSize=1)
@Name(value="parcelasAtualizaveisDescontoCreditosReclamante")
public class ParcelasAtualizaveisDescontoCreditosReclamante
extends EntidadeBase {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQPARCEATUALIZDESCCREDRMTE")
    @Column(name="IIDPARCEATUALIZDESCCREDRMTE")
    private Long id = null;
    @OneToOne
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculoExterno;
    @Column(name="SFLCONTRIBSOCIALSEGURADO", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarContribSocialSegurado = false;
    @Column(name="MVLPARCELACONTRIBSOCSEGUR", precision=19, scale=2)
    private BigDecimal valorParcelaContribSocialSegurado;
    @Column(name="SFLCORRIGIRDESCONTORECLAMANTE", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean corrigirDescontoReclamante = false;
    @Column(name="SFLPREVIDENCIAPRIVADA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarPrevidenciaPrivada = false;
    @Column(name="MVLPARCELAPREVIDPRIV", precision=19, scale=2)
    private BigDecimal valorParcelaPrevidenciaPrivada;
    @Column(name="STPINDICETRABALHISTAPREVIDPRIV", columnDefinition="VARCHAR2(12)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="IndiceMonetarioEnum")})
    private IndiceMonetarioEnum indiceTrabalhistaPrevidenciaPrivada = IndiceMonetarioEnum.INDICE_TRABALHISTA;
    @Column(name="SFLPENSAOALIMENTICIA", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarPensaoAlimenticia = false;
    @Column(name="MVLALIQUOTAPENSALIMENT", precision=38, scale=25)
    private BigDecimal aliquotaPensaoAlimenticia;
    @Column(name="SFLAPLICARJUROSPENSALIMENT", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean aplicarJurosPensaoAlimenticia = false;
    @Column(name="MVLPRINCTRIBPENSALIMENT", precision=38, scale=25)
    private BigDecimal percPrincipalTributavelPensaoAlimenticia;
    @Column(name="MVLPRINCNAOTRIBPENSALIMENT", precision=38, scale=25)
    private BigDecimal percPrincipalNaoTributavelPensaoAlimenticia;
    @Column(name="SFLPRINCTRIBPENSALIMENT", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean incidirSobrePrincipalTributavelPensaoAlimenticia = true;
    @Column(name="SFLPRINCNAOTRIBPENSALIMENT", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean incidirSobrePrincipalNaoTributavelPensaoAlimenticia = false;
    @Column(name="SFLAFGTSPENSALIMENT", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean incidirSobreFgtsPensaoAlimenticia = false;
    @Column(name="SFLMULTAPENSALIMENT", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean incidirSobreMultaPensaoAlimenticia = false;
    @Column(name="SFLMULTAINDENIZTERCRMTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarMultaIndenizTerceiroReclamante = false;
    @Transient
    private ParcelasAtualizaveisMultaIndenizacao multaIndenizTerceiroReclamante = new ParcelasAtualizaveisMultaIndenizacao();
    @OneToMany(mappedBy="descontoCreditosReclamante", cascade={CascadeType.ALL})
    private List<ParcelasAtualizaveisMultaIndenizacao> listaMultasIndenizTerceiroReclamante = new ArrayList<ParcelasAtualizaveisMultaIndenizacao>();
    @Column(name="SFLHONORARIOSDEVRMTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarHonorariosDevReclamante = false;
    @Transient
    private ParcelasAtualizaveisHonorario honorariosDevReclamante = new ParcelasAtualizaveisHonorario();
    @OneToMany(mappedBy="descontoCreditosReclamante", cascade={CascadeType.ALL})
    private List<ParcelasAtualizaveisHonorario> listaHonorariosDevReclamante = new ArrayList<ParcelasAtualizaveisHonorario>();
    @Column(name="SFLCUSTASCONHECIMDEVRMTE", columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean marcarCustasConhecimentoReclamante = false;
    @ManyToOne(cascade={CascadeType.ALL})
    @JoinColumn(name="IIDCUSTASCONHECIMDEVRMTE")
    private ParcelasAtualizaveisCustas custasConhecimentoReclamante = new ParcelasAtualizaveisCustas(Utils.VALOR_DOIS);

    public ParcelasAtualizaveisDescontoCreditosReclamante() {
        super(RepositorioDeParcelasAtualizaveisDescontoCreditosReclamante.class);
    }

    public ParcelasAtualizaveisDescontoCreditosReclamante(Calculo calculoExterno) {
        this();
        this.calculoExterno = calculoExterno;
    }

    @Override
    public void salvar(boolean flush) {
        super.salvar(flush);
    }

    public static ParcelasAtualizaveisDescontoCreditosReclamante obterDoCalculo(Calculo calculo) {
        return ParcelasAtualizaveisDescontoCreditosReclamante.getRepositorio(RepositorioDeParcelasAtualizaveisDescontoCreditosReclamante.class).obterDoCalculo(calculo);
    }

    protected AssuntoCnj obterAssuntoCnjParaVerbas() {
        return ParcelasAtualizaveisDescontoCreditosReclamante.getRepositorio(RepositorioDeAssuntoCnj.class).obterRaiz();
    }

    public void consistirDados() {
        ParcelasAtualizaveisDescontoCreditosReclamanteUtils.consistirDados(this);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Boolean getMarcarContribSocialSegurado() {
        return this.marcarContribSocialSegurado;
    }

    public void setMarcarContribSocialSegurado(Boolean marcarContribSocialSegurado) {
        this.marcarContribSocialSegurado = marcarContribSocialSegurado;
    }

    public Boolean getCorrigirDescontoReclamante() {
        return this.corrigirDescontoReclamante;
    }

    public void setCorrigirDescontoReclamante(Boolean corrigirDescontoReclamante) {
        this.corrigirDescontoReclamante = corrigirDescontoReclamante;
    }

    public Boolean getMarcarPrevidenciaPrivada() {
        return this.marcarPrevidenciaPrivada;
    }

    public void setMarcarPrevidenciaPrivada(Boolean marcarPrevidenciaPrivada) {
        this.marcarPrevidenciaPrivada = marcarPrevidenciaPrivada;
    }

    public Boolean getMarcarPensaoAlimenticia() {
        return this.marcarPensaoAlimenticia;
    }

    public void setMarcarPensaoAlimenticia(Boolean marcarPensaoAlimenticia) {
        this.marcarPensaoAlimenticia = marcarPensaoAlimenticia;
    }

    public Boolean getMarcarMultaIndenizTerceiroReclamante() {
        return this.marcarMultaIndenizTerceiroReclamante;
    }

    public void setMarcarMultaIndenizTerceiroReclamante(Boolean marcarMultaIndenizTerceiroReclamante) {
        this.marcarMultaIndenizTerceiroReclamante = marcarMultaIndenizTerceiroReclamante;
    }

    public Boolean getMarcarHonorariosDevReclamante() {
        return this.marcarHonorariosDevReclamante;
    }

    public void setMarcarHonorariosDevReclamante(Boolean marcarHonorariosDevReclamante) {
        this.marcarHonorariosDevReclamante = marcarHonorariosDevReclamante;
    }

    public Boolean getMarcarCustasConhecimentoReclamante() {
        return this.marcarCustasConhecimentoReclamante;
    }

    public void setMarcarCustasConhecimentoReclamante(Boolean marcarCustasConhecimentoReclamante) {
        this.marcarCustasConhecimentoReclamante = marcarCustasConhecimentoReclamante;
    }

    public ParcelasAtualizaveisMultaIndenizacao getMultaIndenizTerceiroReclamante() {
        return this.multaIndenizTerceiroReclamante;
    }

    public void setMultaIndenizTerceiroReclamante(ParcelasAtualizaveisMultaIndenizacao multaIndenizTerceiroReclamante) {
        this.multaIndenizTerceiroReclamante = multaIndenizTerceiroReclamante;
    }

    public List<ParcelasAtualizaveisMultaIndenizacao> getListaMultasIndenizTerceiroReclamante() {
        return this.listaMultasIndenizTerceiroReclamante;
    }

    public void setListaMultasIndenizTerceiroReclamante(List<ParcelasAtualizaveisMultaIndenizacao> listaMultasIndenizTerceiroReclamante) {
        this.listaMultasIndenizTerceiroReclamante = listaMultasIndenizTerceiroReclamante;
    }

    public ParcelasAtualizaveisHonorario getHonorariosDevReclamante() {
        return this.honorariosDevReclamante;
    }

    public void setHonorariosDevReclamante(ParcelasAtualizaveisHonorario honorariosDevReclamante) {
        this.honorariosDevReclamante = honorariosDevReclamante;
    }

    public List<ParcelasAtualizaveisHonorario> getListaHonorariosDevReclamante() {
        return this.listaHonorariosDevReclamante;
    }

    public void setListaHonorariosDevReclamante(List<ParcelasAtualizaveisHonorario> listaHonorariosDevReclamante) {
        this.listaHonorariosDevReclamante = listaHonorariosDevReclamante;
    }

    public ParcelasAtualizaveisCustas getCustasConhecimentoReclamante() {
        return this.custasConhecimentoReclamante;
    }

    public void setCustasConhecimentoReclamante(ParcelasAtualizaveisCustas custasConhecimentoReclamante) {
        this.custasConhecimentoReclamante = custasConhecimentoReclamante;
    }

    public BigDecimal getValorParcelaContribSocialSegurado() {
        return this.valorParcelaContribSocialSegurado != null ? this.valorParcelaContribSocialSegurado : BigDecimal.ZERO;
    }

    public void setValorParcelaContribSocialSegurado(BigDecimal valorParcelaContribSocialSegurado) {
        this.valorParcelaContribSocialSegurado = valorParcelaContribSocialSegurado;
    }

    public BigDecimal getValorParcelaPrevidenciaPrivada() {
        return this.valorParcelaPrevidenciaPrivada;
    }

    public void setValorParcelaPrevidenciaPrivada(BigDecimal valorParcelaPrevidenciaPrivada) {
        this.valorParcelaPrevidenciaPrivada = valorParcelaPrevidenciaPrivada;
    }

    public IndiceMonetarioEnum getIndiceTrabalhistaPrevidenciaPrivada() {
        return this.indiceTrabalhistaPrevidenciaPrivada;
    }

    public void setIndiceTrabalhistaPrevidenciaPrivada(IndiceMonetarioEnum indiceTrabalhistaPrevidenciaPrivada) {
        this.indiceTrabalhistaPrevidenciaPrivada = indiceTrabalhistaPrevidenciaPrivada;
    }

    public BigDecimal getAliquotaPensaoAlimenticia() {
        return this.aliquotaPensaoAlimenticia;
    }

    public void setAliquotaPensaoAlimenticia(BigDecimal aliquotaPensaoAlimenticia) {
        this.aliquotaPensaoAlimenticia = aliquotaPensaoAlimenticia;
    }

    public Boolean getAplicarJurosPensaoAlimenticia() {
        return this.aplicarJurosPensaoAlimenticia;
    }

    public void setAplicarJurosPensaoAlimenticia(Boolean aplicarJurosPensaoAlimenticia) {
        this.aplicarJurosPensaoAlimenticia = aplicarJurosPensaoAlimenticia;
    }

    public BigDecimal getPercPrincipalTributavelPensaoAlimenticia() {
        return this.percPrincipalTributavelPensaoAlimenticia;
    }

    public void setPercPrincipalTributavelPensaoAlimenticia(BigDecimal percPrincipalTributavelPensaoAlimenticia) {
        this.percPrincipalTributavelPensaoAlimenticia = percPrincipalTributavelPensaoAlimenticia;
    }

    public BigDecimal getPercPrincipalNaoTributavelPensaoAlimenticia() {
        return this.percPrincipalNaoTributavelPensaoAlimenticia;
    }

    public void setPercPrincipalNaoTributavelPensaoAlimenticia(BigDecimal percPrincipalNaoTributavelPensaoAlimenticia) {
        this.percPrincipalNaoTributavelPensaoAlimenticia = percPrincipalNaoTributavelPensaoAlimenticia;
    }

    public Boolean getIncidirSobrePrincipalTributavelPensaoAlimenticia() {
        return this.incidirSobrePrincipalTributavelPensaoAlimenticia;
    }

    public void setIncidirSobrePrincipalTributavelPensaoAlimenticia(Boolean incidirSobrePrincipalTributavelPensaoAlimenticia) {
        this.incidirSobrePrincipalTributavelPensaoAlimenticia = incidirSobrePrincipalTributavelPensaoAlimenticia;
    }

    public Boolean getIncidirSobrePrincipalNaoTributavelPensaoAlimenticia() {
        return this.incidirSobrePrincipalNaoTributavelPensaoAlimenticia;
    }

    public void setIncidirSobrePrincipalNaoTributavelPensaoAlimenticia(Boolean incidirSobrePrincipalNaoTributavelPensaoAlimenticia) {
        this.incidirSobrePrincipalNaoTributavelPensaoAlimenticia = incidirSobrePrincipalNaoTributavelPensaoAlimenticia;
    }

    public Boolean getIncidirSobreFgtsPensaoAlimenticia() {
        return this.incidirSobreFgtsPensaoAlimenticia;
    }

    public void setIncidirSobreFgtsPensaoAlimenticia(Boolean incidirSobreFgtsPensaoAlimenticia) {
        this.incidirSobreFgtsPensaoAlimenticia = incidirSobreFgtsPensaoAlimenticia;
    }

    public Boolean getIncidirSobreMultaPensaoAlimenticia() {
        return this.incidirSobreMultaPensaoAlimenticia;
    }

    public void setIncidirSobreMultaPensaoAlimenticia(Boolean incidirSobreMultaPensaoAlimenticia) {
        this.incidirSobreMultaPensaoAlimenticia = incidirSobreMultaPensaoAlimenticia;
    }

    public Calculo getCalculoExterno() {
        return this.calculoExterno;
    }

    public void setCalculoExterno(Calculo calculoExterno) {
        this.calculoExterno = calculoExterno;
    }

    public Long getId() {
        return this.id;
    }

    public List<ParcelasAtualizaveisMultaIndenizacao> getListaMultasIndenizTerceiroReclamanteClone() {
        ArrayList<ParcelasAtualizaveisMultaIndenizacao> novaLista = new ArrayList<ParcelasAtualizaveisMultaIndenizacao>();
        for (ParcelasAtualizaveisMultaIndenizacao multa : this.listaMultasIndenizTerceiroReclamante) {
            novaLista.add(multa.clonar());
        }
        return novaLista;
    }

    public List<ParcelasAtualizaveisHonorario> getListaHonorariosDevReclamanteClone() {
        ArrayList<ParcelasAtualizaveisHonorario> novaLista = new ArrayList<ParcelasAtualizaveisHonorario>();
        for (ParcelasAtualizaveisHonorario honorario : this.listaHonorariosDevReclamante) {
            novaLista.add(honorario.clonar());
        }
        return novaLista;
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
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
        ParcelasAtualizaveisDescontoCreditosReclamante other = (ParcelasAtualizaveisDescontoCreditosReclamante)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }
}

