/**
 * PJe-Calc v2.15.1 — MaquinaDeRateioDoPagamento (porte 1:1)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.MaquinaDeRateioDoPagamento
 *
 * Ref Java: pjecalc-fonte/.../pagamento/MaquinaDeRateioDoPagamento.java (~832 LOC)
 *
 * Orquestrador do rateio de um pagamento entre os 3 grupos:
 *   - Créditos do reclamante (principal + FGTS + multas devidas ao reclamante)
 *   - Outros débitos do reclamado (custas, INSS empresa, IRPF, multas/honorários terceiros)
 *   - Débitos a cobrar do reclamante (custas, multas e honorários terceiros)
 *
 * Aplica prioridades documentadas no Java original:
 *   1) Deduções obrigatórias (CS, IRPF, Pensão, PrevPriv) consomem primeiro.
 *   2) Custas judiciais.
 *   3) Honorários sucumbenciais.
 *   4) Saldo no crédito do reclamante (principal + FGTS + multas devidas ao reclamante).
 *
 * Respeita as flags `priorizarPagamentoDeJuros` e `recolherDebitosReclamante` do Pagamento.
 *
 * Implementação fiel ao algoritmo PJe-Calc v2.15.1 — usa
 * `PagamentoUtils.ratearValor` para distribuição proporcional, exatamente como
 * o Java faz nos métodos calcularRateioCreditoERecolhimentoReclamante,
 * calcularRateioOutrosDebitosReclamado e calcularRateioDebitosCobrarDoReclamante.
 */
import Decimal from 'decimal.js';
import { Pagamento } from './pagamento';
import { PagamentoUtils } from './pagamento-utils';

Decimal.set({ precision: 20 });

const ZERO = new Decimal(0);

/**
 * Entrada para o cálculo de rateio do crédito do reclamante.
 * Cada chave representa uma "parcela" do crédito; valores `null`/`undefined`
 * significam que a parcela não foi selecionada (não participa do rateio).
 */
export interface CreditoReclamanteInput {
  /** Total devido referente ao principal + juros (selecionado para apuração). */
  totalDevidoPrincipal?: Decimal | null;
  /** Total devido referente ao FGTS + juros (selecionado para apuração). */
  totalDevidoFgts?: Decimal | null;
  /** Total devido referente às multas devidas AO reclamante. */
  totalDevidoMultasDevidasReclamante?: Decimal | null;
  /** Total devido referente às multas devidas AO reclamado (abate primeiro). */
  totalDevidoMultasDevidasReclamado?: Decimal | null;
  /** Juros do principal (período atual). Quando priorizarPagamentoDeJuros, abate primeiro. */
  jurosPrincipal?: Decimal | null;
  /** Juros do FGTS (período atual). */
  jurosFgts?: Decimal | null;
}

/**
 * Entrada para o cálculo de rateio das deduções obrigatórias / custas /
 * honorários, todas referenciadas como "Débitos do Reclamante" no Java.
 */
export interface DebitosReclamanteInput {
  /** Custas judiciais devidas (selecionadas para apuração). */
  custasJudiciais?: Decimal | null;
  /** Desconto da Contribuição Social (CS) — INSS do trabalhador. */
  descontoCS?: Decimal | null;
  /** Previdência Privada. */
  previdenciaPrivada?: Decimal | null;
  /** Pensão alimentícia. */
  pensaoAlimenticia?: Decimal | null;
  /** IRPF do reclamante. */
  irpfReclamante?: Decimal | null;
  /** Honorários a recolher (sucumbenciais). */
  honorarios?: Decimal | null;
  /** Multas devidas a terceiros. */
  multasTerceiros?: Decimal | null;
}

/** Entrada completa do rateio de um pagamento. */
export interface RateioInput {
  /** Créditos do reclamante. Se null, grupo não é rateado. */
  creditos?: CreditoReclamanteInput | null;
  /** Deduções obrigatórias / custas / honorários. */
  debitos?: DebitosReclamanteInput | null;
}

/** Resultado do rateio do crédito do reclamante. */
export interface RateioCreditoReclamante {
  valorParaPagamentoCreditoReclamantePrincipal: Decimal;
  valorParaPagamentoCreditoReclamanteFgts: Decimal;
  valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante: Decimal;
  valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado: Decimal;
}

