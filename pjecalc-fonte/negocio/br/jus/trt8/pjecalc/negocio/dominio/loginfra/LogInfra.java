/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.apache.commons.lang.StringUtils
 *  org.jboss.seam.annotations.Name
 *  org.jboss.seam.security.Identity
 */
package br.jus.trt8.pjecalc.negocio.dominio.loginfra;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.comum.api.Identidade;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.InfraException;
import br.jus.trt8.pjecalc.negocio.dominio.loginfra.RepositorioDeLogInfra;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.apache.commons.lang.StringUtils;
import org.jboss.seam.annotations.Name;
import org.jboss.seam.security.Identity;

@Entity
@Table(name="TBLOGINFRA")
@SequenceGenerator(name="SQLOGINFRA", sequenceName="SQLOGINFRA", allocationSize=1)
@Name(value="logInfra")
public class LogInfra
extends EntidadeBase {
    private static final long serialVersionUID = 2479442817938402699L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQLOGINFRA")
    @Column(name="IIDLOGINFRA")
    private Long id;
    @Column(name="DDTOCORRENCIA", nullable=false)
    @Temporal(value=TemporalType.TIMESTAMP)
    private Date ocorrencia;
    @Column(name="SNRCPF")
    private String cpf;
    @Column(name="SNMDESCRICAO", columnDefinition="VARCHAR2(4000)")
    private String descricao;
    @Column(name="SNMDETALHE", columnDefinition="CLOB")
    private String detalhe;

    public LogInfra() {
        super(RepositorioDeLogInfra.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getId();
    }

    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Date getOcorrencia() {
        return this.ocorrencia;
    }

    public void setOcorrencia(Date ocorrencia) {
        this.ocorrencia = ocorrencia;
    }

    public String getCpf() {
        return this.cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public String getDescricao() {
        return this.descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public String getDetalhe() {
        return this.detalhe;
    }

    public void setDetalhe(String detalhe) {
        this.detalhe = detalhe;
    }

    @Override
    protected void salvar() {
        super.salvar();
    }

    public static LogInfra salvar(InfraException exception) {
        StringWriter stackTrace = new StringWriter();
        exception.printStackTrace(new PrintWriter(stackTrace));
        String login = ((Identidade)Identity.instance()).getCpf();
        String cpf = null;
        int tamanhoCpf = 11;
        cpf = StringUtils.isNotBlank((String)login) ? (login.length() > 11 ? login.substring(0, 11) : login) : StringUtils.leftPad(cpf, (int)11, (String)"0");
        LogInfra logInfra = new LogInfra();
        logInfra.setOcorrencia(new Date());
        logInfra.setCpf(cpf);
        logInfra.setDescricao(exception.getMessage());
        logInfra.setDetalhe(stackTrace.toString());
        logInfra.salvar();
        return logInfra;
    }
}

