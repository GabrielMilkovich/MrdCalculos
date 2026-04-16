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
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Transient
 *  org.jboss.seam.ScopeType
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.annotations.Scope
 */
package br.jus.trt8.pjecalc.negocio.dominio.pagamento;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.custas.ParametrosDeCustasFixas;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.CustasJudiciaisDaAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.EventoAtualizacao;
import br.jus.trt8.pjecalc.negocio.dominio.pagamento.RepositorioDeCustasFixasDasAtualizacao;
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
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import org.jboss.seam.ScopeType;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.annotations.Scope;

@Entity
@Table(name="TBCUSTASFIXASATUALIZACAOEVENTO")
@SequenceGenerator(name="SQCUSTASFIXASATUALIZACAOEVENTO", sequenceName="SQCUSTASFIXASATUALIZACAOEVENTO", allocationSize=1)
@Scope(value=ScopeType.SESSION)
@Name(value="custasFixasAtualizacaoEvento")
public class CustasFixasDaAtualizacaoDoEvento
extends EntidadeBase
implements EventoAtualizacao {
    private static final long serialVersionUID = 1L;
    private static final int PRIORIDADE_ATUALIZACAO = 4;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCUSTASFIXASATUALIZACAOEVENTO")
    @Column(name="IIDCUSTASFIXASEVENTO")
    private final Long id = null;
    @ManyToOne
    @JoinColumn(name="IIDCUSTASATUALIZACAO", nullable=false)
    private CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao;
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
    @Column(name="RVLINDICECORRECAOLIQUIDACAO", precision=38, scale=25, nullable=true)
    private BigDecimal indiceCorrecaoCustas;
    @Column(name="RVLTAXAJUROSFIXAS", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJurosCustasFixas;
    @Column(name="RVLTAXAJUROSFIXASPERIODO", precision=38, scale=25, nullable=true)
    private BigDecimal taxaJurosCustasFixasDoPeriodo;
    @Transient
    private ParametrosDeCustasFixas parametros = null;

    public CustasFixasDaAtualizacaoDoEvento() {
        super(RepositorioDeCustasFixasDasAtualizacao.class);
    }

    public void salvarOuAtualizar() {
        this.salvar();
    }

    public void definirValores(CustasJudiciaisDaAtualizacao custas, ParametrosDeCustasFixas parametros) {
        this.custasJudiciaisDaAtualizacao = custas;
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

    public CustasFixasDaAtualizacaoDoEvento validarConfirmacao() {
        NegocioException excecao = new NegocioException();
        if (Utils.nulo(this.dataEvento)) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataVencimentoCustasFixas", Mensagens.MSG0003, "Vencimento"));
        } else {
            this.parametros = ParametrosDeCustasFixas.obterRegistroMaisAntigo();
            if (Utils.naoNulo(this.parametros) && HelperDate.dateBefore(this.dataEvento, this.parametros.getDataInicio())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataVencimentoCustasFixas", Mensagens.MSG0053, new Object[0]));
            }
            if (Utils.naoNulo(this.getCustasJudiciaisDaAtualizacao().getCalculo().getDataDeLiquidacao()) && HelperDate.dateBefore(this.getDataEvento(), this.getCustasJudiciaisDaAtualizacao().getCalculo().getDataDeLiquidacao())) {
                excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(Mensagens.MSG0127, Utils.formatarData(this.getCustasJudiciaisDaAtualizacao().getCalculo().getDataDeLiquidacao())));
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public static CustasFixasDaAtualizacaoDoEvento obter(long id) {
        return (CustasFixasDaAtualizacaoDoEvento)EntidadeBase.obter(RepositorioDeCustasFixasDasAtualizacao.class, id);
    }

    public static CustasFixasDaAtualizacaoDoEvento obterPor(CustasJudiciaisDaAtualizacao registro, Date dataEvento) {
        return CustasFixasDaAtualizacaoDoEvento.getRepositorio(RepositorioDeCustasFixasDasAtualizacao.class).obterPor(registro, dataEvento);
    }

    public static List<CustasFixasDaAtualizacaoDoEvento> obterPor(CustasJudiciaisDaAtualizacao registro) {
        return CustasFixasDaAtualizacaoDoEvento.getRepositorio(RepositorioDeCustasFixasDasAtualizacao.class).obterPor(registro);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public CustasJudiciaisDaAtualizacao getCustasJudiciaisDaAtualizacao() {
        return this.custasJudiciaisDaAtualizacao;
    }

    public void setCustasJudiciaisDaAtualizacao(CustasJudiciaisDaAtualizacao custasJudiciaisDaAtualizacao) {
        this.custasJudiciaisDaAtualizacao = custasJudiciaisDaAtualizacao;
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

    public Long getId() {
        return this.id;
    }

    public BigDecimal getIndiceCorrecaoCustas() {
        return this.indiceCorrecaoCustas;
    }

    public void setIndiceCorrecaoCustas(BigDecimal indiceCorrecaoCustas) {
        this.indiceCorrecaoCustas = indiceCorrecaoCustas;
    }

    public BigDecimal getTaxaJurosCustasFixas() {
        return this.taxaJurosCustasFixas;
    }

    public void setTaxaJurosCustasFixas(BigDecimal taxaJurosCustasFixas) {
        this.taxaJurosCustasFixas = taxaJurosCustasFixas;
    }

    public BigDecimal getTaxaJurosCustasFixasDoPeriodo() {
        return this.taxaJurosCustasFixasDoPeriodo;
    }

    public void setTaxaJurosCustasFixasDoPeriodo(BigDecimal taxaJurosCustasFixasDoPeriodo) {
        this.taxaJurosCustasFixasDoPeriodo = taxaJurosCustasFixasDoPeriodo;
    }

    public BigDecimal getValorDevidoAgravoInstrumento() {
        if (Utils.nulo(this.getQtdeAgravosDeInstrumento())) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorAgravoInstrumento(), new BigDecimal(this.getQtdeAgravosDeInstrumento())));
    }

    public BigDecimal getValorCorrigidoAgravoInstrumento() {
        return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustas(), this.getValorDevidoAgravoInstrumento(), this.getValorDevidoAgravoInstrumento()));
    }

    public BigDecimal getJurosAgravoInstrumento() {
        return Utils.arredondarValorMonetario(Utils.aplicarJuros(this.getTaxaJurosCustasFixasDoPeriodo(), this.getValorCorrigidoAgravoInstrumento()));
    }

    public BigDecimal getValorDevidoAgravoPeticao() {
        if (Utils.nulo(this.getQtdeAgravosDePeticao())) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorAgravoPeticao(), new BigDecimal(this.getQtdeAgravosDePeticao())));
    }

    public BigDecimal getValorCorrigidoAgravoPeticao() {
        return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustas(), this.getValorDevidoAgravoPeticao(), this.getValorDevidoAgravoPeticao()));
    }

    public BigDecimal getJurosAgravoPeticao() {
        return Utils.arredondarValorMonetario(Utils.aplicarJuros(this.getTaxaJurosCustasFixasDoPeriodo(), this.getValorCorrigidoAgravoPeticao()));
    }

    public BigDecimal getValorDevidoAtosRurais() {
        if (Utils.nulo(this.getQtdeAtosRurais())) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorAtosRurais(), new BigDecimal(this.getQtdeAtosRurais())));
    }

    public BigDecimal getValorCorrigidoAtosRurais() {
        return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustas(), this.getValorDevidoAtosRurais(), this.getValorDevidoAtosRurais()));
    }

    public BigDecimal getJurosAtosRurais() {
        return Utils.arredondarValorMonetario(Utils.aplicarJuros(this.getTaxaJurosCustasFixasDoPeriodo(), this.getValorCorrigidoAtosRurais()));
    }

    public BigDecimal getValorDevidoAtosUrbanos() {
        if (Utils.nulo(this.getQtdeAtosUrbanos())) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorAtosUrbanos(), new BigDecimal(this.getQtdeAtosUrbanos())));
    }

    public BigDecimal getValorCorrigidoAtosUrbanos() {
        return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustas(), this.getValorDevidoAtosUrbanos(), this.getValorDevidoAtosUrbanos()));
    }

    public BigDecimal getJurosAtosUrbanos() {
        return Utils.arredondarValorMonetario(Utils.aplicarJuros(this.getTaxaJurosCustasFixasDoPeriodo(), this.getValorCorrigidoAtosUrbanos()));
    }

    public BigDecimal getValorDevidoEmbargosArrematacao() {
        if (Utils.nulo(this.getQtdeEmbargosArrematacao())) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorEmbargosArrematacao(), new BigDecimal(this.getQtdeEmbargosArrematacao())));
    }

    public BigDecimal getValorCorrigidoEmbargosArrematacao() {
        return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustas(), this.getValorDevidoEmbargosArrematacao(), this.getValorDevidoEmbargosArrematacao()));
    }

    public BigDecimal getJurosEmbargosArrematacao() {
        return Utils.arredondarValorMonetario(Utils.aplicarJuros(this.getTaxaJurosCustasFixasDoPeriodo(), this.getValorCorrigidoEmbargosArrematacao()));
    }

    public BigDecimal getValorDevidoEmbargosExecucao() {
        if (Utils.nulo(this.getQtdeEmbargosExecucao())) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorEmbargosExecucao(), new BigDecimal(this.getQtdeEmbargosExecucao())));
    }

    public BigDecimal getValorCorrigidoEmbargosExecucao() {
        return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustas(), this.getValorDevidoEmbargosExecucao(), this.getValorDevidoEmbargosExecucao()));
    }

    public BigDecimal getJurosEmbargosExecucao() {
        return Utils.arredondarValorMonetario(Utils.aplicarJuros(this.getTaxaJurosCustasFixasDoPeriodo(), this.getValorCorrigidoEmbargosExecucao()));
    }

    public BigDecimal getValorDevidoEmbargosTerceiros() {
        if (Utils.nulo(this.getQtdeEmbargosTerceiros())) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorEmbargosTerceiros(), new BigDecimal(this.getQtdeEmbargosTerceiros())));
    }

    public BigDecimal getValorCorrigidoEmbargosTerceiros() {
        return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustas(), this.getValorDevidoEmbargosTerceiros(), this.getValorDevidoEmbargosTerceiros()));
    }

    public BigDecimal getJurosEmbargosTerceiros() {
        return Utils.arredondarValorMonetario(Utils.aplicarJuros(this.getTaxaJurosCustasFixasDoPeriodo(), this.getValorCorrigidoEmbargosTerceiros()));
    }

    public BigDecimal getValorDevidoRecursoRevista() {
        if (Utils.nulo(this.getQtdeRecursoRevista())) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorRecursoRevista(), new BigDecimal(this.getQtdeRecursoRevista())));
    }

    public BigDecimal getValorCorrigidoRecursoRevista() {
        return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustas(), this.getValorDevidoRecursoRevista(), this.getValorDevidoRecursoRevista()));
    }

    public BigDecimal getJurosRecursoRevista() {
        return Utils.arredondarValorMonetario(Utils.aplicarJuros(this.getTaxaJurosCustasFixasDoPeriodo(), this.getValorCorrigidoRecursoRevista()));
    }

    public BigDecimal getValorDevidoImpuganacaoSentenca() {
        if (Utils.nulo(this.getQtdeImpugnacaoSentenca())) {
            return BigDecimal.ZERO;
        }
        return Utils.arredondarValorMonetario(Utils.multiplicar(this.getValorImpuganacaoSentenca(), new BigDecimal(this.getQtdeImpugnacaoSentenca())));
    }

    public BigDecimal getValorCorrigidoImpuganacaoSentenca() {
        return Utils.arredondarValorMonetario(Utils.aplicarCorrecaoMonetaria(this.getIndiceCorrecaoCustas(), this.getValorDevidoImpuganacaoSentenca(), this.getValorDevidoImpuganacaoSentenca()));
    }

    public BigDecimal getJurosImpuganacaoSentenca() {
        return Utils.arredondarValorMonetario(Utils.aplicarJuros(this.getTaxaJurosCustasFixasDoPeriodo(), this.getValorCorrigidoImpuganacaoSentenca()));
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
        CustasFixasDaAtualizacaoDoEvento other = (CustasFixasDaAtualizacaoDoEvento)obj;
        return !(this.id == null ? other.id != null : !this.id.equals(other.id));
    }

    @Override
    public Integer getPrioridade() {
        return 4;
    }
}

