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
 *  javax.persistence.OneToMany
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Transient
 *  javax.persistence.Version
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.salariocategoria;

import br.jus.trt8.pjecalc.base.comum.Competencia;
import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.OptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.GreaterOrEqualThan;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.comum.validators.Unique;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.estado.Estado;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.OcorrenciaDeSalarioCategoria;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.OcorrenciaDeSalarioCategoriaOptimizerListSearch;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.RepositorioDeOcorrenciaDoSalarioCategoria;
import br.jus.trt8.pjecalc.negocio.dominio.salariocategoria.RepositorioDeSalarioCategoria;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Transient;
import javax.persistence.Version;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBSALARIOCATEGORIA")
@SequenceGenerator(name="SQSALARIOCATEGORIA", sequenceName="SQSALARIOCATEGORIA", allocationSize=1)
@Name(value="salarioCategoria")
public class SalarioCategoria
extends EntidadeBase {
    private static final long serialVersionUID = 699120262547005773L;
    private static final byte GERACAO_OCORRENCIA = 1;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQSALARIOCATEGORIA")
    @Column(name="IIDSALARIOCATEGORIA")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="SNMSALARIOCATEGORIA", columnDefinition="VARCHAR2(120)", unique=true)
    @Unique(fields={"nome", "estado"})
    @Required
    private String nome;
    @OneToOne
    @JoinColumn(name="SSGESTADO", columnDefinition="CHAR(2)")
    @Required
    private Estado estado;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="salarioCategoria")
    private List<OcorrenciaDeSalarioCategoria> ocorrencias = new ArrayList<OcorrenciaDeSalarioCategoria>();
    @Transient
    @LimitedTo100Years(groups={1})
    @Required(groups={1})
    private Date competenciaInicial;
    @Transient
    @LimitedTo100Years(groups={1})
    @GreaterOrEqualThan(value="competenciaInicial", groups={1})
    @Required(groups={1})
    private Date competenciaFinal;
    @Transient
    @Required(groups={1})
    private BigDecimal valorParaBaseDeCalculo;
    @Transient
    private boolean gerandoConsulta;

    public SalarioCategoria() {
        super(RepositorioDeSalarioCategoria.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public Estado getEstado() {
        return this.estado;
    }

    public void setEstado(Estado estado) {
        this.estado = estado;
    }

    public Long getId() {
        return this.id;
    }

    public List<OcorrenciaDeSalarioCategoria> getOcorrencias() {
        return this.ocorrencias;
    }

    public void setOcorrencias(List<OcorrenciaDeSalarioCategoria> ocorrencias) {
        this.ocorrencias = ocorrencias;
    }

    public Date getCompetenciaInicial() {
        return this.competenciaInicial;
    }

    public void setCompetenciaInicial(Date competenciaInicial) {
        this.competenciaInicial = competenciaInicial;
    }

    public Date getCompetenciaFinal() {
        return this.competenciaFinal;
    }

    public void setCompetenciaFinal(Date competenciaFinal) {
        this.competenciaFinal = competenciaFinal;
    }

    public BigDecimal getValorParaBaseDeCalculo() {
        return this.valorParaBaseDeCalculo;
    }

    public void setValorParaBaseDeCalculo(BigDecimal valorParaBaseDeCalculo) {
        this.valorParaBaseDeCalculo = valorParaBaseDeCalculo;
    }

    public boolean isGerandoConsulta() {
        return this.gerandoConsulta;
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     */
    public void gerarOcorrencias() {
        this.gerandoConsulta = true;
        try {
            GerenciadorDeValidadores.getInstance().validar(SalarioCategoria.class, this, (byte)1);
            ArrayList<OcorrenciaDeSalarioCategoria> ocorrenciasAnteriores = new ArrayList<OcorrenciaDeSalarioCategoria>(this.getOcorrencias());
            if (Utils.naoNulo(this.getCompetenciaInicial()) && Utils.naoNulo(this.getCompetenciaFinal())) {
                this.getOcorrencias().clear();
                OcorrenciaDeSalarioCategoria ocorrenciaCanditada = null;
                for (HelperDate competencia : HelperDate.getCompetenceListForPeriod(this.getCompetenciaInicial(), this.getCompetenciaFinal())) {
                    ocorrenciaCanditada = new OcorrenciaDeSalarioCategoria(this, competencia.getDate(), this.getValorParaBaseDeCalculo());
                    if (!ocorrenciasAnteriores.isEmpty()) {
                        if (ocorrenciasAnteriores.contains(ocorrenciaCanditada)) {
                            OcorrenciaDeSalarioCategoria ocorrenciaAntiga = (OcorrenciaDeSalarioCategoria)ocorrenciasAnteriores.get(ocorrenciasAnteriores.indexOf(ocorrenciaCanditada));
                            ocorrenciaAntiga.setValor(this.getValorParaBaseDeCalculo());
                            this.getOcorrencias().add(ocorrenciaAntiga);
                            continue;
                        }
                        this.getOcorrencias().add(ocorrenciaCanditada);
                        continue;
                    }
                    this.getOcorrencias().add(ocorrenciaCanditada);
                }
            }
            if (!ocorrenciasAnteriores.isEmpty()) {
                for (OcorrenciaDeSalarioCategoria ocorrenciaDoSalarioCategoria : ocorrenciasAnteriores) {
                    if (this.getOcorrencias().contains(ocorrenciaDoSalarioCategoria)) continue;
                    this.getOcorrencias().add(ocorrenciaDoSalarioCategoria);
                }
            }
            Collections.sort(this.getOcorrencias());
            this.sugerirDatasDasCompetenciasParaDemaisGeracoes();
        }
        finally {
            this.gerandoConsulta = false;
        }
    }

    private SalarioCategoria sugerirDatasDasCompetenciasParaDemaisGeracoes() {
        HelperDate novaData = HelperDate.getInstance(this.competenciaFinal);
        novaData.addMonth(1);
        this.setCompetenciaInicial(novaData.getDate());
        this.setCompetenciaFinal(novaData.getDate());
        return this;
    }

    @Override
    protected SalarioCategoria validar() {
        GerenciadorDeValidadores.getInstance().validar(SalarioCategoria.class, this);
        if (this.getOcorrencias().isEmpty()) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0047, "Ocorr\u00eancias"));
        }
        return this;
    }

    @Override
    public void salvar() {
        this.validar();
        super.salvar();
    }

    public static void remover(SalarioCategoria historicoSalarial) {
        SalarioCategoria.remover(RepositorioDeSalarioCategoria.class, historicoSalarial, Boolean.TRUE);
    }

    public SalarioCategoria removerDeOcorrencias(OcorrenciaDeSalarioCategoria ocorrencia) {
        return SalarioCategoria.getRepositorio(RepositorioDeSalarioCategoria.class).removerDeOcorrencias(this, ocorrencia);
    }

    public static SalarioCategoria obter(Object id) {
        return (SalarioCategoria)SalarioCategoria.obter(RepositorioDeSalarioCategoria.class, id);
    }

    public List<OcorrenciaDeSalarioCategoria> obterOcorrenciasPorCompetencia(Date competencia) {
        return SalarioCategoria.getRepositorio(RepositorioDeOcorrenciaDoSalarioCategoria.class).obterOcorrenciasPorCompetencia(this, competencia);
    }

    public List<OcorrenciaDeSalarioCategoria> obterOcorrenciasPorPeriodo(Periodo periodo) {
        return SalarioCategoria.getRepositorio(RepositorioDeSalarioCategoria.class).obterOcorrenciasDoPeriodo(this, periodo.getInicial(), periodo.getFinal());
    }

    public static List<SalarioCategoria> obterTodosPorEstado(Estado estado) {
        if (Utils.nulo(estado)) {
            return SalarioCategoria.obterTodos();
        }
        return SalarioCategoria.obterTodosPorCriterio(RepositorioDeSalarioCategoria.class, "estado=? order by nome", estado);
    }

    public static List<SalarioCategoria> obterTodos() {
        return SalarioCategoria.obterTodos(RepositorioDeSalarioCategoria.class, "nome");
    }

    public OptimizerListSearch<Competencia, OcorrenciaDeSalarioCategoria> getListaDeOcorrenciasOtimizada(Date dataInicial, Date dataFinal) {
        return new OcorrenciaDeSalarioCategoriaOptimizerListSearch().init((Collection<OcorrenciaDeSalarioCategoria>)SalarioCategoria.getRepositorio(RepositorioDeSalarioCategoria.class).obterOcorrenciasDoPeriodo(this, dataInicial, dataFinal));
    }
}

