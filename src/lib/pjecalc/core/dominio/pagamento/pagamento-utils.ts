/**
 * PJe-Calc v2.15.1 — PagamentoUtils
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.PagamentoUtils
 *
 * Ref Java: pjecalc-fonte/.../pagamento/PagamentoUtils.java (~389 linhas)
 *
 * Funções utilitárias estáticas para determinar se existem valores a
 * processar em um pagamento (principal, FGTS, custas, pensão, previdência
 * privada etc.) + rateio proporcional com ajuste de arredondamento.
 *
 * **Status**: fachada mínima com assinaturas — predicados `verificaSe*`
 * retornam `false` (conservador; implementação completa requer Calculo
 * com todos os módulos). Helpers `ratearValor` e `arrumarArredondamento`
 * portados 1-a-1 do Java nesta Fase 7 — são puros e reutilizáveis
 * imediatamente.
 */
import Decimal from 'decimal.js';
import { arredondarValorMonetario } from '../../base/comum/utils';
import {
  CredorDevedorMultaEnum,
  TipoCobrancaReclamanteEnum,
  TipoDeDevedorDoHonorarioEnum,
} from '../../constantes/enums';
import type { Calculo } from '../calculo/calculo';
import type { Multa } from '../calculo/multa/multa';
import type { Honorario } from '../calculo/honorarios/honorario';

const ZERO = new Decimal(0);
const UM_CENTAVO = new Decimal('0.01');

export class PagamentoUtils {
  static verificaSeExisteValorPrincipalParaCreditoDeReclamante(_c: Calculo): boolean {
    return false;
  }

  static verificaSeExisteFgtsParaCreditoDeReclamante(_c: Calculo): boolean {
    return false;
  }

  static verificaSeExisteCustaDoReclamanteAPagar(_c: Calculo): boolean {
    return false;
  }

  static verificaSeEhFgtsParaDepositar(_c: Calculo): boolean {
    return false;
  }

  static verificaSeExisteDescontoContribuicaoSocialReclamante(_c: Calculo): boolean {
    return false;
  }

  static verificaSeExistePrevidenciaPrivada(_c: Calculo): boolean {
    return false;
  }

  static verificaSeExistePensaoAlimenticia(_c: Calculo): boolean {
    return false;
  }

  static verificaSeExistePensaoAlimenticiaAnteriorAoPagamento(
    _c: Calculo,
    _dataPagamento: Date,
  ): boolean {
    return false;
  }

  /**
   * `analisarMultas` — porte 1-a-1 de PagamentoUtils.java:233-269.
   *
   * Itera sobre a coleção de multas e categoriza-as em 4 dimensões +
   * listas auxiliares. Devolve tupla tipada (substitui `Object[]` do Java
   * — mais seguro em TS).
   *
   * Diferença com Java: em Java a classe Multa tem `obterTodosPor(Calculo)`
   * via repositório; em TS aceitamos a coleção já carregada (responsabilidade
   * do caller/adapter Supabase).
   *
   * Categorias (via `multa.getTipoCredorDevedor()`):
   *   - RECLAMADO_RECLAMANTE → existe multa devida pelo **reclamante** p/ reclamado
   *   - RECLAMANTE_RECLAMADO → existe multa devida pelo **reclamado** p/ reclamante
   *   - TERCEIRO_RECLAMANTE: se TipoCobrancaReclamante=COBRAR → "ACobrar" (lista 8);
   *     caso contrário → devida pelo reclamante p/ terceiros (lista 5)
   *   - TERCEIRO_RECLAMADO → devida pelo reclamado p/ terceiros (lista 6)
   */
  static analisarMultas(multas: Iterable<Multa>): AnaliseDeMultas {
    const r: AnaliseDeMultas = {
      existeMultaDevidaPeloReclamadoParaReclamante: false,
      existeMultaDevidaPeloReclamanteParaReclamado: false,
      existeMultaDevidaPeloReclamanteParaTerceiros: false,
      existeMultaDevidaPeloReclamadoParaTerceiros: false,
      listaDeMultasDevidasPeloReclamanteParaTerceiros: [],
      listaDeMultasDevidasPeloReclamadoParaTerceiros: [],
      existeMultaACobrarDoReclamanteParaTerceiros: false,
      listaDeMultasACobrarDoReclamanteParaTerceiros: [],
    };
    for (const multa of multas) {
      switch (multa.getTipoCredorDevedor()) {
        case CredorDevedorMultaEnum.RECLAMADO_RECLAMANTE:
          r.existeMultaDevidaPeloReclamanteParaReclamado = true;
          break;
        case CredorDevedorMultaEnum.RECLAMANTE_RECLAMADO:
          r.existeMultaDevidaPeloReclamadoParaReclamante = true;
          break;
        case CredorDevedorMultaEnum.TERCEIRO_RECLAMANTE: {
          if (multa.getTipoCobrancaReclamante() === TipoCobrancaReclamanteEnum.COBRAR) {
            r.existeMultaACobrarDoReclamanteParaTerceiros = true;
            r.listaDeMultasACobrarDoReclamanteParaTerceiros.push(multa);
          } else {
            r.existeMultaDevidaPeloReclamanteParaTerceiros = true;
            r.listaDeMultasDevidasPeloReclamanteParaTerceiros.push(multa);
          }
          break;
        }
        case CredorDevedorMultaEnum.TERCEIRO_RECLAMADO:
          r.existeMultaDevidaPeloReclamadoParaTerceiros = true;
          r.listaDeMultasDevidasPeloReclamadoParaTerceiros.push(multa);
          break;
      }
    }
    return r;
  }

