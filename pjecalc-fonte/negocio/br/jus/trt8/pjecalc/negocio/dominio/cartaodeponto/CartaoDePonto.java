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
 *  javax.persistence.ManyToOne
 *  javax.persistence.OneToMany
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Version
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.negocio.comum.GerenciadorDeValidadores;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.comum.validators.Required;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.calculo.Calculo;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.ApuracaoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaDoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.RepositorioDeCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.RepositorioDeOcorrenciaDoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Version;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBCARTAODEPONTO")
@SequenceGenerator(name="SQCARTAODEPONTO", sequenceName="SQCARTAODEPONTO", allocationSize=1)
@Name(value="cartaoDePonto")
public class CartaoDePonto
extends EntidadeBase {
    private static final long serialVersionUID = 5168607449499808974L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQCARTAODEPONTO")
    @Column(name="IIDCARTAODEPONTO")
    private final Long id = null;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDCALCULO")
    private Calculo calculo;
    @Column(name="SNMCARTAODEPONTO", columnDefinition="VARCHAR2(120)", unique=true)
    @Required
    private String nome;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @OneToMany(fetch=FetchType.LAZY, cascade={CascadeType.ALL}, mappedBy="cartaoDePonto")
    private List<OcorrenciaDoCartaoDePonto> ocorrencias = new ArrayList<OcorrenciaDoCartaoDePonto>();

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public CartaoDePonto() {
        super(RepositorioDeCartaoDePonto.class);
    }

    @Override
    protected CartaoDePonto validar() {
        GerenciadorDeValidadores.getInstance().validar(CartaoDePonto.class, this);
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

    public Calculo getCalculo() {
        return this.calculo;
    }

    public void setCalculo(Calculo calculo) {
        this.calculo = calculo;
    }

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    @Override
    public Long getVersao() {
        return this.versao;
    }

    @Override
    public void setVersao(Long versao) {
        this.versao = versao;
    }

    public List<OcorrenciaDoCartaoDePonto> getOcorrencias() {
        return this.ocorrencias;
    }

    public void setOcorrencias(List<OcorrenciaDoCartaoDePonto> ocorrencias) {
        this.ocorrencias = ocorrencias;
    }

    public Long getId() {
        return this.id;
    }

    public static void remover(CartaoDePonto cartaoDePonto) {
        CartaoDePonto.removerVinculosComVerba(cartaoDePonto);
        CartaoDePonto.remover(RepositorioDeCartaoDePonto.class, cartaoDePonto, Boolean.TRUE);
    }

    private static void removerVinculosComVerba(CartaoDePonto cartaoDePonto) {
        CartaoDePonto.getRepositorio(RepositorioDeCartaoDePonto.class).removerVinculosDeCartaoDasVerbas(cartaoDePonto);
    }

    public CartaoDePonto removerDeOcorrencias(OcorrenciaDoCartaoDePonto ocorrencia) {
        return CartaoDePonto.getRepositorio(RepositorioDeCartaoDePonto.class).removerDeOcorrencias(this, ocorrencia);
    }

    public void removerDeOcorrencias(List<OcorrenciaDoCartaoDePonto> filhos, boolean flush) {
        CartaoDePonto.getRepositorio(RepositorioDeCartaoDePonto.class).removerDeOcorrencias(this, filhos, flush);
    }

    public static CartaoDePonto obter(Object id) {
        return (CartaoDePonto)CartaoDePonto.obter(RepositorioDeCartaoDePonto.class, id);
    }

    public static List<CartaoDePonto> obterCartoesDoCalculo(Calculo calculo) {
        return CartaoDePonto.getRepositorio(RepositorioDeCartaoDePonto.class).obterCartaoDePontoDoCalculo(calculo);
    }

    public List<OcorrenciaDoCartaoDePonto> obterOcorrenciasPorCompetencia(Date competencia) {
        return CartaoDePonto.getRepositorio(RepositorioDeOcorrenciaDoCartaoDePonto.class).obterOcorrenciasPorCompetencia(this, competencia);
    }

    public List<OcorrenciaDoCartaoDePonto> obterOcorrencias() {
        return CartaoDePonto.getRepositorio(RepositorioDeOcorrenciaDoCartaoDePonto.class).obterOcorrencias(this);
    }

    public static void gerarCartaoDePontoEOcorrenciasDoCartaoDePonto(String[] nomesColunas, List<String[]> linhas) {
        if (nomesColunas.length == 0 || linhas.isEmpty()) {
            throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0120, new Object[0]));
        }
        DecimalFormatSymbols symbols = new DecimalFormatSymbols();
        symbols.setGroupingSeparator(',');
        symbols.setDecimalSeparator('.');
        DecimalFormat decimalFormat = new DecimalFormat("#,##0.0000", new DecimalFormatSymbols(new Locale("pt", "BR")));
        BigDecimal valorOcorrenciaBigDecimal = null;
        HelperDate competencia = null;
        int count = 1;
        for (String nomeColuna : nomesColunas) {
            CartaoDePonto cartaoDePonto = new CartaoDePonto();
            cartaoDePonto.setCalculo(ServicoDeCalculo.getInstancia().obterCalculoAberto());
            cartaoDePonto.setNome(nomeColuna.replaceAll("\"", "").replaceAll("'", ""));
            for (String[] valores : linhas) {
                competencia = cartaoDePonto.tryParseCompetencia(valores[0].replaceAll("\"", "").replaceAll("'", ""));
                decimalFormat.setParseBigDecimal(true);
                try {
                    valorOcorrenciaBigDecimal = (BigDecimal)decimalFormat.parse(valores[count].replaceAll("\"", "").replaceAll("'", ""));
                }
                catch (ParseException e) {
                    e.printStackTrace();
                    throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0120, new Object[0]));
                }
                if (valorOcorrenciaBigDecimal.signum() == -1) {
                    throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0124, new Object[0]));
                }
                OcorrenciaDoCartaoDePonto ocorrenciaDoCartaoDePonto = new OcorrenciaDoCartaoDePonto(cartaoDePonto, competencia.getDate(), valorOcorrenciaBigDecimal);
                cartaoDePonto.getOcorrencias().add(ocorrenciaDoCartaoDePonto);
            }
            Collections.sort(cartaoDePonto.getOcorrencias());
            for (ApuracaoCartaoDePonto acp : cartaoDePonto.getCalculo().getApuracoesCartaoDePonto()) {
                ApuracaoCartaoDePonto.remover(acp);
            }
            cartaoDePonto.salvar();
            for (OcorrenciaDoCartaoDePonto o : cartaoDePonto.getOcorrencias()) {
                o.salvar();
            }
            ++count;
        }
    }

    private HelperDate tryParseCompetencia(String data) {
        String[] formatStrings;
        for (String formatString : formatStrings = new String[]{"dd/MM/yy", "MM/yyyy", "MMMM/yy", "MMMM/yyyy", "MM/yy"}) {
            try {
                SimpleDateFormat informat = new SimpleDateFormat(formatString);
                SimpleDateFormat outformat = new SimpleDateFormat("dd/MM/yyyy");
                return HelperDate.getInstance(outformat.format(informat.parse(data)));
            }
            catch (ParseException parseException) {
            }
        }
        throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0122, new Object[0]));
    }
}

