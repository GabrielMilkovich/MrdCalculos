/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisMultaIndenizacaoUtils
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisMultaIndenizacaoUtils
 */
import Decimal from 'decimal.js';
import { MensagemDeRecurso } from '../../comum/mensagem-de-recurso';
import { Mensagens } from '../../comum/mensagens';
import { TipoValorEnum } from '../../constantes/enums';
import { ParcelasAtualizaveisMultaIndenizacao } from './parcelas-atualizaveis-multa-indenizacao';
import { ParcelasAtualizaveisUtils } from './parcelas-atualizaveis-utils';

const ZERO = new Decimal(0);

export class ParcelasAtualizaveisMultaIndenizacaoUtils extends ParcelasAtualizaveisUtils {
  static consistirDados(pa: ParcelasAtualizaveisMultaIndenizacao): void {
    if (pa.getTipoValor() === TipoValorEnum.INFORMADO) {
      pa.setAplicarDescontoContribSocialCalculado(false);
      pa.setAplicarDescontoPrevPrivadaCalculado(false);
      pa.setTaxaCalculado(null);
      pa.setValorParcelaInformado(pa.getValorParcelaInformado() ?? ZERO);
      pa.setValorJurosInformado(pa.getValorJurosInformado() ?? ZERO);
    } else {
      pa.setValorParcelaInformado(null);
      pa.setValorJurosInformado(null);
      pa.setIndiceTrabalhistaInformado(null);
      pa.setAplicarJurosInformado(false);
      pa.setDataApartirDeAplicarJurosInformado(null);
    }
  }

  static validarPreenchimentoFormulario(
    paMulta: ParcelasAtualizaveisMultaIndenizacao,
    idDescricao: string,
    idCredor: string | null,
    idValorParcela: string,
    idAliquota: string,
    idValorJuros: string,
  ): MensagemDeRecurso[] {
    const erros: MensagemDeRecurso[] = [];
    const descricao = paMulta.getDescricao();
    if (!descricao || descricao.trim() === '') {
      erros.push(new MensagemDeRecurso(idDescricao, Mensagens.MSG0003, 'Descrição'));
    }
    if (idCredor !== null) {
      const credor = paMulta.getCredor();
      if (!credor || credor.trim() === '') {
        erros.push(new MensagemDeRecurso(idCredor, Mensagens.MSG0003, 'Credor'));
      }
    }
    if (paMulta.getTipoValor() === TipoValorEnum.CALCULADO) {
      if (paMulta.getTaxaCalculado() == null) {
        erros.push(new MensagemDeRecurso(idAliquota, Mensagens.MSG0003, 'Alíquota'));
      }
    } else {
      if (paMulta.getValorParcelaInformado() == null) {
        erros.push(new MensagemDeRecurso(idValorParcela, Mensagens.MSG0003, 'Valor da Parcela'));
      }
      const valorJuros = paMulta.getValorJurosInformado();
      if (
        paMulta.getAplicarJurosInformado() &&
        paMulta.getDataApartirDeAplicarJurosInformado() != null &&
        valorJuros != null &&
        !valorJuros.equals(ZERO)
      ) {
        erros.push(new MensagemDeRecurso(idValorJuros, Mensagens.MSG0196));
      }
    }
    // TODO(fase-15): GerenciadorDeValidadores.getInstance().validar(pa, ParcelasAtualizaveisMultaIndenizacao)
    return erros;
  }
}
