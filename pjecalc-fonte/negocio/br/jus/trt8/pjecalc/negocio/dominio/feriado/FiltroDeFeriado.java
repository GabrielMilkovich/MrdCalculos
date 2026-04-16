/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.hibernate.Criteria
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.feriado;

import br.jus.trt8.pjecalc.base.comum.CriteriosDePesquisa;
import br.jus.trt8.pjecalc.base.comum.FiltroBase;
import br.jus.trt8.pjecalc.negocio.constantes.AbrangenciaDoFeriadoEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoFeriadoEnum;
import br.jus.trt8.pjecalc.negocio.dominio.estado.Estado;
import br.jus.trt8.pjecalc.negocio.dominio.feriado.Feriado;
import br.jus.trt8.pjecalc.negocio.dominio.feriado.RepositorioDeFeriado;
import br.jus.trt8.pjecalc.negocio.dominio.municipio.Municipio;
import java.io.Serializable;
import java.util.List;
import org.hibernate.Criteria;
import org.jboss.seam.annotations.Name;

@Name(value="filtroDeFeriado")
public class FiltroDeFeriado
extends FiltroBase<Feriado>
implements Serializable {
    private static final long serialVersionUID = 1378251711872602457L;
    private String nomeFeriado;
    private Estado estado;
    private Municipio municipio;
    private AbrangenciaDoFeriadoEnum abrangencia;
    private TipoFeriadoEnum tipo;

    public FiltroDeFeriado() {
        super(RepositorioDeFeriado.class);
    }

    public FiltroDeFeriado(AbrangenciaDoFeriadoEnum abrangencia, TipoFeriadoEnum tipo) {
        super(RepositorioDeFeriado.class);
        this.abrangencia = abrangencia;
        this.tipo = tipo;
    }

    @Override
    protected void elaborarCriterio(Criteria criteria) {
    }

    @Override
    public List<Feriado> filtrar() {
        CriteriosDePesquisa criterios = new CriteriosDePesquisa("nomeFeriado asc, data desc");
        if (this.nomeFeriado != null && !this.nomeFeriado.equals("")) {
            criterios.adicionarCriterio("and", "nomeFeriado like ?", "%" + this.nomeFeriado.toUpperCase() + "%");
        }
        if (this.estado != null) {
            criterios.adicionarCriterio("and", "estado = ?", this.estado);
        }
        if (this.municipio != null) {
            criterios.adicionarCriterio("and", "municipio = ?", this.municipio);
        }
        if (this.abrangencia != null) {
            criterios.adicionarCriterio("and", "abrangencia = ?", new Object[]{this.abrangencia});
        }
        if (this.tipo != null) {
            criterios.adicionarCriterio("and", "tipo = ?", new Object[]{this.tipo});
        }
        return ((RepositorioDeFeriado)this.getRepositorio()).pesquisar(criterios.getOrderBy(), criterios.getClausulaWhere().toString(), criterios.getParametros().toArray());
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

    public String getNomeFeriado() {
        return this.nomeFeriado;
    }

    public void setNomeFeriado(String nomeFeriado) {
        this.nomeFeriado = nomeFeriado;
    }

    public AbrangenciaDoFeriadoEnum getAbrangencia() {
        return this.abrangencia;
    }

    public void setAbrangencia(AbrangenciaDoFeriadoEnum abrangencia) {
        this.abrangencia = abrangencia;
    }

    public TipoFeriadoEnum getTipo() {
        return this.tipo;
    }

    public void setTipo(TipoFeriadoEnum tipo) {
        this.tipo = tipo;
    }
}

