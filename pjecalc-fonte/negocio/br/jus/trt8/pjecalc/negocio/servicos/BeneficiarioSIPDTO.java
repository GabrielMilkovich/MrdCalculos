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
import br.jus.trt8.pjecalc.negocio.servicos.PagamentoBeneficiarioSIPDTO;
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
@JsonPropertyOrder(value={"id", "exeqLiquido", "impostoDeRenda", "inssBeneficiario", "inssExecutado", "fgtsDeposito", "custasJudiciais", "pagamentos"})
@JsonWriteNullProperties(value=false)
class BeneficiarioSIPDTO
implements Serializable {
    private static final long serialVersionUID = 1L;
    private String id;
    private BigDecimal exeqLiquido = BigDecimal.ZERO;
    private BigDecimal impostoDeRenda = BigDecimal.ZERO;
    private BigDecimal inssBeneficiario = BigDecimal.ZERO;
    private BigDecimal inssExecutado = BigDecimal.ZERO;
    private BigDecimal fgtsDeposito = BigDecimal.ZERO;
    private BigDecimal custasJudiciais = BigDecimal.ZERO;
    private List<PagamentoBeneficiarioSIPDTO> pagamentos = new ArrayList<PagamentoBeneficiarioSIPDTO>();
    private BigDecimal jurosFgtsDeposito;

    public static void validar(List<BeneficiarioSIPDTO> dtos, int parentIndex) {
        for (int index = 0; index < dtos.size(); ++index) {
            BeneficiarioSIPDTO dto = dtos.get(index);
            if (dto.getId() == null) {
                throw new BadRequestException(String.format("Campo %s obrigat\u00f3rio", String.format("[%d].beneficiarios[%d].id", parentIndex, index)));
            }
            PagamentoBeneficiarioSIPDTO.validar(dto.getPagamentos(), parentIndex, index);
        }
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public BigDecimal getExeqLiquido() {
        return this.exeqLiquido;
    }

    public void setExeqLiquido(BigDecimal exeqLiquido) {
        this.exeqLiquido = exeqLiquido;
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

    public BigDecimal getInssBeneficiario() {
        return this.inssBeneficiario;
    }

    @JsonIgnore
    public BigDecimal getInssBeneficiarioDiferenca(Date data) {
        if (this.pagamentos != null) {
            BigDecimal totalPago = this.pagamentos.stream().filter(p -> HelperDate.dateEquals(p.getPagData(), HelperDate.getInstance(data).addDay(-1).getDate())).map(p -> p.getPagInssBeneficiario()).reduce((valor, acumulado) -> Utils.somar(valor, acumulado)).orElse(BigDecimal.ZERO);
            return Utils.subtrair(this.inssBeneficiario, totalPago);
        }
        return this.inssBeneficiario;
    }

    public void setInssBeneficiario(BigDecimal inssBeneficiario) {
        this.inssBeneficiario = inssBeneficiario;
    }

    public BigDecimal getInssExecutado() {
        return this.inssExecutado;
    }

    @JsonIgnore
    public BigDecimal getInssExecutadoDiferenca(Date data) {
        if (this.pagamentos != null) {
            BigDecimal totalPago = this.pagamentos.stream().filter(p -> HelperDate.dateEquals(p.getPagData(), HelperDate.getInstance(data).addDay(-1).getDate())).map(p -> p.getPagInssExecutado()).reduce((valor, acumulado) -> Utils.somar(valor, acumulado)).orElse(BigDecimal.ZERO);
            return Utils.subtrair(this.inssExecutado, totalPago);
        }
        return this.inssExecutado;
    }

    public void setInssExecutado(BigDecimal inssExecutado) {
        this.inssExecutado = inssExecutado;
    }

    public BigDecimal getFgtsDeposito() {
        return this.fgtsDeposito;
    }

    public void setFgtsDeposito(BigDecimal fgtsDeposito) {
        this.fgtsDeposito = fgtsDeposito;
    }

    public BigDecimal getCustasJudiciais() {
        return this.custasJudiciais;
    }

    @JsonIgnore
    public BigDecimal getCustasJudiciaisDiferenca(Date data) {
        if (this.pagamentos != null) {
            BigDecimal totalPago = this.pagamentos.stream().filter(p -> HelperDate.dateEquals(p.getPagData(), HelperDate.getInstance(data).addDay(-1).getDate())).map(p -> p.getPagCustasJudiciais()).reduce((valor, acumulado) -> Utils.somar(valor, acumulado)).orElse(BigDecimal.ZERO);
            return Utils.subtrair(this.custasJudiciais, totalPago);
        }
        return this.custasJudiciais;
    }

    public void setCustasJudiciais(BigDecimal custasJudiciais) {
        this.custasJudiciais = custasJudiciais;
    }

    public List<PagamentoBeneficiarioSIPDTO> getPagamentos() {
        return this.pagamentos;
    }

    public void setPagamentos(List<PagamentoBeneficiarioSIPDTO> pagamentos) {
        this.pagamentos = pagamentos;
    }

    @JsonIgnore
    public BigDecimal getJurosFgtsDeposito() {
        return this.jurosFgtsDeposito;
    }

    public void setJurosFgtsDeposito(BigDecimal jurosFgtsDeposito) {
        this.jurosFgtsDeposito = jurosFgtsDeposito;
    }
}