  /**
   * `analisarHonorarios` — porte 1-a-1 de PagamentoUtils.java:271-297.
   *
   * Itera sobre honorários e categoriza por `getTipoDeDevedor()`:
   *   - RECLAMANTE: se COBRAR → ACobrar (lista 5); senão → devido pelo reclamante (lista 2)
   *   - RECLAMADO → devido pelo reclamado (lista 3)
   */
  static analisarHonorarios(honorarios: Iterable<Honorario>): AnaliseDeHonorarios {
    const r: AnaliseDeHonorarios = {
      existeHonorarioDevidoPeloReclamante: false,
      existeHonorarioDevidoPeloReclamado: false,
      listaDeHonorariosDevidosPeloReclamante: [],
      listaDeHonorariosDevidosPeloReclamado: [],
      existeHonorarioACobrarDoReclamante: false,
      listaDeHonorariosACobrarDoReclamante: [],
    };
    for (const honorario of honorarios) {
      switch (honorario.getTipoDeDevedor()) {
        case TipoDeDevedorDoHonorarioEnum.RECLAMANTE: {
          if (honorario.getTipoCobrancaReclamante() === TipoCobrancaReclamanteEnum.COBRAR) {
            r.existeHonorarioACobrarDoReclamante = true;
            r.listaDeHonorariosACobrarDoReclamante.push(honorario);
          } else {
            r.existeHonorarioDevidoPeloReclamante = true;
            r.listaDeHonorariosDevidosPeloReclamante.push(honorario);
          }
          break;
        }
        case TipoDeDevedorDoHonorarioEnum.RECLAMADO:
          r.existeHonorarioDevidoPeloReclamado = true;
          r.listaDeHonorariosDevidosPeloReclamado.push(honorario);
          break;
      }
    }
    return r;
  }

  /**
   * `ratearValor` — porte 1-a-1 de PagamentoUtils.java:338-357.
   *
   * Distribui `valor` proporcionalmente entre as `parcelas` (vetor-base de
   * cada fração). Fator de rateio = parcela[i] / total(parcelas). O valor
   * final de cada posição = round(valor × fator). No final, chama
   * `arrumarArredondamento` para garantir soma = valor (corrige centavo-a-centavo
   * nas parcelas maiores).
   *
   * Regras importantes:
   *   - Se a soma das parcelas for zero, devolve array zerado do mesmo tamanho
   *     (paridade Java: evita divisão por zero).
   *   - Parcelas nulas são tratadas como zero durante soma (paridade Java).
   *   - Arredondamento por parcela: 2 casas decimais (`arredondarValorMonetario`).
   *
   * Casos-de-uso: custas × múltiplos réus, honorários sobre principal+FGTS,
   * multa 467 sobre múltiplas competências.
   */
  static ratearValor(valor: Decimal, parcelas: (Decimal | null)[]): Decimal[] {
    const valoresZerados: Decimal[] = parcelas.map(() => ZERO);
    let total: Decimal = ZERO;
    for (const p of parcelas) {
      if (p != null) total = total.plus(p);
    }
    if (total.equals(0)) return valoresZerados;

    const rateioDasParcelas: Decimal[] = parcelas.map((p) => {
      if (p == null) return ZERO;
      const fatorRateio = p.div(total);
      const r = arredondarValorMonetario(valor.times(fatorRateio));
      return r ?? ZERO;
    });
    PagamentoUtils.arrumarArredondamento(rateioDasParcelas, valor);
    return rateioDasParcelas;
  }