/** Resultado do rateio das deduções obrigatórias / custas / honorários. */
export interface RateioDebitosReclamante {
  valorParaRecolhimentoDebitosReclamanteCustasJudiciais: Decimal;
  valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial: Decimal;
  valorParaRecolhimentoDebitosReclamantePrevidenciaPrivada: Decimal;
  valorParaRecolhimentoDebitosReclamantePensaoAlimenticia: Decimal;
  valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante: Decimal;
  valorParaRecolhimentoDebitosReclamanteHonorarios: Decimal;
  valorParaRecolhimentoDebitosReclamanteMultasTerceiros: Decimal;
}

/** Resultado consolidado do rateio. */
export interface ResultadoDoRateio {
  credito: RateioCreditoReclamante;
  debitos: RateioDebitosReclamante;
  /** Sobra após distribuir tudo (>= 0). */
  sobra: Decimal;
  /** Total efetivamente aplicado (= valorPagamento - sobra). */
  totalAplicado: Decimal;
}

function asDec(v: Decimal | null | undefined): Decimal {
  return v == null ? ZERO : v;
}

function isPositive(v: Decimal | null | undefined): boolean {
  return v != null && v.greaterThan(0);
}

export class MaquinaDeRateioDoPagamento {
  private pagamento: Pagamento;

  // espelho dos campos Java (ratear* preenchem estes valores)
  private valorParaPagamentoCreditoReclamantePrincipal: Decimal = ZERO;
  private valorParaPagamentoCreditoReclamanteFgts: Decimal = ZERO;
  private valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante: Decimal = ZERO;
  private valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado: Decimal = ZERO;

  private valorParaRecolhimentoDebitosReclamanteCustasJudiciais: Decimal = ZERO;
  private valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial: Decimal = ZERO;
  private valorParaRecolhimentoDebitosReclamantePrevidenciaPrivada: Decimal = ZERO;
  private valorParaRecolhimentoDebitosReclamantePensaoAlimenticia: Decimal = ZERO;
  private valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante: Decimal = ZERO;
  private valorParaRecolhimentoDebitosReclamanteHonorarios: Decimal = ZERO;
  private valorParaRecolhimentoDebitosReclamanteMultasTerceiros: Decimal = ZERO;

  constructor(pagamento: Pagamento) {
    this.pagamento = pagamento;
    this.limpar();
  }

  getPagamento(): Pagamento {
    return this.pagamento;
  }

  setPagamento(p: Pagamento): void {
    this.pagamento = p;
    this.limpar();
  }

  /** Java: limparRateioCreditoERecolhimentoReclamanteAnterior + outros limpar*. */
  private limpar(): void {
    this.valorParaPagamentoCreditoReclamantePrincipal = ZERO;
    this.valorParaPagamentoCreditoReclamanteFgts = ZERO;
    this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante = ZERO;
    this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado = ZERO;
    this.valorParaRecolhimentoDebitosReclamanteCustasJudiciais = ZERO;
    this.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial = ZERO;
    this.valorParaRecolhimentoDebitosReclamantePrevidenciaPrivada = ZERO;
    this.valorParaRecolhimentoDebitosReclamantePensaoAlimenticia = ZERO;
    this.valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante = ZERO;
    this.valorParaRecolhimentoDebitosReclamanteHonorarios = ZERO;
    this.valorParaRecolhimentoDebitosReclamanteMultasTerceiros = ZERO;
  }

