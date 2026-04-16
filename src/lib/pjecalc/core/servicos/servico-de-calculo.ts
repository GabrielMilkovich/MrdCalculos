/**
 * PJe-Calc v2.15.1 — ServicoDeCalculo
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.servicos.ServicoDeCalculo
 *
 * No Java, é um singleton Seam que mantém referência ao Calculo "aberto" (em edição).
 * Aqui simplificamos como um registro global que os módulos consultam.
 *
 * Uso: `ServicoDeCalculo.setCalculoAberto(calculo)` antes de chamar liquidar().
 */
import { Calculo } from '../dominio/calculo/calculo';

let _calculoAberto: Calculo | null = null;

export class ServicoDeCalculo {
  static setCalculoAberto(calculo: Calculo): void {
    _calculoAberto = calculo;
  }

  static obterCalculoAberto(): Calculo {
    if (!_calculoAberto) {
      throw new Error('ServicoDeCalculo: nenhum cálculo aberto. Chame setCalculoAberto() antes.');
    }
    return _calculoAberto;
  }

  static getInstancia(): ServicoDeCalculo {
    return new ServicoDeCalculo();
  }

  obterCalculoAberto(): Calculo {
    return ServicoDeCalculo.obterCalculoAberto();
  }

  static limpar(): void {
    _calculoAberto = null;
  }
}
