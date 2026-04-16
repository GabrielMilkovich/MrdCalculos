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
 *  org.hibernate.annotations.Parameter
 *  org.hibernate.annotations.Type
 *  org.jboss.seam.annotations.Name
 */
package br.jus.trt8.pjecalc.negocio.dominio.termo;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.LogicoFuzzy;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.comum.MensagemDeRecurso;
import br.jus.trt8.pjecalc.negocio.comum.exceptions.NegocioException;
import br.jus.trt8.pjecalc.negocio.constantes.DivisorDeVerbaEnum;
import br.jus.trt8.pjecalc.negocio.constantes.Mensagens;
import br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.OcorrenciaDoCartaoDePonto;
import br.jus.trt8.pjecalc.negocio.dominio.termo.ParametroDoTermo;
import br.jus.trt8.pjecalc.negocio.dominio.termo.Termo;
import br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.CartaoDePontoDaVerba;
import java.math.BigDecimal;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.SequenceGenerator;
import javax.persistence.Table;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.jboss.seam.annotations.Name;

@Entity
@Table(name="TBTERMODIVISOR")
@SequenceGenerator(name="SQTERMODIVISOR", sequenceName="SQTERMODIVISOR", allocationSize=1)
@Name(value="divisor")
public class Divisor
implements Termo {
    private static final long serialVersionUID = -2451166013957418885L;
    @Id
    @GeneratedValue(strategy=GenerationType.SEQUENCE, generator="SQTERMODIVISOR")
    @Column(name="IIDTERMODIVISOR")
    private final Long id = null;
    @Column(name="STPDIVISOR", columnDefinition="VARCHAR2(2)")
    @Type(type="br.jus.trt8.pjecalc.base.comum.EnumUserType", parameters={@Parameter(name="enum", value="DivisorDeVerbaEnum")})
    private DivisorDeVerbaEnum tipo = DivisorDeVerbaEnum.OUTRO_VALOR;
    @Column(name="RVLOUTROVALOR", precision=38, scale=25)
    private BigDecimal outroValor;

    @Override
    public BigDecimal resolverValor(ParametroDoTermo parametro) {
        if (this.tipo == DivisorDeVerbaEnum.OUTRO_VALOR) {
            return this.outroValor;
        }
        if (this.tipo == DivisorDeVerbaEnum.CARGA_HORARIA) {
            BigDecimal valorCargaHoraria = parametro.getCalculo().getValorCargaHoraria(parametro.getPeriodo());
            return valorCargaHoraria != null ? valorCargaHoraria : null;
        }
        if (this.tipo == DivisorDeVerbaEnum.DIAS_UTEIS) {
            LogicoFuzzy<?> sabadoDiaUtil = parametro.getCalculo().getSabadoDiaUtilComExcecao();
            return new BigDecimal(parametro.getPeriodo().totalDeDiasUteis(sabadoDiaUtil != null ? sabadoDiaUtil : LogicoFuzzy.FALSO));
        }
        if (this.tipo == DivisorDeVerbaEnum.IMPORTADA_DO_CARTAO) {
            BigDecimal valor = BigDecimal.ZERO;
            for (CartaoDePontoDaVerba cdpv : parametro.getVerbaDeCalculo().getCartoesDePontoDaVerbaDivisor()) {
                for (OcorrenciaDoCartaoDePonto ocdp : cdpv.getCartaoDePonto().obterOcorrencias()) {
                    if (!HelperDate.compareMonthAndYear(parametro.getPeriodo().getInicial(), ocdp.getDataOcorrencia())) continue;
                    valor = valor.add(ocdp.getValor());
                }
            }
            return valor;
        }
        throw new NegocioException(new MensagemDeRecurso(Mensagens.MSG0018, "Divisor '" + this.tipo.getNome() + "' n\u00e3o dispon\u00edvel para essa vers\u00e3o"));
    }

    public DivisorDeVerbaEnum getTipo() {
        return this.tipo;
    }

    public void setTipo(DivisorDeVerbaEnum tipo) {
        this.tipo = tipo;
    }

    public BigDecimal getOutroValor() {
        return this.outroValor;
    }

    public void setOutroValor(BigDecimal outroValor) {
        this.outroValor = outroValor;
    }

    public Long getId() {
        return this.id;
    }

    public String toString() {
        if (this.tipo == DivisorDeVerbaEnum.OUTRO_VALOR && this.outroValor != null) {
            return Utils.formatarNumero(this.outroValor);
        }
        return this.tipo != null ? this.tipo.getNome() : "Divisor";
    }

    public int hashCode() {
        int prime = 31;
        int result = 1;
        result = 31 * result + (this.id == null ? 0 : this.id.hashCode());
        result = 31 * result + (this.outroValor == null ? 0 : this.outroValor.hashCode());
        result = 31 * result + (this.tipo == null ? 0 : this.tipo.hashCode());
        return result;
    }

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
        Divisor other = (Divisor)obj;
        if (this.id == null ? other.id != null : !this.id.equals(other.id)) {
            return false;
        }
        if (this.outroValor == null ? other.outroValor != null : !this.outroValor.equals(other.outroValor)) {
            return false;
        }
        return this.tipo == other.tipo;
    }
}