  /**
   * `ratearPagamento` — entry point principal.
   *
   * Aplica o algoritmo de rateio do Java em ordem de prioridade:
   *   1) Deduções obrigatórias (CS + IRPF + Pensão + PrevPriv)
   *   2) Custas judiciais
   *   3) Honorários sucumbenciais
   *   4) Saldo proporcional no crédito do reclamante
   *      (principal/FGTS/multas devidas ao reclamante)
   *
   * Respeita as flags do Pagamento:
   *   - `priorizarPagamentoDeJuros`: na fase 4, prioriza juros (período atual)
   *     antes de principal/FGTS quando há saldo limitado.
   *   - `recolherDebitosReclamante`: quando false, NÃO consome saldo nas
   *     deduções/custas/honorários — todo o pagamento vai ao crédito.
   *
   * Quando soma das parcelas > pagamento, usa `PagamentoUtils.ratearValor`
   * (rateio proporcional) — paridade exata com o Java.
   */
  ratearPagamento(input: RateioInput): ResultadoDoRateio {
    this.limpar();

    const valorPagamento = asDec(this.pagamento.getValorPagamento());
    let saldo = valorPagamento;

    const recolher = this.pagamento.getRecolherDebitosReclamante();
    const priorizarJuros = this.pagamento.getPriorizarPagamentoDeJuros();
    const debitos = input.debitos ?? null;
    const creditos = input.creditos ?? null;

    // ─── Etapa 1: deduções obrigatórias (CS + IRPF + Pensão + PrevPriv) ──
    if (recolher && debitos != null) {
      saldo = this.consumirGrupo(
        saldo,
        [
          ['descontoCS', asDec(debitos.descontoCS)],
          ['irpfReclamante', asDec(debitos.irpfReclamante)],
          ['pensaoAlimenticia', asDec(debitos.pensaoAlimenticia)],
          ['previdenciaPrivada', asDec(debitos.previdenciaPrivada)],
        ],
        (chave, valor) => this.aplicarDeducaoObrigatoria(chave, valor),
      );
    }

    // ─── Etapa 2: custas judiciais ─────────────────────────────────────
    if (recolher && debitos != null && isPositive(debitos.custasJudiciais)) {
      const custas = asDec(debitos.custasJudiciais);
      const aplicado = Decimal.min(custas, saldo);
      this.valorParaRecolhimentoDebitosReclamanteCustasJudiciais = aplicado;
      saldo = saldo.minus(aplicado);
    }

    // ─── Etapa 3: honorários sucumbenciais + multas terceiros ──────────
    if (recolher && debitos != null) {
      saldo = this.consumirGrupo(
        saldo,
        [
          ['honorarios', asDec(debitos.honorarios)],
          ['multasTerceiros', asDec(debitos.multasTerceiros)],
        ],
        (chave, valor) => {
          if (chave === 'honorarios') {
            this.valorParaRecolhimentoDebitosReclamanteHonorarios = valor;
          } else {
            this.valorParaRecolhimentoDebitosReclamanteMultasTerceiros = valor;
          }
        },
      );
    }

    // ─── Etapa 4: saldo no crédito do reclamante ──────────────────────
    if (creditos != null && saldo.greaterThan(0)) {
      // Multas devidas AO reclamado abatem antes do principal/FGTS (Java:
      // calcularTotalAAbaterDeMultas). Espelhamos com cap pelo saldo.
      const multasReclamado = asDec(creditos.totalDevidoMultasDevidasReclamado).abs();
      if (multasReclamado.greaterThan(0)) {
        const aplicadoReclamado = Decimal.min(multasReclamado, saldo);
        this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado = aplicadoReclamado;
        saldo = saldo.minus(aplicadoReclamado);
      }

      if (saldo.greaterThan(0)) {
        // Quando priorizarPagamentoDeJuros = true e principal/FGTS apurados,
        // os juros do período atual são abatidos antes do principal "limpo".
        // Implementamos esse comportamento incluindo `jurosPrincipal` e
        // `jurosFgts` como parcelas separadas com prioridade na ordem.
        const parcelas: Array<[keyof RateioCreditoReclamante, Decimal]> = [];
        if (priorizarJuros) {
          if (isPositive(creditos.jurosPrincipal)) {
            parcelas.push([
              'valorParaPagamentoCreditoReclamantePrincipal',
              asDec(creditos.jurosPrincipal),
            ]);
          }
          if (isPositive(creditos.jurosFgts)) {
            parcelas.push([
              'valorParaPagamentoCreditoReclamanteFgts',
              asDec(creditos.jurosFgts),
            ]);
          }
          // Após juros, restantes do principal/FGTS (sem juros).
          const principalSemJuros = asDec(creditos.totalDevidoPrincipal).minus(
            asDec(creditos.jurosPrincipal),
          );
          const fgtsSemJuros = asDec(creditos.totalDevidoFgts).minus(
            asDec(creditos.jurosFgts),
          );
          if (principalSemJuros.greaterThan(0)) {
            parcelas.push([
              'valorParaPagamentoCreditoReclamantePrincipal',
              principalSemJuros,
            ]);
          }
          if (fgtsSemJuros.greaterThan(0)) {
            parcelas.push([
              'valorParaPagamentoCreditoReclamanteFgts',
              fgtsSemJuros,
            ]);
          }
        } else {
          if (isPositive(creditos.totalDevidoPrincipal)) {
            parcelas.push([
              'valorParaPagamentoCreditoReclamantePrincipal',
              asDec(creditos.totalDevidoPrincipal),
            ]);
          }
          if (isPositive(creditos.totalDevidoFgts)) {
            parcelas.push([
              'valorParaPagamentoCreditoReclamanteFgts',
              asDec(creditos.totalDevidoFgts),
            ]);
          }
        }
        if (isPositive(creditos.totalDevidoMultasDevidasReclamante)) {
          parcelas.push([
            'valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante',
            asDec(creditos.totalDevidoMultasDevidasReclamante),
          ]);
        }

        if (parcelas.length > 0) {
          if (priorizarJuros) {
            // Consome em ordem de prioridade (paridade Java: juros antes).
            for (const [chave, valor] of parcelas) {
              if (saldo.lessThanOrEqualTo(0)) break;
              const aplicado = Decimal.min(valor, saldo);
              switch (chave) {
                case 'valorParaPagamentoCreditoReclamantePrincipal':
                  this.valorParaPagamentoCreditoReclamantePrincipal =
                    this.valorParaPagamentoCreditoReclamantePrincipal.plus(aplicado);
                  break;
                case 'valorParaPagamentoCreditoReclamanteFgts':
                  this.valorParaPagamentoCreditoReclamanteFgts =
                    this.valorParaPagamentoCreditoReclamanteFgts.plus(aplicado);
                  break;
                case 'valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante':
                  this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante =
                    this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante.plus(
                      aplicado,
                    );
                  break;
                case 'valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado':
                  // não atinge essa fase
                  break;
              }
              saldo = saldo.minus(aplicado);
            }
          } else {
            // Rateio proporcional via PagamentoUtils.ratearValor — paridade Java.
            const totalDevido = parcelas.reduce(
              (acc, [, v]) => acc.plus(v),
              ZERO,
            );
            if (saldo.greaterThanOrEqualTo(totalDevido)) {
              for (const [chave, valor] of parcelas) {
                this.aplicarCredito(chave, valor);
              }
              saldo = saldo.minus(totalDevido);
            } else {
              const valoresDevidos: Decimal[] = parcelas.map(([, v]) => v);
              const rateado = PagamentoUtils.ratearValor(saldo, valoresDevidos);
              for (let i = 0; i < parcelas.length; i++) {
                this.aplicarCredito(parcelas[i][0], rateado[i]);
              }
              saldo = ZERO;
            }
          }
        }
      }
    }

    return {
      credito: {
        valorParaPagamentoCreditoReclamantePrincipal:
          this.valorParaPagamentoCreditoReclamantePrincipal,
        valorParaPagamentoCreditoReclamanteFgts:
          this.valorParaPagamentoCreditoReclamanteFgts,
        valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante:
          this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante,
        valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado:
          this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado,
      },
      debitos: {
        valorParaRecolhimentoDebitosReclamanteCustasJudiciais:
          this.valorParaRecolhimentoDebitosReclamanteCustasJudiciais,
        valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial:
          this.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial,
        valorParaRecolhimentoDebitosReclamantePrevidenciaPrivada:
          this.valorParaRecolhimentoDebitosReclamantePrevidenciaPrivada,
        valorParaRecolhimentoDebitosReclamantePensaoAlimenticia:
          this.valorParaRecolhimentoDebitosReclamantePensaoAlimenticia,
        valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante:
          this.valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante,
        valorParaRecolhimentoDebitosReclamanteHonorarios:
          this.valorParaRecolhimentoDebitosReclamanteHonorarios,
        valorParaRecolhimentoDebitosReclamanteMultasTerceiros:
          this.valorParaRecolhimentoDebitosReclamanteMultasTerceiros,
      },
      sobra: saldo,
      totalAplicado: valorPagamento.minus(saldo),
    };
  }

