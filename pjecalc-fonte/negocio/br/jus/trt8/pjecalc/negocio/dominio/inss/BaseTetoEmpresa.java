/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.Column
 *  javax.persistence.Entity
 *  javax.persistence.Id
 *  javax.persistence.Table
 *  javax.persistence.Temporal
 *  javax.persistence.TemporalType
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.inss;

import br.jus.trt8.pjecalc.base.comum.EntidadeBase;
import br.jus.trt8.pjecalc.negocio.dominio.inss.RepositorioDeBaseTetoEmpresa;
import java.math.BigDecimal;
import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBTABELABASETETOINSS")
@Name(value="baseTetoEmpresa")
public class BaseTetoEmpresa
extends EntidadeBase {
    private static final long serialVersionUID = -869657929099800809L;
    @Id
    @Column(name="DDTCOMPETENCIA", nullable=false)
    @Temporal(value=TemporalType.DATE)
    private Date competencia;
    @Column(name="RVLBASETETO", precision=19, scale=2)
    private BigDecimal baseTeto;

    public BaseTetoEmpresa() {
        super(RepositorioDeBaseTetoEmpresa.class);
    }

    @Override
    public Object obterChavePrimaria() {
        return this.getCompetencia();
    }

    public Date getCompetencia() {
        return this.competencia;
    }

    public BigDecimal getBaseTeto() {
        return this.baseTeto;
    }

    public static BaseTetoEmpresa obter(Object id) {
        return (BaseTetoEmpresa)BaseTetoEmpresa.obter(RepositorioDeBaseTetoEmpresa.class, id);
    }
}

