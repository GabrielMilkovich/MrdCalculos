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
 *  javax.persistence.OrderBy
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Version
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.valetransporte;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.LimitedTo100Years;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDeLinhaEnum;
import br.jus.trt8.pjecalc.negocio.dominio.estado.Estado;
import br.jus.trt8.pjecalc.negocio.dominio.municipio.Municipio;
import br.jus.trt8.pjecalc.negocio.dominio.valetransporte.RepositorioDeValeTransporte;
import br.jus.trt8.pjecalc.negocio.dominio.valetransporte.ValorValeTransporte;
import java.util.ArrayList;
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
import javax.persistence.OrderBy;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBVALETRANSPORTE")
@SequenceGenerator(name="SQVALETRANSPORTE", sequenceName="SQVALETRANSPORTE", allocationSize=1)
@Name(value="valeTransporte")
public class ValeTransporte
extends EntidadeBase {
    private static final long serialVersionUID = -4001970057100591618L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQVALETRANSPORTE")
    @Column(name="IIDVALETRANSPORTE")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @Column(name="SDSLINHA", columnDefinition="VARCHAR2(100)", unique=true)
    @Required
    private String descricaoLinha;
    @Column(name="STPLINHA", columnDefinition="VARCHAR2(2)", unique=true)
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDeLinhaEnum")})
    @Required
    private TipoDeLinhaEnum tipoDeLinha = TipoDeLinhaEnum.URBANO;
    @OneToOne
    @JoinColumn(name="SSGESTADO", columnDefinition="CHAR(2)", unique=true)
    @Required
    private Estado estado;
    @OneToOne
    @JoinColumn(name="ICDMUNICIPIO", unique=true)
    @Required(condition="bean.tipoDeLinha.valor == 'U'")
    private Municipio municipio;
    @Column(name="DDTENCERRAMENTOLINHA")
    @Temporal(value=TemporalType.DATE)
    @LimitedTo100Years
    private Date dataEncerramentoLinha;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="valeTransporte")
    @OrderBy(value="dataInicio desc")
    private List<ValorValeTransporte> ocorrencias = new ArrayList<ValorValeTransporte>();

    public ValeTransporte() {
        super(RepositorioDeValeTransporte.class);
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

    public String getDescricaoLinha() {
        return this.descricaoLinha;
    }

    public void setDescricaoLinha(String descricaoLinha) {
        this.descricaoLinha = descricaoLinha;
    }

    public TipoDeLinhaEnum getTipoDeLinha() {
        return this.tipoDeLinha;
    }

    public void setTipoDeLinha(TipoDeLinhaEnum tipoDeLinha) {
        this.tipoDeLinha = tipoDeLinha;
    }

    public Estado getEstado() {
        return this.estado;
    }

    public void setEstado(Estado estado) {
        this.estado = estado;
    }

    public Municipio getMunicipio() {
        return this.municipio;
    }

    public void setMunicipio(Municipio municipio) {
        this.municipio = municipio;
    }

    public Date getDataEncerramentoLinha() {
        return this.dataEncerramentoLinha;
    }

    public void setDataEncerramentoLinha(Date dataEncerramentoLinha) {
        this.dataEncerramentoLinha = dataEncerramentoLinha;
    }

    public List<ValorValeTransporte> getOcorrencias() {
        if (Utils.nulo(this.ocorrencias)) {
            this.ocorrencias = new ArrayList<ValorValeTransporte>();
        }
        Collections.sort(this.ocorrencias);
        return this.ocorrencias;
    }

    public void setOcorrencias(List<ValorValeTransporte> ocorrencias) {
        this.ocorrencias = ocorrencias;
    }

    public boolean isUrbano() {
        return TipoDeLinhaEnum.URBANO == this.tipoDeLinha;
    }

    public Long getId() {
        return this.id;
    }

    public String getLocalidade() {
        return this.isUrbano() ? this.getMunicipio().getNome() : this.getTipoDeLinha().getNome().toUpperCase();
    }

    @Override
    public ValeTransporte validar() {
        GerenciadorDeValidadores.getInstance().validar(ValeTransporte.class, this);
        NegocioException exception = new NegocioException();
        if (this.getOcorrencias().isEmpty()) {
            exception.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0047, "Valor do Vale Transporte"));
        }
        if (Utils.nulo(this.getDataEncerramentoLinha()) && !this.getOcorrencias().isEmpty() && Utils.naoNulo(this.getOcorrencias().get(0).getDataTermino())) {
            exception.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0058, new Object[0]));
        }
        if (Utils.naoNulo(this.getDataEncerramentoLinha()) && !this.getOcorrencias().isEmpty()) {
            ValorValeTransporte atual = this.getOcorrencias().get(0);
            HelperDate dataDoAtual = HelperDate.getInstance(atual.getDataInicio());
            if (HelperDate.dateBefore(this.getDataEncerramentoLinha(), dataDoAtual.getDate())) {
                exception.adicionarMensagemDeRecurso(new MensagemDeRecurso("dataEncerramentoLinha", Mensagens.MSG0007, "Data Encerramento da Linha", dataDoAtual.format("dd/MM/yyyy")));
            }
        }
        if (!exception.getMensagensDeRecurso().isEmpty()) {
            throw exception;
        }
        return this;
    }

    public void consistirDados() {
        if (TipoDeLinhaEnum.INTERURBANO == this.tipoDeLinha) {
            this.municipio = null;
        }
    }

    public void adicionar(ValorValeTransporte valorValeTransporte) {
        valorValeTransporte.setValeTransporte(this);
        valorValeTransporte.validar();
        if (!this.getOcorrencias().isEmpty()) {
            ValorValeTransporte anterior = this.getOcorrencias().get(0);
            HelperDate dataDoAtual = HelperDate.getInstance(anterior.getDataInicio());
            if (Utils.naoNulo(anterior.getDataTermino())) {
                dataDoAtual.setDate(anterior.getDataTermino());
            }
            if (!HelperDate.dateAfter(valorValeTransporte.getDataInicio(), dataDoAtual.getDate())) {
                throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0051, dataDoAtual.format("dd/MM/yyyy")));
            }
            if (Utils.nulo(anterior.getDataTermino())) {
                HelperDate dataFim = HelperDate.getInstance(valorValeTransporte.getDataInicio());
                dataFim.addDay(-1);
                anterior.setDataTermino(dataFim.getDate());
            }
        }
        this.getOcorrencias().add(valorValeTransporte);
    }

    public void removerDeLista(ValorValeTransporte valorValeTransporte) {
        if (this.getOcorrencias().size() > 1) {
            ValorValeTransporte anterior = this.getOcorrencias().get(1);
            HelperDate date = HelperDate.getInstance(valorValeTransporte.getDataInicio());
            date.addDay(-1);
            if (Utils.naoNulo(anterior.getDataTermino()) && HelperDate.dateEquals(anterior.getDataTermino(), date.getDate())) {
                anterior.setDataTermino(null);
            }
        }
        this.getOcorrencias().remove(valorValeTransporte);
    }

    @Override
    public void salvar() {
        this.validar();
        this.consistirDados();
        super.salvar();
    }

    public static void remover(ValeTransporte entidade) {
        ValeTransporte.remover(RepositorioDeValeTransporte.class, entidade, true);
    }

    public static List<ValeTransporte> obterTodosPorEstado(Estado estado) {
        if (Utils.nulo(estado)) {
            return ValeTransporte.obterTodos();
        }
        return ValeTransporte.obterTodosPorCriterio(RepositorioDeValeTransporte.class, "estado=? order by descricaoLinha", estado);
    }

    public static List<ValeTransporte> obterTodosUrbanosPorMunicipio(Municipio municipio) {
        return ValeTransporte.obterTodosPorCriterio(RepositorioDeValeTransporte.class, "tipoDeLinha=? and estado=? and municipio=? order by descricaoLinha", new Object[]{TipoDeLinhaEnum.URBANO, municipio.getEstado(), municipio});
    }

    public static List<ValeTransporte> obterTodos() {
        return ValeTransporte.obterTodos(RepositorioDeValeTransporte.class, "descricaoLinha");
    }

    public List<ValorValeTransporte> obterValoresPorPeriodo(Periodo periodo) {
        return ValeTransporte.getRepositorio(RepositorioDeValeTransporte.class).obterValoresPorPeriodo(periodo, this);
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }
}