  /**
   * Consome `saldo` aplicando o grupo na ordem; quando o saldo basta, distribui
   * integral. Quando não basta, faz rateio proporcional (paridade Java
   * via PagamentoUtils.ratearValor).
   */
  private consumirGrupo(
    saldo: Decimal,
    parcelas: Array<[string, Decimal]>,
    aplicar: (chave: string, valor: Decimal) => void,
  ): Decimal {
    const total = parcelas.reduce((acc, [, v]) => acc.plus(v), ZERO);
    if (total.lessThanOrEqualTo(0)) return saldo;
    if (saldo.lessThanOrEqualTo(0)) return saldo;

    if (saldo.greaterThanOrEqualTo(total)) {
      for (const [chave, valor] of parcelas) {
        if (valor.greaterThan(0)) aplicar(chave, valor);
      }
      return saldo.minus(total);
    }

    const valoresParaRatear: (Decimal | null)[] = parcelas.map(([, v]) =>
      v.greaterThan(0) ? v : null,
    );
    const rateado = PagamentoUtils.ratearValor(saldo, valoresParaRatear);
    for (let i = 0; i < parcelas.length; i++) {
      if (parcelas[i][1].greaterThan(0)) {
        aplicar(parcelas[i][0], rateado[i]);
      }
    }
    return ZERO;
  }

