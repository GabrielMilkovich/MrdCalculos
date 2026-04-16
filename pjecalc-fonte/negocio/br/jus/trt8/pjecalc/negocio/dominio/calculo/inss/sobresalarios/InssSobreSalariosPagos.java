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
 *  org.hibernate.annotations.Where
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.TipoValorEnum;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.Inss;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.InssSobreSalarios;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSalarioPagoOptimizerListSearchUnique;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaDeInssSobreSalariosPagosAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.OcorrenciaInssUnique;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeInssSobreSalarios;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeInssSobreSalariosPagos;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.inss.sobresalarios.RepositorioDeOcorrenciaDeInssSobreSalariosPagosAtualizacao;
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
import org.hibernate.annotations.Where;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBINSSSALARIOSPAGOS")
@SequenceGenerator(name="SQINSSSALARIOSPAGOS", sequenceName="SQINSSSALARIOSPAGOS", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="inssSobreSalariosPagos")
public class InssSobreSalariosPagos
extends InssSobreSalarios {
    private static final long serialVersionUID = 110224463212224137L;
    private static final String DISCRIMINADOR = "PAGOS";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQINSSSALARIOSPAGOS")
    @Column(name="IIDINSSSALARIOSPAGOS")
    private final Long id = null;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="inssSobreSalariosPagos")
    @Where(clause="IIDOCORRENCIAINSSORIGINAL IS NOT NULL")
    @OrderBy(value="dataOcorrenciaInss, ocorrenciaDecimoTerceiro")
    private Set<OcorrenciaDeInssSobreSalariosPagos> ocorrencias;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="inssSobreSalariosPagos")
    @OrderBy(value="dataOcorrenciaInss, ocorrenciaDecimoTerceiro")
    private Set<OcorrenciaDeInssSobreSalariosPagosAtualizacao> ocorrenciasAtualizacao;
    @Transient
    private Set<OcorrenciaDeInssSobreSalariosPagos> ocorrenciasParaRelatorioSalariosPagos = new LinkedHashSet<OcorrenciaDeInssSobreSalariosPagos>();

    public InssSobreSalariosPagos() {
        super((Class<? extends RepositorioDeInssSobreSalarios<? extends InssSobreSalarios>>)RepositorioDeInssSobreSalariosPagos.class);
    }

    public InssSobreSalariosPagos(Inss inss) {
        this();
        this.setInss(inss);
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Set<OcorrenciaDeInssSobreSalariosPagos> getOcorrencias() {
        if (Utils.nulo(this.ocorrencias)) {
            this.ocorrencias = new HashSet<OcorrenciaDeInssSobreSalariosPagos>();
        }
        return this.ocorrencias;
    }

    public OptimizerListSearchUnique<OcorrenciaInssUnique, OcorrenciaDeInssSobreSalariosPagos> getOcorrenciasOptimizerListSearchUnique() {
        return new OcorrenciaDeInssSalarioPagoOptimizerListSearchUnique().init((Collection<OcorrenciaDeInssSobreSalariosPagos>)this.getOcorrencias());
    }

    public OcorrenciaDeInssSobreSalariosPagos buscarOcorrenciaPelaCompetencia(Date competencia, boolean isDecimoTerceiro) {
        HelperDate helperDate = HelperDate.getInstance();
        for (OcorrenciaDeInssSobreSalariosPagos ocorrencia : this.getOcorrencias()) {
            if (!helperDate.setDate(ocorrencia.getDataOcorrenciaInss()).compareMonthAndYear(competencia)) continue;
            if (isDecimoTerceiro) {
                if (!ocorrencia.getOcorrenciaDecimoTerceiro().booleanValue()) continue;
                return ocorrencia;
            }
            return ocorrencia;
        }
        return null;
    }

    public void setOcorrencias(Set<OcorrenciaDeInssSobreSalariosPagos> ocorrencias) {
        this.ocorrencias = ocorrencias;
    }

    public void validar(NegocioException excecao) {
        super.validar(excecao, false);
    }

    public Set<OcorrenciaDeInssSobreSalariosPagos> getOcorrenciasParaRelatorioSalariosPagos() {
        if (this.ocorrenciasParaRelatorioSalariosPagos.isEmpty()) {
            for (OcorrenciaDeInssSobreSalariosPagos o : this.ocorrencias) {
                if (TipoValorEnum.INFORMADO.equals((Object)o.getTipoValorDaBase()) || TipoValorEnum.INFORMADO.equals((Object)o.getTipoValorDoRecolhidoSegurado()) || TipoValorEnum.INFORMADO.equals((Object)o.getTipoValorDoRecolhidoEmpresa()) || TipoValorEnum.INFORMADO.equals((Object)o.getTipoValorDoRecolhidoSAT()) || TipoValorEnum.INFORMADO.equals((Object)o.getTipoValorDoRecolhidoTerceiros())) {
                    this.ocorrenciasParaRelatorioSalariosPagos.add(o);
                    o.setBaseVazia(false);
                    continue;
                }
                if (Utils.naoNulo(o.getValorBase()) && BigDecimal.ZERO.compareTo(o.getValorBase()) != 0) {
                    this.ocorrenciasParaRelatorioSalariosPagos.add(o);
                    o.setBaseVazia(false);
                    continue;
                }
                o.setBaseVazia(true);
            }
        }
        return this.ocorrenciasParaRelatorioSalariosPagos;
    }

    public static List<OcorrenciaDeInssSobreSalariosPagosAtualizacao> obterUltimasOcorrenciasNaoAmortizadas(InssSobreSalariosPagos inssSobreSalariosPagos) {
        return InssSobreSalariosPagos.getRepositorio(RepositorioDeOcorrenciaDeInssSobreSalariosPagosAtualizacao.class).getUltimasOcorrenciasNaoAmortizadas(inssSobreSalariosPagos);
    }

    public List<OcorrenciaDeInssSobreSalariosPagosAtualizacao> obterOcorrenciasNaoAmortizadasPor(InssSobreSalariosPagos inssSobreSalariosPagos, Date dataEvento) {
        return InssSobreSalariosPagos.getRepositorio(RepositorioDeInssSobreSalariosPagos.class).obterOcorrenciasAtualizacaoNaoAmortizadasPor(inssSobreSalariosPagos, dataEvento);
    }

    public List<OcorrenciaDeInssSobreSalariosPagosAtualizacao> obterOcorrenciasTodasPor(InssSobreSalariosPagos inssSobreSalariosPagos, Date dataEvento) {
        return InssSobreSalariosPagos.getRepositorio(RepositorioDeInssSobreSalariosPagos.class).obterOcorrenciasAtualizacaoTodasPor(inssSobreSalariosPagos, dataEvento);
    }

    public void removerDeOcorrenciasAtualizacao() {
        InssSobreSalariosPagos.getRepositorio(RepositorioDeInssSobreSalariosPagos.class).removerDeOcorrenciasAtualizacao(this);
    }

    public void removerDeOcorrencias(List<OcorrenciaDeInssSobreSalariosPagos> filhos) {
        InssSobreSalariosPagos.getRepositorio(RepositorioDeInssSobreSalariosPagos.class).removerDeOcorrencias(this, filhos, true);
    }

    public void removerDeOcorrencias(List<OcorrenciaDeInssSobreSalariosPagos> filhos, boolean flush) {
        InssSobreSalariosPagos.getRepositorio(RepositorioDeInssSobreSalariosPagos.class).removerDeOcorrencias(this, filhos, flush);
    }

    @Override
    public String getDiscriminador() {
        return DISCRIMINADOR;
    }

    @Override
    public void sugerirDatas() {
        if (Utils.naoNulo(this.getInss()) && Utils.naoNulo(this.getInss().getCalculo())) {
            this.setDataInicioPeriodo(this.getInss().getCalculo().getDataAdmissao());
            if (Utils.naoNulo(this.getInss().getCalculo().getDataDemissao())) {
                this.setDataTerminoPeriodo(this.getInss().getCalculo().getDataDemissao());
            } else {
                this.setDataTerminoPeriodo(this.getInss().getCalculo().getDataTerminoCalculo());
            }
        }
    }

    @Override
    public boolean existemOcorrencias() {
        return Utils.naoNulo(this.getOcorrencias()) && !this.getOcorrencias().isEmpty();
    }

    @Override
    public Boolean getCorrecaoTrabalhista() {
        return this.getInss().getCalculo().getParametrosDeAtualizacao().getCorrecaoTrabalhistaDosSalariosPagosDoINSS();
    }

    @Override
    public Date getDataLimiteCorrecaoTrabalhista() {
        return this.getInss().getCalculo().getParametrosDeAtualizacao().getAplicarAteDosSalariosPagosDoINSS();
    }

    @Override
    public Boolean getCorrecao11941() {
        return this.getInss().getCalculo().getParametrosDeAtualizacao().getLei11941Pago();
    }

    @Override
    public Date getDataLimiteCorrecao11941() {
        return this.getInss().getCalculo().getParametrosDeAtualizacao().getApartirDeLei11941Pago();
    }

    @Override
    public Boolean getCorrecaoPrevidenciaria() {
        return this.getInss().getCalculo().getParametrosDeAtualizacao().getCorrecaoPrevidenciariaDosSalariosPagosDoINSS();
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    public Set<OcorrenciaDeInssSobreSalariosPagosAtualizacao> getOcorrenciasAtualizacao() {
        return this.ocorrenciasAtualizacao;
    }

    public void setOcorrenciasAtualizacao(Set<OcorrenciaDeInssSobreSalariosPagosAtualizacao> ocorrenciasAtualizacao) {
        this.ocorrenciasAtualizacao = ocorrenciasAtualizacao;
    }
}

