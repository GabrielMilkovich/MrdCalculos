/**
 * PJe-Calc v2.15.1 — CredorVO
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.calculo.honorarios.CredorVO
 *
 * Ref Java: pjecalc-fonte/.../calculo/honorarios/CredorVO.java
 *
 * ViewObject para identificar um credor de honorário (nome + tipo/num doc).
 * `getRepresentacaoTextual()` é usado no combobox de seleção da UI;
 * `converteCredor(str)` faz o parse reverso.
 */
import { TipoDocumentoFiscalEnum } from '../../../constantes/enums';

const NAO_INFORMADO = ' não informado';

export class CredorVO {
  private nome: string | null = null;
  private tipoDocumentoFiscalCredor: TipoDocumentoFiscalEnum | null = null;
  private numeroDocumentoFiscalCredor: string | null = null;

  getNome(): string | null { return this.nome; }
  setNome(v: string | null): void { this.nome = v; }

  getTipoDocumentoFiscalCredor(): TipoDocumentoFiscalEnum | null { return this.tipoDocumentoFiscalCredor; }
  setTipoDocumentoFiscalCredor(v: TipoDocumentoFiscalEnum | null): void {
    this.tipoDocumentoFiscalCredor = v;
  }

  getNumeroDocumentoFiscalCredor(): string | null { return this.numeroDocumentoFiscalCredor; }
  setNumeroDocumentoFiscalCredor(v: string | null): void {
    this.numeroDocumentoFiscalCredor = v;
  }

  /** getRepresentacaoTextual (Java linha 39) — string p/ combobox UI. */
  getRepresentacaoTextual(): string {
    let s = '';
    s += this.nome !== null ? this.nome : `Nome${NAO_INFORMADO}`;
    s += ' - ';
    s += this.tipoDocumentoFiscalCredor !== null
      ? this.tipoDocumentoFiscalCredor
      : `Tipo de Documento${NAO_INFORMADO}`;
    s += ': ';
    s += this.numeroDocumentoFiscalCredor !== null
      ? this.numeroDocumentoFiscalCredor
      : `Número de Documento${NAO_INFORMADO}`;
    return s;
  }

  /** converteCredor (Java linha 64) — parse reverso do combobox. */
  static converteCredor(selecao: string | null): CredorVO {
    const vo = new CredorVO();
    if (!selecao || selecao === 'Preencher Dados...') return vo;
    const [nomePart, resto] = selecao.split(' - ', 2);
    if (nomePart && !nomePart.includes(NAO_INFORMADO)) {
      vo.setNome(nomePart);
    }
    if (resto) {
      const [tipoPart, numPart] = resto.split(': ', 2);
      if (tipoPart && !tipoPart.includes(NAO_INFORMADO)) {
        const enumValue = (TipoDocumentoFiscalEnum as unknown as Record<string, TipoDocumentoFiscalEnum>)[tipoPart];
        if (enumValue) vo.setTipoDocumentoFiscalCredor(enumValue);
      }
      if (numPart && !numPart.includes(NAO_INFORMADO)) {
        vo.setNumeroDocumentoFiscalCredor(numPart);
      }
    }
    return vo;
  }
}