  /**
   * `arrumarArredondamento` — porte 1-a-1 de PagamentoUtils.java:359-387.
   *
   * Mutates o array de rateios para forçar soma = valor. O delta de
   * arredondamento (tipicamente ±R$0,01 por parcela) é distribuído
   * **centavo-a-centavo** entre as **maiores** parcelas (por |valor|),
   * sem repetir índices. Se diferença > 0 (rateio somou mais que valor),
   * subtrai 1 centavo; se < 0, soma.
   *
   * Fidelidade Java: marcação de `indicesUsados` cresce até esgotar o
   * delta. Se o delta excede o número de parcelas × 1 centavo, Java entra
   * em loop infinito (mesmo bug preservado — não deve ocorrer na prática
   * pois cada parcela arredondada difere do exato em < 1 centavo).
   */
  /** @internal — exposto apenas para testes golden. */
  static __arrumarArredondamentoForTests(rateioDasParcelas: Decimal[], valor: Decimal): void {
    PagamentoUtils.arrumarArredondamento(rateioDasParcelas, valor);
  }

  private static arrumarArredondamento(rateioDasParcelas: Decimal[], valor: Decimal): void {
    let totalRateios: Decimal = ZERO;
    for (const r of rateioDasParcelas) totalRateios = totalRateios.plus(r);
    let diferenca = totalRateios.minus(valor);
    if (diferenca.equals(0)) return;

    const erroPositivo = diferenca.isPositive() && !diferenca.isZero();
    const indicesUsados = new Set<number>();
    // Guarda-limite: máximo de iterações = número de parcelas (evita
    // loop infinito se o delta for maior que 1 centavo × N parcelas).
    let seguranca = rateioDasParcelas.length;
    while (!diferenca.equals(0) && seguranca-- > 0) {
      let maiorIndice = 0;
      let maior: Decimal = ZERO;
      for (let i = 0; i < rateioDasParcelas.length; i++) {
        if (indicesUsados.has(i)) continue;
        const abs = rateioDasParcelas[i].abs();
        if (abs.greaterThan(maior)) {
          maior = abs;
          maiorIndice = i;
        }
      }
      indicesUsados.add(maiorIndice);
      if (erroPositivo) {
        rateioDasParcelas[maiorIndice] = rateioDasParcelas[maiorIndice].minus(UM_CENTAVO);
        diferenca = diferenca.minus(UM_CENTAVO);
      } else {
        rateioDasParcelas[maiorIndice] = rateioDasParcelas[maiorIndice].plus(UM_CENTAVO);
        diferenca = diferenca.plus(UM_CENTAVO);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Tipos de retorno estruturados (substituem Object[] do Java)
// ─────────────────────────────────────────────────────────────────────

export interface AnaliseDeMultas {
  existeMultaDevidaPeloReclamadoParaReclamante: boolean;
  existeMultaDevidaPeloReclamanteParaReclamado: boolean;
  existeMultaDevidaPeloReclamanteParaTerceiros: boolean;
  existeMultaDevidaPeloReclamadoParaTerceiros: boolean;
  listaDeMultasDevidasPeloReclamanteParaTerceiros: Multa[];
  listaDeMultasDevidasPeloReclamadoParaTerceiros: Multa[];
  existeMultaACobrarDoReclamanteParaTerceiros: boolean;
  listaDeMultasACobrarDoReclamanteParaTerceiros: Multa[];
}

export interface AnaliseDeHonorarios {
  existeHonorarioDevidoPeloReclamante: boolean;
  existeHonorarioDevidoPeloReclamado: boolean;
  listaDeHonorariosDevidosPeloReclamante: Honorario[];
  listaDeHonorariosDevidosPeloReclamado: Honorario[];
  existeHonorarioACobrarDoReclamante: boolean;
  listaDeHonorariosACobrarDoReclamante: Honorario[];
}
