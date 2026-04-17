/**
 * PJe-Calc v2.15.1 — ParcelasAtualizaveisCreditosReclamanteUtils
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculoexterno.ParcelasAtualizaveisCreditosReclamanteUtils
 *
 * Ref Java: ~174 linhas.
 */
import { MensagemDeRecurso } from '../../comum/mensagem-de-recurso';
import { Mensagens } from '../../comum/mensagens';
import { CredorDevedorMultaEnum } from '../../constantes/enums';
import { ParcelasAtualizaveisCreditosReclamante } from './parcelas-atualizaveis-creditos-reclamante';
import { ParcelasAtualizaveisMultaIndenizacao } from './parcelas-atualizaveis-multa-indenizacao';
import { ParcelasAtualizaveisMultaIndenizacaoUtils } from './parcelas-atualizaveis-multa-indenizacao-utils';
import { ParcelasAtualizaveisUtils } from './parcelas-atualizaveis-utils';

const VALOR_DA_PARCELA = 'Valor da Parcela';

export class ParcelasAtualizaveisCreditosReclamanteUtils extends ParcelasAtualizaveisUtils {
  static consistirDados(pa: ParcelasAtualizaveisCreditosReclamante): void {
    const erros = ParcelasAtualizaveisCreditosReclamanteUtils.validarPreenchimentoFormulario(pa);
    ParcelasAtualizaveisCreditosReclamanteUtils.lancarErros(erros);

    if (!pa.getMarcarMultaIndenizDevReclamado()) {
      pa.setMultaIndenizDevReclamado(new ParcelasAtualizaveisMultaIndenizacao());
      pa.setListaMultasIndenizDevReclamado([]);
    } else {
      for (const multa of pa.getListaMultasIndenizDevReclamado()) {
        multa.setTipoCredorDevedor(CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE);
        multa.setCreditosReclamante(pa);
        ParcelasAtualizaveisMultaIndenizacaoUtils.consistirDados(multa);
      }
    }

    if (!pa.getMarcarMultaIndenizDevReclamante()) {
      pa.setMultaIndenizDevReclamante(new ParcelasAtualizaveisMultaIndenizacao());
      pa.setListaMultasIndenizDevReclamante([]);
    } else {
      for (const multa of pa.getListaMultasIndenizDevReclamante()) {
        multa.setTipoCredorDevedor(CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO);
        multa.setCreditosReclamante(pa);
        ParcelasAtualizaveisMultaIndenizacaoUtils.consistirDados(multa);
      }
    }

    if (!pa.getMarcarVerbasTributavel()) {
      pa.setValorParcelaVerbasTributavel(null);
      pa.setValorJurosVerbasTributavel(null);
    }
    // TODO(fase-15): else -> criarVerbaTributavel + calculoExterno.adicionar(verba)
    //   (depende de VerbaDeCalculo.Informada + FormulaInformada + Constante + TabelaDeCorrecaoMonetaria).

    if (!pa.getMarcarVerbasNaoTributavel()) {
      pa.setValorParcelaVerbasNaoTributavel(null);
      pa.setValorJurosVerbasNaoTributavel(null);
    }
    // TODO(fase-15): else -> criarVerbaNaoTributavel + calculoExterno.adicionar(verba)

    if (!pa.getMarcarFgts()) {
      pa.setValorParcelaFgts(null);
      pa.setValorJurosFgts(null);
    }
    // TODO(fase-15): else -> criarHistoricoSalarialFgts + calculoExterno.getHistoricosSalariais().add(...)

    if (!pa.getMarcarMultaFgts()) {
      pa.setValorParcelaMultaFgts(null);
      pa.setValorJurosMultaFgts(null);
      // TODO(fase-15): Fgts.setMulta(false) + setTipoDoValorDaMulta(CALCULADA) + setValorInformadoDaMulta(null)
    }
    // TODO(fase-15): else -> Fgts.setMulta(true) + setTipoDoValorDaMulta(INFORMADA) + setValorInformadoDaMulta(...)
  }

  private static validarPreenchimentoFormulario(pa: ParcelasAtualizaveisCreditosReclamante): MensagemDeRecurso[] {
    const erros: MensagemDeRecurso[] = [];
    if (pa.getMarcarVerbasTributavel() && pa.getValorParcelaVerbasTributavel() == null) {
      erros.push(new MensagemDeRecurso('valorParcelaCredReclamVerbasTributavel', Mensagens.MSG0003, VALOR_DA_PARCELA));
    }
    if (pa.getMarcarVerbasNaoTributavel() && pa.getValorParcelaVerbasNaoTributavel() == null) {
      erros.push(new MensagemDeRecurso('valorParcelaCredReclamVerbasNaoTributavel', Mensagens.MSG0003, VALOR_DA_PARCELA));
    }
    if (pa.getMarcarFgts() && pa.getValorParcelaFgts() == null) {
      erros.push(new MensagemDeRecurso('valorParcelaCredReclamFgts', Mensagens.MSG0003, VALOR_DA_PARCELA));
    }
    if (pa.getMarcarMultaFgts() && pa.getValorParcelaMultaFgts() == null) {
      erros.push(new MensagemDeRecurso('valorParcelaCredReclamMultaFgts', Mensagens.MSG0003, VALOR_DA_PARCELA));
    }
    return erros;
  }
}