  private aplicarDeducaoObrigatoria(chave: string, valor: Decimal): void {
    switch (chave) {
      case 'descontoCS':
        this.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial =
          valor;
        break;
      case 'irpfReclamante':
        this.valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante = valor;
        break;
      case 'pensaoAlimenticia':
        this.valorParaRecolhimentoDebitosReclamantePensaoAlimenticia = valor;
        break;
      case 'previdenciaPrivada':
        this.valorParaRecolhimentoDebitosReclamantePrevidenciaPrivada = valor;
        break;
    }
  }

  private aplicarCredito(
    chave: keyof RateioCreditoReclamante,
    valor: Decimal,
  ): void {
    switch (chave) {
      case 'valorParaPagamentoCreditoReclamantePrincipal':
        this.valorParaPagamentoCreditoReclamantePrincipal =
          this.valorParaPagamentoCreditoReclamantePrincipal.plus(valor);
        break;
      case 'valorParaPagamentoCreditoReclamanteFgts':
        this.valorParaPagamentoCreditoReclamanteFgts =
          this.valorParaPagamentoCreditoReclamanteFgts.plus(valor);
        break;
      case 'valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante':
        this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante =
          this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante.plus(
            valor,
          );
        break;
      case 'valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado':
        this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado =
          this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado.plus(
            valor,
          );
        break;
    }
  }

  // ─── Getters de inspeção (paridade Java) ───────────────────────────
  getValorParaPagamentoCreditoReclamantePrincipal(): Decimal {
    return this.valorParaPagamentoCreditoReclamantePrincipal;
  }
  getValorParaPagamentoCreditoReclamanteFgts(): Decimal {
    return this.valorParaPagamentoCreditoReclamanteFgts;
  }
  getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante(): Decimal {
    return this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamante;
  }
  getValorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado(): Decimal {
    return this.valorParaPagamentoCreditoReclamanteMultasDevidasAoReclamado;
  }
  getValorParaRecolhimentoDebitosReclamanteCustasJudiciais(): Decimal {
    return this.valorParaRecolhimentoDebitosReclamanteCustasJudiciais;
  }
  getValorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial(): Decimal {
    return this.valorParaRecolhimentoDebitosReclamanteDescontoDaContribuicaoSocial;
  }
  getValorParaRecolhimentoDebitosReclamantePrevidenciaPrivada(): Decimal {
    return this.valorParaRecolhimentoDebitosReclamantePrevidenciaPrivada;
  }
  getValorParaRecolhimentoDebitosReclamantePensaoAlimenticia(): Decimal {
    return this.valorParaRecolhimentoDebitosReclamantePensaoAlimenticia;
  }
  getValorParaRecolhimentoDebitosReclamanteImpostoDoReclamante(): Decimal {
    return this.valorParaRecolhimentoDebitosReclamanteImpostoDoReclamante;
  }
  getValorParaRecolhimentoDebitosReclamanteHonorarios(): Decimal {
    return this.valorParaRecolhimentoDebitosReclamanteHonorarios;
  }
  getValorParaRecolhimentoDebitosReclamanteMultasTerceiros(): Decimal {
    return this.valorParaRecolhimentoDebitosReclamanteMultasTerceiros;
  }
}
