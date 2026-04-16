/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisHonorarioUtils
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisHonorarioUtils
 */
import Decimal from 'decimal.js';
import { MensagemDeRecurso } from '../../comum/mensagem-de-recurso';
import { Mensagens } from '../../comum/mensagens';
import { TipoValorEnum } from '../../constantes/enums';
import { ParcelasAtualizaveisHonorario } from './parcelas-atualizaveis-honorario';
import { ParcelasAtualizaveisUtils } from './parcelas-atualizaveis-utils';

const ZERO = new Decimal(0);

export class ParcelasAtualizaveisHonorarioUtils extends ParcelasAtualizaveisUtils {
  static consistirDados(pa: ParcelasAtualizaveisHonorario): void {
    if (!pa.getApurarIrpf()) {
      pa.setIncidirIrpfSobreJuros(false);
      pa.setTipoIrpf(null);
    }
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
    paHonorario: ParcelasAtualizaveisHonorario,
    idDescricao: string,
    idCredor: string | null,
    idValorParcela: string,
    idAliquota: string,
    idNumDocFiscal: string,
    idValorJuros: string,
  ): MensagemDeRecurso[] {
    const erros: MensagemDeRecurso[] = [];
    const descricao = paHonorario.getDescricao();
    if (!descricao || descricao.trim() === '') {
      erros.push(new MensagemDeRecurso(idDescricao, Mensagens.MSG0003, 'Descrição'));
    }
    if (idCredor !== null) {
      const credor = paHonorario.getCredor();
      if (!credor || credor.trim() === '') {
        erros.push(new MensagemDeRecurso(idCredor, Mensagens.MSG0003, 'Credor'));
      }
    }
    if (paHonorario.getTipoValor() === TipoValorEnum.CALCULADO) {
      if (paHonorario.getTaxaCalculado() == null) {
        erros.push(new MensagemDeRecurso(idAliquota, Mensagens.MSG0003, 'Alíquota'));
      }
    } else {
      if (paHonorario.getValorParcelaInformado() == null) {
        erros.push(new MensagemDeRecurso(idValorParcela, Mensagens.MSG0003, 'Valor da Parcela'));
      }
      const valorJuros = paHonorario.getValorJurosInformado();
      if (
        paHonorario.getAplicarJurosInformado() &&
        paHonorario.getDataApartirDeAplicarJurosInformado() != null &&
        valorJuros != null &&
        !valorJuros.equals(ZERO)
      ) {
        erros.push(new MensagemDeRecurso(idValorJuros, Mensagens.MSG0196));
      }
    }
    const numeroDocFiscal = paHonorario.getNumeroDocFiscal();
    if (paHonorario.getApurarIrpf() && (!numeroDocFiscal || numeroDocFiscal.trim() === '')) {
      erros.push(new MensagemDeRecurso(idNumDocFiscal, Mensagens.MSG0003, 'Número'));
    }
    // TODO(fase-15): GerenciadorDeValidadores.getInstance().validar(...)
    return erros;
  }
}
