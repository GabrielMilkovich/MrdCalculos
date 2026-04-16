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
 *  javax.persistence.OneToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.custas;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.CustasJudiciais;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.MaquinaDeCalculoDeCustas;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.custas.RepositorioDeCustasFixasAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.custas.ParametrosDeCustasFixas;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.DebitosDoReclamante;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.EventoAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.OutrosDebitosReclamado;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBCUSTASFIXASATUALIZACAO")
@SequenceGenerator(name="SQCUSTASFIXASATUALIZACAO", sequenceName="SQCUSTASFIXASATUALIZACAO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="custasFixasAtualizacao")
public class CustasFixasAtualizacao
extends EntidadeBase
implements EventoAtualizacao {
    private static final long serialVersionUID = 1L;
    private static final int PRIORIDADE_ATUALIZACAO = 4;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCUSTASFIXASATUALIZACAO")
    @Column(name="IIDCUSTASFIXASATUALIZACAO")
    private Long id = null;
    @ManyToOne
    @JoinColumn(name="IIDCUSTAS", nullable=false)
    private CustasJudiciais custasJudiciais;
    @OneToOne
    @JoinColumn(name="IIDDEBITOSRECLAMANTE")
    private DebitosDoReclamante debitosDoReclamante;
    @OneToOne
    @JoinColumn(name="IIDOUTROSDEBITOS")
    private OutrosDebitosReclamado outrosDebitosReclamado;
    @Column(name="DDTEVENTOATUALIZACAO", nullable=true)
    @Temporal(value=TemporalType.DATE)
    private Date dataEvento;
    @Column(name="IQTATOSURBANOS", nullable=true)
    private Integer qtdeAtosUrbanos;
    @Column(name="IQTATOSRURAIS", nullable=true)
    private Integer qtdeAtosRurais;
    @Column(name="IQTAGRAVOINSTRUMENTO", nullable=true)
    private Integer qtdeAgravosDeInstrumento;
    @Column(name="IQTAGRAVOPETICAO", nullable=true)
    private Integer qtdeAgravosDePeticao;
    @Column(name="IQTIMPUGNACAOSENTENCA", nullable=true)
    private Integer qtdeImpugnacaoSentenca;
    @Column(name="IQTEMBARGOSARREMATACAO", nullable=true)
    private Integer qtdeEmbargosArrematacao;
    @Column(name="IQTEMBARGOSEXECUCAO", nullable=true)
    private Integer qtdeEmbargosExecucao;
    @Column(name="IQTEMBARGOSTERCEIROS", nullable=true)
    private Integer qtdeEmbargosTerceiros;
    @Column(name="IQTRECURSOREVISTA", nullable=true)
    private Integer qtdeRecursoRevista;
    @Column(name="RVLATOSURBANOS", precision=12, scale=2, nullable=true)
    private BigDecimal valorAtosUrbanos;
    @Column(name="RVLATOSRURAIS", precision=12, scale=2, nullable=true)
    private BigDecimal valorAtosRurais;
    @Column(name="RVLAGRAVOINSTRUMENTO", precision=12, scale=2, nullable=true)
    private BigDecimal valorAgravoInstrumento;
    @Column(name="RVLAGRAVOPETICAO", precision=12, scale=2, nullable=true)
    private BigDecimal valorAgravoPeticao;
    @Column(name="RVLIMPUGNACAOSENTENCA", precision=12, scale=2, nullable=true)
    private BigDecimal valorImpuganacaoSentenca;
    @Column(name="RVLEMBARGOSARREMATACAO", precision=12, scale=2, nullable=true)
    private BigDecimal valorEmbargosArrematacao;
    @Column(name="RVLEMBARGOSEXECUCAO", precision=12, scale=2, nullable=true)
    private BigDecimal valorEmbargosExecucao;
    @Column(name="RVLEMBARGOSTERCEIROS", precision=12, scale=2, nullable=true)
    private BigDecimal valorEmbargosTerceiros;
    @Column(name="RVLRECURSOREVISTA", precision=12, scale=2, nullable=true)
    private BigDecimal valorRecursoRevista;
    @Transient
    private ParametrosDeCustasFixas parametros = null;
    @Transient
    protected MaquinaDeCalculoDeCustas maquinaDeCalculoDeCustas;

    public CustasFixasAtualizacao() {
        super(RepositorioDeCustasFixasAtualizacao.class);
    }

    public void salvarOuAtualizar() {
        this.salvar();
    }

    public void definirValores(CustasJudiciais custas, ParametrosDeCustasFixas parametros) {
        this.custasJudiciais = custas;
        this.valorAtosUrbanos = parametros.getValorAtosUrbanosOficialJustica();
        this.valorAtosRurais = parametros.getValorAtosRuraisOficialJustica();
        this.valorAgravoInstrumento = parametros.getValorAgravoDeInstrumento();
        this.valorAgravoPeticao = parametros.getValorAgravoDePeticao();
        this.valorImpuganacaoSentenca = parametros.getValorImpugnacaoSentencaDeLiquidacao();
        this.valorEmbargosArrematacao = parametros.getValorEmbargosAArrematacao();
        this.valorEmbargosExecucao = parametros.getValorEmbargosAExecucao();
        this.valorEmbargosTerceiros = parametros.getValorEmbargosDeTerceiros();
        this.valorRecursoRevista = parametros.getValorRecursoDeRevista();
    }

    public CustasFixasAtualizacao validarConfirmacao() {
        NegocioException excecao = new NegocioException();
        if (Utils.nulo(this.dataEvento)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataVencimentoCustasFixas", Mensagens.MSG0003, "Vencimento"));
        } else {
            this.parametros = ParametrosDeCustasFixas.obterRegistroMaisAntigo();
            if (Utils.naoNulo(this.parametros) && HelperDate.dateBefore(this.dataEvento, this.parametros.getDataInicio())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataVencimentoCustasFixas", Mensagens.MSG0053, new Object[0]));
            }
            if (Utils.naoNulos(this.getDataEvento(), this.getCustasJudiciais().getCalculo().getDataDeLiquidacao()) && HelperDate.dateBefore(this.getDataEvento(), this.getCustasJudiciais().getCalculo().getDataDeLiquidacao())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0127, Utils.formatarData(this.getCustasJudiciais().getCalculo().getDataDeLiquidacao())));
            }
            if (Utils.naoNulo(this.getDataEvento()) && HelperDate.dateAfter(this.getDataEvento(), new Date())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0128, new Object[0]));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public static CustasFixasAtualizacao obter(long id) {
        return (CustasFixasAtualizacao)EntidadeBase.obter(RepositorioDeCustasFixasAtualizacao.class, id);
    }

    public static CustasFixasAtualizacao obterPor(CustasJudiciais registro, Date dataEvento) {
        return CustasFixasAtualizacao.getRepositorio(RepositorioDeCustasFixasAtualizacao.class).obterPor(registro, dataEvento);
    }

    public static List<CustasFixasAtualizacao> obterPor(CustasJudiciais registro) {
        return CustasFixasAtualizacao.getRepositorio(RepositorioDeCustasFixasAtualizacao.class).obterPor(registro);
    }

    public static void remover(CustasJudiciais registro, List<CustasFixasAtualizacao> listaParaRemover) {
        for (CustasFixasAtualizacao custasFixasAtualizacao : CustasFixasAtualizacao.obterPor(registro)) {
            if (!listaParaRemover.contains(custasFixasAtualizacao)) continue;
            CustasFixasAtualizacao.getRepositorio(RepositorioDeCustasFixasAtualizacao.class).remover(custasFixasAtualizacao);
        }
    }

    public static void removerPor(CustasJudiciais registro) {
        CustasFixasAtualizacao.getRepositorio(RepositorioDeCustasFixasAtualizacao.class).removerPor(registro);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public CustasJudiciais getCustasJudiciais() {
        return this.custasJudiciais;
    }

    public void setCustasJudiciais(CustasJudiciais custasJudiciais) {
        this.custasJudiciais = custasJudiciais;
    }

    public Date getDataEvento() {
        return this.dataEvento;
    }

    public void setDataEvento(Date dataEvento) {
        this.dataEvento = dataEvento;
    }

    public Integer getQtdeAtosUrbanos() {
        return this.qtdeAtosUrbanos;
    }

    public void setQtdeAtosUrbanos(Integer qtdeAtosUrbanos) {
        this.qtdeAtosUrbanos = qtdeAtosUrbanos;
    }

    public Integer getQtdeAtosRurais() {
        return this.qtdeAtosRurais;
    }

    public void setQtdeAtosRurais(Integer qtdeAtosRurais) {
        this.qtdeAtosRurais = qtdeAtosRurais;
    }

    public Integer getQtdeAgravosDeInstrumento() {
        return this.qtdeAgravosDeInstrumento;
    }

    public void setQtdeAgravosDeInstrumento(Integer qtdeAgravosDeInstrumento) {
        this.qtdeAgravosDeInstrumento = qtdeAgravosDeInstrumento;
    }

    public Integer getQtdeAgravosDePeticao() {
        return this.qtdeAgravosDePeticao;
    }

    public void setQtdeAgravosDePeticao(Integer qtdeAgravosDePeticao) {
        this.qtdeAgravosDePeticao = qtdeAgravosDePeticao;
    }

    public Integer getQtdeImpugnacaoSentenca() {
        return this.qtdeImpugnacaoSentenca;
    }

    public void setQtdeImpugnacaoSentenca(Integer qtdeImpugnacaoSentenca) {
        this.qtdeImpugnacaoSentenca = qtdeImpugnacaoSentenca;
    }

    public Integer getQtdeEmbargosArrematacao() {
        return this.qtdeEmbargosArrematacao;
    }

    public void setQtdeEmbargosArrematacao(Integer qtdeEmbargosArrematacao) {
        this.qtdeEmbargosArrematacao = qtdeEmbargosArrematacao;
    }

    public Integer getQtdeEmbargosExecucao() {
        return this.qtdeEmbargosExecucao;
    }

    public void setQtdeEmbargosExecucao(Integer qtdeEmbargosExecucao) {
        this.qtdeEmbargosExecucao = qtdeEmbargosExecucao;
    }

    public Integer getQtdeEmbargosTerceiros() {
        return this.qtdeEmbargosTerceiros;
    }

    public void setQtdeEmbargosTerceiros(Integer qtdeEmbargosTerceiros) {
        this.qtdeEmbargosTerceiros = qtdeEmbargosTerceiros;
    }

    public Integer getQtdeRecursoRevista() {
        return this.qtdeRecursoRevista;
    }

    public void setQtdeRecursoRevista(Integer qtdeRecursoRevista) {
        this.qtdeRecursoRevista = qtdeRecursoRevista;
    }

    public BigDecimal getValorAtosUrbanos() {
        return this.valorAtosUrbanos;
    }

    public void setValorAtosUrbanos(BigDecimal valorAtosUrbanos) {
        this.valorAtosUrbanos = valorAtosUrbanos;
    }

    public BigDecimal getValorAtosRurais() {
        return this.valorAtosRurais;
    }

    public void setValorAtosRurais(BigDecimal valorAtosRurais) {
        this.valorAtosRurais = valorAtosRurais;
    }

    public BigDecimal getValorAgravoInstrumento() {
        return this.valorAgravoInstrumento;
    }

    public void setValorAgravoInstrumento(BigDecimal valorAgravoInstrumento) {
        this.valorAgravoInstrumento = valorAgravoInstrumento;
    }

    public BigDecimal getValorAgravoPeticao() {
        return this.valorAgravoPeticao;
    }

    public void setValorAgravoPeticao(BigDecimal valorAgravoPeticao) {
        this.valorAgravoPeticao = valorAgravoPeticao;
    }

    public BigDecimal getValorImpuganacaoSentenca() {
        return this.valorImpuganacaoSentenca;
    }

    public void setValorImpuganacaoSentenca(BigDecimal valorImpuganacaoSentenca) {
        this.valorImpuganacaoSentenca = valorImpuganacaoSentenca;
    }

    public BigDecimal getValorEmbargosArrematacao() {
        return this.valorEmbargosArrematacao;
    }

    public void setValorEmbargosArrematacao(BigDecimal valorEmbargosArrematacao) {
        this.valorEmbargosArrematacao = valorEmbargosArrematacao;
    }

    public BigDecimal getValorEmbargosExecucao() {
        return this.valorEmbargosExecucao;
    }

    public void setValorEmbargosExecucao(BigDecimal valorEmbargosExecucao) {
        this.valorEmbargosExecucao = valorEmbargosExecucao;
    }

    public BigDecimal getValorEmbargosTerceiros() {
        return this.valorEmbargosTerceiros;
    }

    public void setValorEmbargosTerceiros(BigDecimal valorEmbargosTerceiros) {
        this.valorEmbargosTerceiros = valorEmbargosTerceiros;
    }

    public BigDecimal getValorRecursoRevista() {
        return this.valorRecursoRevista;
    }

    public void setValorRecursoRevista(BigDecimal valorRecursoRevista) {
        this.valorRecursoRevista = valorRecursoRevista;
    }

    public DebitosDoReclamante getDebitosDoReclamante() {
        return this.debitosDoReclamante;
    }

    public void setDebitosDoReclamante(DebitosDoReclamante debitosDoReclamante) {
        this.debitosDoReclamante = debitosDoReclamante;
    }

    public OutrosDebitosReclamado getOutrosDebitosReclamado() {
        return this.outrosDebitosReclamado;
    }

    public void setOutrosDebitosReclamado(OutrosDebitosReclamado outrosDebitosReclamado) {
        this.outrosDebitosReclamado = outrosDebitosReclamado;
    }

    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
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
        CustasFixasAtualizacao other = (CustasFixasAtualizacao)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }

    @Override
    public Integer getPrioridade() {
        return 4;
    }
}

