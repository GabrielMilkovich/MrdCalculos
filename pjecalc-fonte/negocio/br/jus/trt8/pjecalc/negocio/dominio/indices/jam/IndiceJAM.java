/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.AttributeOverride
 *  javax.persistence.AttributeOverrides
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.indices.jam;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Periodo;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.indices.IndiceBase;
import br.jus.trt8.pjecalc.negocio.dominio.indices.jam.RepositorioDeIndiceJAM;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import javax.persistence.AttributeOverride;
import javax.persistence.AttributeOverrides;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBJAM")
@SequenceGenerator(name="SQJAM", sequenceName="SQJAM", allocationSize=1)
@AttributeOverrides(value={@AttributeOverride(name="competencia", column=@Column(name="DDTDIAINDICE"))})
@Name(value="indiceJAM")
public class IndiceJAM
extends IndiceBase {
    private static final long serialVersionUID = -1473094970952346707L;
    private static final String NOME_INDICE = "JAM";
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQJAM")
    @Column(name="IIDINDICEJAM", nullable=false)
    private Long id;

    public IndiceJAM() {
        super(RepositorioDeIndiceJAM.class);
    }

    public IndiceJAM(Date competencia, BigDecimal taxa) {
        super(RepositorioDeIndiceJAM.class, competencia, taxa);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public static List<IndiceJAM> obterTodos() {
        return IndiceJAM.getRepositorio(RepositorioDeIndiceJAM.class).obterTodos();
    }

    public static List<IndiceJAM> obterPorFiltro(IndiceJAM filtro) {
        return IndiceJAM.getRepositorio(RepositorioDeIndiceJAM.class).obterPorFiltro(filtro);
    }

    public static void remover(IndiceJAM entidade) {
        IndiceJAM.remover(RepositorioDeIndiceJAM.class, entidade, true);
    }

    @Override
    public boolean existe() {
        return IndiceJAM.getRepositorio(RepositorioDeIndiceJAM.class).existe(this);
    }

    @Override
    public IndiceJAM validar() {
        NegocioException excecao = new NegocioException();
        if (Utils.nulo(this.getCompetencia())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataJAM", Mensagens.MSG0003, "Data"));
        }
        if (Utils.nulo(this.getTaxa())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "taxaDiaJAM", Mensagens.MSG0003, "Taxa do Dia"));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    @Override
    public IndiceJAM validarParaConsulta() {
        NegocioException excecao = new NegocioException();
        if (Utils.nulo(this.getCompetencia())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "dataConsultaJAM", Mensagens.MSG0003, "'Tabela de'"));
        }
        if (Utils.naoNulo(this.getCompetencia()) && Utils.naoNulo(this.getCompetenciaParaVerAcumulado()) && HelperDate.dateAfterOrEquals(this.getCompetenciaParaVerAcumulado(), this.getCompetencia())) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "aPartirDeJAM", Mensagens.MSG0009, "'A partir de'", "'Tabela de'"));
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public static List<IndiceJAM> obterTabela(Periodo periodo) {
        return IndiceJAM.getRepositorio(RepositorioDeIndiceJAM.class).obterTabelaPor(periodo);
    }

    @Override
    public int hashCode() {
        return super.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        return super.equals(obj);
    }

    @Override
    public IndiceBase clonar() {
        IndiceJAM indice = new IndiceJAM();
        indice.id = this.getId();
        indice.setCompetencia(this.getCompetencia());
        indice.setTaxa(this.getTaxa());
        indice.setDataCriacao(this.getDataCriacao());
        return indice;
    }
}

