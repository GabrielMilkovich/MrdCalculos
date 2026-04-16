/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.xml.bind.annotation.XmlRootElement
 *  org.codehaus.jackson.annotate.JsonAutoDetect
 *  org.codehaus.jackson.annotate.JsonIgnoreProperties
 *  org.codehaus.jackson.annotate.JsonPropertyOrder
 *  org.codehaus.jackson.annotate.JsonWriteNullProperties
 *  org.jboss.resteasy.spi.BadRequestException
 */
package br.jus.trt8.pjecalc.negocio.servicos;

import br.jus.trt8.pjecalc.negocio.constantes.EsferaPrecatorioEnum;
import br.jus.trt8.pjecalc.negocio.constantes.TipoPrecatorioEnum;
import br.jus.trt8.pjecalc.negocio.servicos.BeneficiarioSIPDTO;
import br.jus.trt8.pjecalc.negocio.servicos.TerceiroInteressadoSIPDTO;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.xml.bind.annotation.XmlRootElement;
import org.codehaus.jackson.annotate.JsonAutoDetect;
import org.codehaus.jackson.annotate.JsonIgnoreProperties;
import org.codehaus.jackson.annotate.JsonPropertyOrder;
import org.codehaus.jackson.annotate.JsonWriteNullProperties;
import org.jboss.resteasy.spi.BadRequestException;

@XmlRootElement
@JsonAutoDetect
@JsonIgnoreProperties(ignoreUnknown=true)
@JsonPropertyOrder(value={"id", "tipo", "esfera", "dataUltimaAtualizacao", "dataExpedicao", "dataFim", "beneficiarios", "terceirosInteressados", "juros"})
@JsonWriteNullProperties(value=false)
public class AtualizacaoPrecatorioSIPDTO
implements Serializable {
    private static final long serialVersionUID = 1L;
    private String id;
    private TipoPrecatorioEnum tipo = TipoPrecatorioEnum.PRE;
    private EsferaPrecatorioEnum esfera = EsferaPrecatorioEnum.F;
    private Date dataUltimaAtualizacao;
    private Date dataExpedicao;
    private Date dataFim;
    private List<BeneficiarioSIPDTO> beneficiarios = new ArrayList<BeneficiarioSIPDTO>();
    private List<TerceiroInteressadoSIPDTO> terceirosInteressados = new ArrayList<TerceiroInteressadoSIPDTO>();
    private BigDecimal juros = BigDecimal.ZERO;
    protected static final String CAMPO_OBRIGATORIO_MESSAGE_TEMPLATE = "Campo %s obrigat\u00f3rio";

    public AtualizacaoPrecatorioSIPDTO() {
    }

    public static void validar(List<AtualizacaoPrecatorioSIPDTO> dtos) {
        for (int index = 0; index < dtos.size(); ++index) {
            AtualizacaoPrecatorioSIPDTO dto = dtos.get(index);
            if (dto.getId() == null) {
                throw new BadRequestException(String.format(CAMPO_OBRIGATORIO_MESSAGE_TEMPLATE, String.format("[%d].id", index)));
            }
            if (dto.getDataUltimaAtualizacao() == null) {
                throw new BadRequestException(String.format(CAMPO_OBRIGATORIO_MESSAGE_TEMPLATE, String.format("[%d].dataUltimaAtualizacao", index)));
            }
            if (dto.getDataExpedicao() == null) {
                throw new BadRequestException(String.format(CAMPO_OBRIGATORIO_MESSAGE_TEMPLATE, String.format("[%d].dataExpedicao", index)));
            }
            if (dto.getDataFim() == null) {
                throw new BadRequestException(String.format(CAMPO_OBRIGATORIO_MESSAGE_TEMPLATE, String.format("[%d].dataFim", index)));
            }
            BeneficiarioSIPDTO.validar(dto.getBeneficiarios(), index);
            TerceiroInteressadoSIPDTO.validar(dto.getTerceirosInteressados(), index);
        }
    }

    public AtualizacaoPrecatorioSIPDTO(AtualizacaoPrecatorioSIPDTO precatorio) {
        this.id = precatorio.getId();
        this.tipo = precatorio.getTipo();
        this.esfera = precatorio.getEsfera();
        this.dataUltimaAtualizacao = precatorio.getDataUltimaAtualizacao();
        this.dataExpedicao = precatorio.getDataExpedicao();
        this.dataFim = precatorio.getDataFim();
    }

    public List<BeneficiarioSIPDTO> getBeneficiarios() {
        return this.beneficiarios;
    }

    public void setBeneficiarios(List<BeneficiarioSIPDTO> beneficiarios) {
        this.beneficiarios = beneficiarios;
    }

    public List<TerceiroInteressadoSIPDTO> getTerceirosInteressados() {
        return this.terceirosInteressados;
    }

    public void setTerceirosInteressados(List<TerceiroInteressadoSIPDTO> terceirosInteressados) {
        this.terceirosInteressados = terceirosInteressados;
    }

    public BigDecimal getJuros() {
        return this.juros;
    }

    public void setJuros(BigDecimal juros) {
        this.juros = juros;
    }

    public Date getDataUltimaAtualizacao() {
        return this.dataUltimaAtualizacao;
    }

    public void setDataUltimaAtualizacao(Date dataUltimaAtualizacao) {
        this.dataUltimaAtualizacao = dataUltimaAtualizacao;
    }

    public String getId() {
        return this.id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public TipoPrecatorioEnum getTipo() {
        return this.tipo;
    }

    public void setTipo(TipoPrecatorioEnum tipo) {
        this.tipo = tipo;
    }

    public EsferaPrecatorioEnum getEsfera() {
        return this.esfera;
    }

    public void setEsfera(EsferaPrecatorioEnum esfera) {
        this.esfera = esfera;
    }

    public Date getDataExpedicao() {
        return this.dataExpedicao;
    }

    public void setDataExpedicao(Date dataExpedicao) {
        this.dataExpedicao = dataExpedicao;
    }

    public Date getDataFim() {
        return this.dataFim;
    }

    public void setDataFim(Date dataFim) {
        this.dataFim = dataFim;
    }
}

