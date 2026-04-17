/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.codehaus.jackson.annotate.JsonAutoDetect
 *  org.codehaus.jackson.annotate.JsonIgnoreProperties
 *  org.codehaus.jackson.annotate.JsonPropertyOrder
 *  org.codehaus.jackson.annotate.JsonWriteNullProperties
 *  org.jboss.resteasy.spi.BadRequestException
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.base.comum.HelperDate;
import br.jus.trt8.pjecalc.base.comum.Utils;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import org.codehaus.jackson.annotate.JsonAutoDetect;
import org.codehaus.jackson.annotate.JsonIgnoreProperties;
import org.codehaus.jackson.annotate.JsonPropertyOrder;
import org.codehaus.jackson.annotate.JsonWriteNullProperties;
import org.jboss.resteasy.spi.BadRequestException;

@JsonAutoDetect
@JsonIgnoreProperties(ignoreUnknown=true)
@JsonPropertyOrder(value={"pagData", "pagExeqLiquido", "pagImpostoDeRenda", "pagInssBeneficiario", "pagInssExecutado", "pagFgtsDeposito", "pagCustasJudiciais"})
@JsonWriteNullProperties(value=false)
class PagamentoTerceiroSIPDTO
implements Serializable {
    private static final long serialVersionUID = 1L;
    private Date pagData;
    private BigDecimal pagLiquido = BigDecimal.ZERO;
    private BigDecimal pagImpostoDeRenda = BigDecimal.ZERO;

    public static void validar(List<PagamentoTerceiroSIPDTO> dtos, int rootIndex, int parentIndex) {
        for (int index = 0; index < dtos.size(); ++index) {
            PagamentoTerceiroSIPDTO dto = dtos.get(index);
            if (dto.getPagData() != null) continue;
            throw new BadRequestException(String.format("Campo %s obrigat\u00f3rio", String.format("[%d].terceirosInteressados[%d].pagamentos[%d].pagData", rootIndex, parentIndex, index)));
        }
    }

    public static BigDecimal calcularTotalPagoLiquido(List<PagamentoTerceiroSIPDTO> pagamentos, Date data) {
        return pagamentos.stream().filter(p -> HelperDate.dateEquals(p.getPagData(), HelperDate.getInstance(data).addDay(-1).getDate())).map(p -> p.getPagLiquido()).reduce((valor, acumulado) -> Utils.somar(valor, acumulado)).orElse(BigDecimal.ZERO);
    }

    public Date getPagData() {
        return this.pagData;
    }

    public void setPagData(Date pagData) {
        this.pagData = pagData;
    }

    public BigDecimal getPagLiquido() {
        return this.pagLiquido;
    }

    public void setPagLiquido(BigDecimal pagLiquido) {
        this.pagLiquido = pagLiquido;
    }

    public BigDecimal getPagImpostoDeRenda() {
        return this.pagImpostoDeRenda;
    }

    public void setPagImpostoDeRenda(BigDecimal pagImpostoDeRenda) {
        this.pagImpostoDeRenda = pagImpostoDeRenda;
    }
}

