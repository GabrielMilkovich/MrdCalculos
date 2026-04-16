/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.FetchType
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.processo;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.constantes.TipoDocumentoFiscal;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.constantes.TipoAdvogadoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDocumentoFiscalEnum;
import br.jus.trt8.pjecalc.negocio.dominio.processo.Processo;
import br.jus.trt8.pjecalc.negocio.dominio.processo.RepositorioDeAdvogado;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Name(value="Advogado")
@Entity
@Table(name="TBADVOGADO")
@SequenceGenerator(name="SQADVOGADO", sequenceName="SQADVOGADO", allocationSize=1)
public class Advogado
extends EntidadeBase {
    private static final long serialVersionUID = 9020403859522390192L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQADVOGADO")
    @Column(name="IIDADVOGADO")
    private final Long id = null;
    @Column(name="SNMADVOGADO", columnDefinition="VARCHAR2(150)")
    private String nome;
    @Column(name="STPDOCFISCALADVOGADO", columnDefinition="CHAR(4)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoDocumentoFiscalEnum")})
    private TipoDocumentoFiscalEnum tipoDocumento;
    @Column(name="SNRDOCFISCALADVOGADO", columnDefinition="VARCHAR2(14)")
    private String numeroDocumento;
    @Column(name="SNROABADVOGADO", columnDefinition="VARCHAR2(9)")
    private String numeroOAB;
    @Column(name="STPADVOGADO", columnDefinition="VARCHAR(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="TipoAdvogadoEnum")})
    private TipoAdvogadoEnum tipo;
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="IIDPROCESSOCALCULO")
    private Processo processo;

    public Advogado() {
        super(RepositorioDeAdvogado.class);
    }

    public Advogado(TipoAdvogadoEnum tipo) {
        this();
        this.tipo = tipo;
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public TipoDocumentoFiscalEnum getTipoDocumento() {
        return this.tipoDocumento;
    }

    public void setTipoDocumento(TipoDocumentoFiscalEnum tipoDocumento) {
        this.tipoDocumento = tipoDocumento;
    }

    public String getNumeroDocumento() {
        return this.numeroDocumento;
    }

    public void setNumeroDocumento(String numeroDocumento) {
        this.numeroDocumento = numeroDocumento;
    }

    public String getNumeroOAB() {
        return this.numeroOAB;
    }

    public void setNumeroOAB(String numeroOAB) {
        this.numeroOAB = numeroOAB;
    }

    public TipoAdvogadoEnum getTipo() {
        return this.tipo;
    }

    public void setTipo(TipoAdvogadoEnum tipo) {
        this.tipo = tipo;
    }

    public Processo getProcesso() {
        return this.processo;
    }

    public void setProcesso(Processo processo) {
        this.processo = processo;
    }

    @Override
    public Advogado validar() {
        NegocioException excecao = new NegocioException();
        if (this.nome == null || this.nome.isEmpty()) {
            excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "nomeAdvogado" + this.tipo.getNome(), Mensagens.MSG0003, "Nome"));
        }
        if (this.numeroDocumento != null) {
            switch (this.tipoDocumento) {
                case CEI: {
                    if (TipoDocumentoFiscal.CEI.validar(this.numeroDocumento)) break;
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "numeroDocumentoAdvogado" + this.tipo.getNome(), Mensagens.MSG0004, "N\u00famero"));
                    break;
                }
                case CPF: {
                    if (TipoDocumentoFiscal.CPF.validar(this.numeroDocumento)) break;
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "numeroDocumentoAdvogado" + this.tipo.getNome(), Mensagens.MSG0004, "N\u00famero"));
                    break;
                }
                case CNPJ: {
                    if (TipoDocumentoFiscal.CNPJ.validar(this.numeroDocumento)) break;
                    excecao.adicionarMensagemDeRecurso(new MensagemDeRecurso(this, "numeroDocumentoAdvogado" + this.tipo.getNome(), Mensagens.MSG0004, "N\u00famero"));
                }
            }
        }
        if (!excecao.getMensagensDeRecurso().isEmpty()) {
            throw excecao;
        }
        return this;
    }

    public static void remover(Advogado entidade) {
        if (entidade.getId() != null) {
            Advogado.remover(RepositorioDeAdvogado.class, entidade, true);
        }
    }

    public void limparCampos() {
        this.nome = null;
        this.numeroOAB = null;
        this.tipoDocumento = null;
        this.numeroDocumento = null;
    }
}

