/*
 * Decompiled with CFR 0.152.
 */
package br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios;

import br.jus.trt8.pjecalc.base.comum.Utils;
import br.jus.trt8.pjecalc.negocio.constantes.TipoDocumentoFiscalEnum;

public class CredorVO {
    private static final String NAO_INFORMADO = " n\u00e3o informado";
    private String nome;
    private TipoDocumentoFiscalEnum tipoDocumentoFiscalCredor;
    private String numeroDocumentoFiscalCredor;

    public String getNome() {
        return this.nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public TipoDocumentoFiscalEnum getTipoDocumentoFiscalCredor() {
        return this.tipoDocumentoFiscalCredor;
    }

    public void setTipoDocumentoFiscalCredor(TipoDocumentoFiscalEnum tipoDocumentoFiscalCredor) {
        this.tipoDocumentoFiscalCredor = tipoDocumentoFiscalCredor;
    }

    public String getNumeroDocumentoFiscalCredor() {
        return this.numeroDocumentoFiscalCredor;
    }

    public void setNumeroDocumentoFiscalCredor(String numeroDocumentoFiscalCredor) {
        this.numeroDocumentoFiscalCredor = numeroDocumentoFiscalCredor;
    }

    public String getRepresentacaoTextual() {
        StringBuilder sb = new StringBuilder();
        if (Utils.naoNulo(this.nome)) {
            sb.append(this.nome);
        } else {
            sb.append("Nome");
            sb.append(NAO_INFORMADO);
        }
        sb.append(" - ");
        if (Utils.naoNulo((Object)this.tipoDocumentoFiscalCredor)) {
            sb.append((Object)this.tipoDocumentoFiscalCredor);
        } else {
            sb.append("Tipo de Documento");
            sb.append(NAO_INFORMADO);
        }
        sb.append(": ");
        if (Utils.naoNulo(this.numeroDocumentoFiscalCredor)) {
            sb.append(this.numeroDocumentoFiscalCredor);
        } else {
            sb.append("N\u00famero de Documento");
            sb.append(NAO_INFORMADO);
        }
        return sb.toString();
    }

    public static CredorVO converteCredor(String selecao) {
        CredorVO credorVO = new CredorVO();
        if (Utils.naoNulo(selecao) && !selecao.equals("Preencher Dados...")) {
            String numeroDocumento;
            String tipoDocumento;
            String nome = selecao.split(" - ")[0];
            if (!nome.contains(NAO_INFORMADO)) {
                credorVO.setNome(nome);
            }
            if (!(tipoDocumento = selecao.split(" - ")[1].split(": ")[0]).contains(NAO_INFORMADO)) {
                credorVO.setTipoDocumentoFiscalCredor(TipoDocumentoFiscalEnum.valueOf(tipoDocumento));
            }
            if (!(numeroDocumento = selecao.split(" - ")[1].split(": ")[1]).contains(NAO_INFORMADO)) {
                credorVO.setNumeroDocumentoFiscalCredor(numeroDocumento);
            }
        }
        return credorVO;
    }
}

