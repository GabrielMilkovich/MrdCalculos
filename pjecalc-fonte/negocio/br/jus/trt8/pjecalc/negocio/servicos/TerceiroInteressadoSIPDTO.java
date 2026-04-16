/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.codehaus.jackson.annotate.JsonAutoDetect
 *  org.codehaus.jackson.annotate.JsonIgnore
 *  org.codehaus.jackson.annotate.JsonIgnoreProperties
 *  org.codehaus.jackson.annotate.JsonPropertyOrder
 *  org.codehaus.jackson.annotate.JsonWriteNullProperties
 *  org.jboss.resteasy.spi.BadRequestException
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.TipoTerceirosInteressadosEnum;
import br.jus.trt8.pjecalc.negocio.servicos.PagamentoTerceiroSIPDTO;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.codehaus.jackson.annotate.JsonAutoDetect;
import org.codehaus.jackson.annotate.JsonIgnore;
import org.codehaus.jackson.annotate.JsonIgnoreProperties;
import org.codehaus.jackson.annotate.JsonPropertyOrder;
import org.codehaus.jackson.annotate.JsonWriteNullProperties;
import org.jboss.resteasy.spi.BadRequestException;

@JsonAutoDetect
@JsonIgnoreProperties(ignoreUnknown=true)
@JsonPropertyOrder(value={"id", "tipo", "liquido", "impostoDeRenda", "pagamentos"})
@JsonWriteNullProperties(value=false)
class TerceiroInteressadoSIPDTO
implements Serializable {
    private static final long serialVersionUID = 1L;
    private String id;
    private TipoTerceirosInteressadosEnum tipo = TipoTerceirosInteressadosEnum.ADV;
    private BigDecimal liquido = BigDecimal.ZERO;
    private BigDecimal impostoDeRenda = BigDecimal.ZERO;
    private List<PagamentoTerceiroSIPDTO> pagamentos = new ArrayList<PagamentoTerceiroSIPDTO>();
    private BigDecimal jurosTotal;

    public static void validar(List<TerceiroInteressadoSIPDTO> dtos, int parentIndex) {
        for (int index = 0; index < dtos.size(); ++index) {
            TerceiroInteressadoSIPDTO dto = dtos.get(index);
            if (dto.getId() == null) {
                throw new BadRequestException(String.format("Campo %s obrigat\u00f3rio", String.format("[%d].terceirosInteressados[%d].id", parentIndex, index)));
            }
            PagamentoTerceiroSIPDTO.validar(dto.getPagamentos(), parentIndex, index);
        }
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public TipoTerceirosInteressadosEnum getTipo() {
        return this.tipo;
    }

    public void setTipo(TipoTerceirosInteressadosEnum tipo) {
        this.tipo = tipo;
    }

    public BigDecimal getLiquido() {
        return this.liquido;
    }

    @JsonIgnore
    public BigDecimal getLiquidoDiferenca(Date data) {
        if (this.pagamentos != null) {
            BigDecimal totalPago = this.pagamentos.stream().filter(p -> HelperDate.dateEquals(p.getPagData(), HelperDate.getInstance(data).addDay(-1).getDate())).map(p -> p.getPagLiquido()).reduce((valor, acumulado) -> Utils.somar(valor, acumulado)).orElse(BigDecimal.ZERO);
            return Utils.subtrair(this.liquido, totalPago);
        }
        return this.liquido;
    }

    public void setLiquido(BigDecimal liquido) {
        this.liquido = liquido;
    }

    public BigDecimal getImpostoDeRenda() {
        return this.impostoDeRenda;
    }

    @JsonIgnore
    public BigDecimal getImpostoDeRendaDiferenca(Date data) {
        if (this.pagamentos != null) {
            BigDecimal totalPago = this.pagamentos.stream().filter(p -> HelperDate.dateEquals(p.getPagData(), HelperDate.getInstance(data).addDay(-1).getDate())).map(p -> p.getPagImpostoDeRenda()).reduce((valor, acumulado) -> Utils.somar(valor, acumulado)).orElse(BigDecimal.ZERO);
            return Utils.subtrair(this.impostoDeRenda, totalPago);
        }
        return this.impostoDeRenda;
    }

    public void setImpostoDeRenda(BigDecimal impostoDeRenda) {
        this.impostoDeRenda = impostoDeRenda;
    }

    public List<PagamentoTerceiroSIPDTO> getPagamentos() {
        return this.pagamentos;
    }

    public void setPagamentos(List<PagamentoTerceiroSIPDTO> pagamentos) {
        this.pagamentos = pagamentos;
    }

    @JsonIgnore
    public BigDecimal getJurosTotal() {
        return this.jurosTotal;
    }

    public void setJurosTotal(BigDecimal jurosTotal) {
        this.jurosTotal = jurosTotal;
    }
}

