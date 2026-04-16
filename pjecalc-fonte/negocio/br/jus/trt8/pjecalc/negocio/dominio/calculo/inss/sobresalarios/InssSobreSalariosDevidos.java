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
 *  javax.persistence.OneToMany
 *  javax.persistence.OrderBy
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  org.hibernate.annotations.Type
 *  org.hibernate.annotations.Where
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.comum.Total;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalarios;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSalarioDevidoOptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosDevidosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaInssUnique;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeInssSobreSalarios;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeInssSobreSalariosDevidos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInssSobreSalariosDevidosAtualizacao;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.OrderBy;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Transient;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.Where;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBINSSSALARIOSDEVIDOS")
@SequenceGenerator(name="SQINSSSALARIOSDEVIDOS", sequenceName="SQINSSSALARIOSDEVIDOS", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="inssSobreSalariosDevidos")
public class InssSobreSalariosDevidos
extends InssSobreSalarios {
    private static final long serialVersionUID = 110224463212224137L;
    private static final String DISCRIMINADOR = "DEVIDOS";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQINSSSALARIOSDEVIDOS")
    @Column(name="IIDINSSSALARIOSDEVIDOS")
    private final Long id = null;
    @Column(name="SFLAPURARINSSSEGURADO", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean apurarInssSegurado = true;
    @Column(name="SFLCOBRARINSSRECLAMANTE", nullable=false, columnDefinition="VARCHAR2(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean cobrarInssDoReclamante = true;
    @Column(name="SFLCORRIGIRDESCONTORECLAMANTE", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    private Boolean corrigirDescontoReclamante = false;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="inssSobreSalariosDevidos")
    @Where(clause="IIDOCORRENCIAINSSORIGINAL IS NOT NULL")
    @OrderBy(value="dataOcorrenciaInss, ocorrenciaDecimoTerceiro")
    private Set<OcorrenciaDeInssSobreSalariosDevidos> ocorrencias;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="inssSobreSalariosDevidos")
    @OrderBy(value="dataOcorrenciaInss, ocorrenciaDecimoTerceiro")
    private Set<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> ocorrenciasAtualizacao;
    @Transient
    private Set<OcorrenciaDeInssSobreSalariosDevidos> ocorrenciasComValorDaVerba = new LinkedHashSet<OcorrenciaDeInssSobreSalariosDevidos>();

    public InssSobreSalariosDevidos() {
        super((Class<? extends RepositorioDeInssSobreSalarios<? extends InssSobreSalarios>>)RepositorioDeInssSobreSalariosDevidos.class);
    }

    public InssSobreSalariosDevidos(Inss inss) {
        this();
        this.setInss(inss);
    }

    public static List<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> obterUltimasOcorrenciasNaoAmortizadas(InssSobreSalariosDevidos inssSobreSalariosDevidos) {
        return InssSobreSalariosDevidos.getRepositorio(RepositorioDeOcorrenciaDeInssSobreSalariosDevidosAtualizacao.class).getUltimasOcorrenciasNaoAmortizadas(inssSobreSalariosDevidos);
    }

    public List<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> obterOcorrenciasNaoAmortizadasPor(InssSobreSalariosDevidos inssSobreSalariosDevidos, Date dataEvento) {
        return InssSobreSalariosDevidos.getRepositorio(RepositorioDeInssSobreSalariosDevidos.class).obterOcorrenciasAtualizacaoNaoAmortizadasPor(inssSobreSalariosDevidos, dataEvento);
    }

    public List<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> obterOcorrenciasTodasPor(InssSobreSalariosDevidos inssSobreSalariosDevidos, Date dataEvento) {
        return InssSobreSalariosDevidos.getRepositorio(RepositorioDeInssSobreSalariosDevidos.class).obterOcorrenciasAtualizacaoTodasPor(inssSobreSalariosDevidos, dataEvento);
    }

    public void removerDeOcorrenciasAtualizacao() {
        InssSobreSalariosDevidos.getRepositorio(RepositorioDeInssSobreSalariosDevidos.class).removerDeOcorrenciasAtualizacao(this);
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Boolean getApurarInssSegurado() {
        return this.apurarInssSegurado;
    }

    public void setApurarInssSegurado(Boolean apurarInssSegurado) {
        this.apurarInssSegurado = apurarInssSegurado;
    }

    public Boolean getCobrarInssDoReclamante() {
        return this.cobrarInssDoReclamante;
    }

    public void setCobrarInssDoReclamante(Boolean cobrarInssDoReclamante) {
        this.cobrarInssDoReclamante = cobrarInssDoReclamante;
    }

    public Boolean getCorrigirDescontoReclamante() {
        return this.corrigirDescontoReclamante;
    }

    public void setCorrigirDescontoReclamante(Boolean corrigirDescontoReclamante) {
        this.corrigirDescontoReclamante = corrigirDescontoReclamante;
    }

    public Set<OcorrenciaDeInssSobreSalariosDevidos> getOcorrencias() {
        if (Utils.nulo(this.ocorrencias)) {
            this.ocorrencias = new HashSet<OcorrenciaDeInssSobreSalariosDevidos>();
        }
        return this.ocorrencias;
    }

    public OptimizerListSearchUnique<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosDevidos> getOcorrenciasOptimizerListSearchUnique() {
        return new OcorrenciaDeInssSalarioDevidoOptimizerListSearchUnique().init((Collection<OcorrenciaDeInssSobreSalariosDevidos>)this.getOcorrencias());
    }

    public void validar(NegocioException excecao) {
        super.validar(excecao, true);
    }

    public Set<OcorrenciaDeInssSobreSalariosDevidos> getOcorrenciasComValorDaVerba() {
        if (this.ocorrenciasComValorDaVerba.isEmpty()) {
            for (OcorrenciaDeInssSobreSalariosDevidos o : this.getOcorrencias()) {
                if (Utils.naoNulo(o.getValorBaseVerbas()) && o.getValorBaseVerbas().compareTo(BigDecimal.ZERO) > 0) {
                    this.ocorrenciasComValorDaVerba.add(o);
                    o.setBaseVazia(false);
                    continue;
                }
                o.setBaseVazia(true);
            }
        }
        return this.ocorrenciasComValorDaVerba;
    }

    public OcorrenciaDeInssSobreSalariosDevidos buscarOcorrenciaPelaCompetencia(Date competencia, boolean isDecimoTerceiro) {
        HelperDate helperDate = HelperDate.getInstance();
        for (OcorrenciaDeInssSobreSalariosDevidos ocorrencia : this.getOcorrencias()) {
            if (!helperDate.setDate(ocorrencia.getDataOcorrenciaInss()).compareMonthAndYear(competencia)) continue;
            if (isDecimoTerceiro) {
                if (!ocorrencia.getOcorrenciaDecimoTerceiro().booleanValue()) continue;
                return ocorrencia;
            }
            return ocorrencia;
        }
        return null;
    }

    public void setOcorrencias(Set<OcorrenciaDeInssSobreSalariosDevidos> ocorrencias) {
        this.ocorrencias = ocorrencias;
    }

    public void removerDeOcorrencias(List<OcorrenciaDeInssSobreSalariosDevidos> filhos) {
        InssSobreSalariosDevidos.getRepositorio(RepositorioDeInssSobreSalariosDevidos.class).removerDeOcorrencias(this, filhos, true);
    }

    public void removerDeOcorrencias(List<OcorrenciaDeInssSobreSalariosDevidos> filhos, boolean flush) {
        InssSobreSalariosDevidos.getRepositorio(RepositorioDeInssSobreSalariosDevidos.class).removerDeOcorrencias(this, filhos, flush);
    }

    @Override
    public String getDiscriminador() {
        return DISCRIMINADOR;
    }

    @Override
    public void sugerirDatas() {
        if (Utils.naoNulo(this.getInss()) && Utils.naoNulo(this.getInss().getCalculo())) {
            HelperDate dataAdmissao = HelperDate.getInstance(this.getInss().getCalculo().getDataAdmissao());
            HelperDate dataInicioDoCalculo = HelperDate.getInstance(this.getInss().getCalculo().getDataInicioCalculo());
            HelperDate dataPrescricaoQuinquenal = null;
            if (this.getInss().getCalculo().getPrescricaoQuinquenal().booleanValue()) {
                dataPrescricaoQuinquenal = HelperDate.getInstance(this.getInss().getCalculo().getDataDePrescricao());
            }
            HelperDate maiorData = dataAdmissao;
            if (Utils.naoNulo(dataInicioDoCalculo) && Utils.naoNulo(maiorData) && dataInicioDoCalculo.greaterThen(maiorData)) {
                maiorData = dataInicioDoCalculo;
            }
            if (Utils.naoNulo(dataPrescricaoQuinquenal) && Utils.naoNulo(maiorData) && dataPrescricaoQuinquenal.greaterThen(maiorData)) {
                maiorData = dataPrescricaoQuinquenal;
            }
            this.setDataInicioPeriodo(maiorData.getDate());
            HelperDate dataDemissao = HelperDate.getInstance(this.getInss().getCalculo().getDataDemissao());
            HelperDate dataFimDoCalculo = HelperDate.getInstance(this.getInss().getCalculo().getDataTerminoCalculo());
            HelperDate dataFinal = dataDemissao;
            if (Utils.naoNulo(dataFimDoCalculo) && (Utils.nulo(dataFinal) || dataFimDoCalculo.greaterThen(dataFinal))) {
                dataFinal = dataFimDoCalculo;
            }
            this.setDataTerminoPeriodo(dataFinal.getDate());
        }
    }

    public void sugerirDataTerminoCalculo() {
        if (Utils.naoNulo(this.getInss()) && Utils.naoNulo(this.getInss().getCalculo())) {
            HelperDate dataDemissao = HelperDate.getInstance(this.getInss().getCalculo().getDataDemissao());
            HelperDate dataFimDoCalculo = HelperDate.getInstance(this.getInss().getCalculo().getDataTerminoCalculo());
            HelperDate dataFinal = dataDemissao;
            if (Utils.naoNulo(dataFimDoCalculo) && (Utils.nulo(dataDemissao) || dataFimDoCalculo.greaterThenOrEquals(dataDemissao))) {
                dataFinal = dataFimDoCalculo;
            }
            this.setDataTerminoPeriodo(dataFinal.getDate());
        }
    }

    @Override
    public boolean existemOcorrencias() {
        return Utils.naoNulo(this.getOcorrencias()) && !this.getOcorrencias().isEmpty();
    }

    public BigDecimal getValorTotalInssSeguradoReclamante() {
        Total total = Total.newInstance(true);
        for (OcorrenciaDeInssSobreSalariosDevidos ocorrencia : this.getOcorrencias()) {
            if (ocorrencia.isBaseVazia().booleanValue() || !Utils.naoNulo(ocorrencia.getValorDevidoSeguradoFinal())) continue;
            total.acumular(ocorrencia.getValorDevidoReclamanteCorrigido());
        }
        return total.getValor();
    }

    @Override
    public Boolean getCorrecaoTrabalhista() {
        return this.getInss().getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosDevidosDoINSS();
    }

    @Override
    public Date getDataLimiteCorrecaoTrabalhista() {
        return this.getInss().getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosDevidosDoINSS();
    }

    @Override
    public Boolean getCorrecao11941() {
        return this.getInss().getCalculo().getParametrosDeAtualizacao().getLei11941();
    }

    @Override
    public Date getDataLimiteCorrecao11941() {
        return this.getInss().getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941();
    }

    @Override
    public Boolean getCorrecaoPrevidenciaria() {
        return this.getInss().getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosDevidosDoINSS();
    }

    public Set<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> getOcorrenciasAtualizacao() {
        return this.ocorrenciasAtualizacao;
    }

    public void setOcorrenciasAtualizacao(Set<OcorrenciaDeInssSobreSalariosDevidosAtualizacao> ocorrenciasAtualizacao) {
        this.ocorrenciasAtualizacao = ocorrenciasAtualizacao;
    }
}

