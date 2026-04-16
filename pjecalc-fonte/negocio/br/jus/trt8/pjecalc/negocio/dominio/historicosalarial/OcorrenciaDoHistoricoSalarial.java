/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.EnumType
 *  javax.persistence.Enumerated
 *  javax.persistence.GeneratedValue
 *  javax.persistence.GenerationType
 *  javax.persistence.Id
 *  javax.persistence.JoinColumn
 *  javax.persistence.ManyToOne
 *  javax.persistence.SequenceGenerator
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  javax.persistence.Version
 *  org.hibernate.annotations.Type
 *  org.hibernate.validator.NotNull
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.historicosalarial;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.HistoricoSalarial;
import br.jus.trt8.pjecalc.negocio.dominio.historicosalarial.RepositorioDeOcorrenciaDoHistoricoSalarial;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Version;
import org.hibernate.annotations.Type;
import org.hibernate.validator.NotNull;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBOCORRENCIAHISTORICOSALARIAL")
@SequenceGenerator(name="SQOCORRENCIAHISTORICOSALARIAL", sequenceName="SQOCORRENCIAHISTORICOSALARIAL", allocationSize=1)
@Name(value="ocorrenciaDoHistoricoSalarial")
public class OcorrenciaDoHistoricoSalarial
extends EntidadeBase
implements Serializable,
Comparable<OcorrenciaDoHistoricoSalarial> {
    private static final long serialVersionUID = -5150355019386370366L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQOCORRENCIAHISTORICOSALARIAL")
    @Column(name="IIDOCORRENCIAHISTORICOSALARIAL")
    private final Long id = null;
    @Version
    @Column(name="IIDVERSAO")
    private Long versao = 0L;
    @ManyToOne
    @JoinColumn(name="IIDHISTORICOSALARIAL")
    private HistoricoSalarial historicoSalarial;
    @Column(name="DDTOCORRENCIA")
    @Temporal(value=TemporalType.DATE)
    @NotNull
    private Date dataOcorrencia;
    @Column(name="MVLOCORRENCIA", precision=12, scale=2)
    @NotNull
    private BigDecimal valor;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLFGTSRECOLHIDO", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean recolhidoFGTS = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLINSSRECOLHIDO", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean recolhidoINSS = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLBASEFGTS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean incidenciaFGTS = false;
    @Enumerated(value=EnumType.STRING)
    @Column(name="SFLBASEINSS", nullable=false, columnDefinition="CHAR(1)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.BooleanUserType")
    @NotNull
    private Boolean incidenciaINSS = false;

    public OcorrenciaDoHistoricoSalarial() {
        super(RepositorioDeOcorrenciaDoHistoricoSalarial.class);
    }

    public OcorrenciaDoHistoricoSalarial(HistoricoSalarial historicoSalarial, Date dataOcorrencia, BigDecimal valor, Boolean recolhidoFGTS, Boolean recolhidoINSS, Boolean incidenciaFGTS, Boolean incidenciaINSS) {
        super(RepositorioDeOcorrenciaDoHistoricoSalarial.class);
        this.historicoSalarial = historicoSalarial;
        this.dataOcorrencia = dataOcorrencia;
        this.valor = valor;
        this.recolhidoFGTS = recolhidoFGTS;
        this.recolhidoINSS = recolhidoINSS;
        this.incidenciaFGTS = incidenciaFGTS;
        this.incidenciaINSS = incidenciaINSS;
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

    public HistoricoSalarial getHistoricoSalarial() {
        return this.historicoSalarial;
    }

    public void setHistoricoSalarial(HistoricoSalarial historicoSalarial) {
        this.historicoSalarial = historicoSalarial;
    }

    public Date getDataOcorrencia() {
        return this.dataOcorrencia;
    }

    public void setDataOcorrencia(Date dataOcorrencia) {
        this.dataOcorrencia = dataOcorrencia;
    }

    public BigDecimal getValor() {
        return this.valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public Boolean getRecolhidoFGTS() {
        return this.recolhidoFGTS;
    }

    public void setRecolhidoFGTS(Boolean recolhidoFGTS) {
        this.recolhidoFGTS = recolhidoFGTS;
    }

    public Boolean getRecolhidoINSS() {
        return this.recolhidoINSS;
    }

    public void setRecolhidoINSS(Boolean recolhidoINSS) {
        this.recolhidoINSS = recolhidoINSS;
    }

    public Boolean getIncidenciaFGTS() {
        return this.incidenciaFGTS;
    }

    public void setIncidenciaFGTS(Boolean incidenciaFGTS) {
        this.incidenciaFGTS = incidenciaFGTS;
    }

    public Boolean getIncidenciaINSS() {
        return this.incidenciaINSS;
    }

    public void setIncidenciaINSS(Boolean incidenciaINSS) {
        this.incidenciaINSS = incidenciaINSS;
    }

    public Long getId() {
        return this.id;
    }

    @Override
    public void salvar() {
        super.salvar();
    }

    public static void remover(OcorrenciaDoHistoricoSalarial ocorrenciaDoHistoricoSalarial) {
        if (Utils.naoNulo(ocorrenciaDoHistoricoSalarial.getId())) {
            OcorrenciaDoHistoricoSalarial.remover(RepositorioDeOcorrenciaDoHistoricoSalarial.class, ocorrenciaDoHistoricoSalarial, Boolean.TRUE);
        }
    }

    @Override
    public int compareTo(OcorrenciaDoHistoricoSalarial o) {
        return this.dataOcorrencia.compareTo(o.getDataOcorrencia());
    }

    @Override
    public int hashCode() {
        int prime = 31;
        int result = super.hashCode();
        result = 31 * result + (this.dataOcorrencia == null ? 0 : this.dataOcorrencia.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (this.getClass() != obj.getClass()) {
            return false;
        }
        OcorrenciaDoHistoricoSalarial other = (OcorrenciaDoHistoricoSalarial)obj;
        return !(this.dataOcorrencia == null ? other.dataOcorrencia != null : !this.dataOcorrencia.equals(other.dataOcorrencia));
    }
}

