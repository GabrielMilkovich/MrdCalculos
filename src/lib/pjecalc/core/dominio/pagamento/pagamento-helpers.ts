/**
 * PJe-Calc v2.15.1 — Pagamento helpers (Phase 9 expansao)
 * Porte 1:1 dos metodos calculados/aggregadores de Pagamento.java.
 *
 * Centraliza funcoes pure que tomam Pagamento como input (sem mutar)
 * para nao inflar pagamento.ts (367 LOC). Inclui:
 *   - somarHonorariosBrutos (todas 3 colecoes)
 *   - somarMultasDevidasTerceiros (todas 3 colecoes)
 *   - calcularValorAmortizado
 *   - calcularSaldoCreditoReclamante
 *   - calcularDescontosObrigatorios
 *   - calcularLiquidoPago
 *   - distribuirHonorariosNoCreditoReclamante
 *   - distribuirMultasNoCreditoReclamante
 *   - aplicarPagamentoEmCustasJudiciais
 *
 * Estes metodos sao chamados por Pagamento.salvar() e MaquinaDeRateioDoPagamento.
 */
import Decimal from 'decimal.js';
import type { Pagamento } from './pagamento';

const ZERO = new Decimal(0);

/** Subset de HonorarioDoPagamento usado nos somatorios. */
export interface HonorarioDoPagamentoLike {
  getValorBruto?(): Decimal | null;
  getValorLiquido?(): Decimal | null;
}

/** Subset de MultaDoPagamento. */
export interface MultaDoPagamentoLike {
  getValor?(): Decimal | null;
}

function somarSet<T>(set: Set<T> | null | undefined, getter: (item: T) => Decimal | null | undefined): Decimal {
  if (!set) return ZERO;
  let total = ZERO;
  for (const item of set) {
    const v = getter(item);
    if (v) total = total.plus(v);
  }
  return total;
}

/**
 * Java getTotalDeHonorariosNoCredito — soma honorariosBrutosDevidosReclamante
 * (vinculo DEBITOSRECLAMANTE).
 */
export function getTotalDeHonorariosNoCredito(pag: Pagamento): Decimal {
  const set = (pag as unknown as { getHonorariosBrutosDevidosReclamante?(): Set<HonorarioDoPagamentoLike> }).getHonorariosBrutosDevidosReclamante?.();
  return somarSet(set, h => h.getValorBruto?.() ?? null);
}

/** Java getTotalDeHonorariosNoOutrosDebitos — vinculo OUTROSDEBITOSRECLAMADO. */
export function getTotalDeHonorariosNoOutrosDebitos(pag: Pagamento): Decimal {
  const set = (pag as unknown as { getHonorariosBrutosDevidosReclamadoOutrosDebitos?(): Set<HonorarioDoPagamentoLike> }).getHonorariosBrutosDevidosReclamadoOutrosDebitos?.();
  return somarSet(set, h => h.getValorBruto?.() ?? null);
}

/** Java getTotalDeHonorariosNoDebitosCobrar — vinculo DEBITOSCOBRAR. */
export function getTotalDeHonorariosNoDebitosCobrar(pag: Pagamento): Decimal {
  const set = (pag as unknown as { getHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante?(): Set<HonorarioDoPagamentoLike> }).getHonorariosBrutosDevidosReclamanteDebitosCobrarDoReclamante?.();
  return somarSet(set, h => h.getValorBruto?.() ?? null);
}

/** Java getTotalDeMultasNoCredito — vinculo DEBITOSRECLAMANTE. */
export function getTotalDeMultasNoCredito(pag: Pagamento): Decimal {
  const set = (pag as unknown as { getMultasDevidasTerceiros?(): Set<MultaDoPagamentoLike> }).getMultasDevidasTerceiros?.();
  return somarSet(set, m => m.getValor?.() ?? null);
}

/** Java getTotalDeMultasNoOutrosDebitos. */
export function getTotalDeMultasNoOutrosDebitos(pag: Pagamento): Decimal {
  const set = (pag as unknown as { getMultasDevidasTerceirosOutrosDebitos?(): Set<MultaDoPagamentoLike> }).getMultasDevidasTerceirosOutrosDebitos?.();
  return somarSet(set, m => m.getValor?.() ?? null);
}

/** Java getTotalDeMultasNoDebitosCobrar. */
export function getTotalDeMultasNoDebitosCobrar(pag: Pagamento): Decimal {
  const set = (pag as unknown as { getMultasDevidasTerceirosDebitosCobrarDoReclamante?(): Set<MultaDoPagamentoLike> }).getMultasDevidasTerceirosDebitosCobrarDoReclamante?.();
  return somarSet(set, m => m.getValor?.() ?? null);
}

/** Soma todas as 3 colecoes de honorarios brutos (DEBITOSRECL+OUTROS+COBRAR). */
export function somarHonorariosBrutos(pag: Pagamento): Decimal {
  return getTotalDeHonorariosNoCredito(pag)
    .plus(getTotalDeHonorariosNoOutrosDebitos(pag))
    .plus(getTotalDeHonorariosNoDebitosCobrar(pag));
}

/** Soma todas as 3 colecoes de multas devidas a terceiros. */
export function somarMultasDevidasTerceiros(pag: Pagamento): Decimal {
  return getTotalDeMultasNoCredito(pag)
    .plus(getTotalDeMultasNoOutrosDebitos(pag))
    .plus(getTotalDeMultasNoDebitosCobrar(pag));
}

/**
 * Java calcularValorAmortizado — soma valor das parcelas (Principal + FGTS
 * + Multas Devidas Reclamante). Total de credito do reclamante consumido.
 */
export function calcularValorAmortizado(pag: Pagamento): Decimal {
  return (pag.getValorParcelaPrincipal() ?? ZERO)
    .plus(pag.getValorParcelaFgts() ?? ZERO)
    .plus(pag.getValorParcelaMultasDevidasReclamante() ?? ZERO);
}

/**
 * Java calcularSaldoCreditoReclamante — credito - amortizado.
 * Quando > 0, sobra disponivel para distribuir em honorarios/multas.
 */
export function calcularSaldoCreditoReclamante(pag: Pagamento): Decimal {
  const credito = pag.getValorParcelaCreditoReclamante() ?? ZERO;
  return credito.minus(calcularValorAmortizado(pag));
}

/**
 * Java calcularDescontosObrigatorios — soma CS + IRPF + Pensao + PrevPriv
 * que o reclamante DEVE pagar do seu credito.
 */
export function calcularDescontosObrigatorios(pag: Pagamento): Decimal {
  return (pag.getDescontoDaContribuicaoSocial() ?? ZERO)
    .plus(pag.getImpostoDoReclamante() ?? ZERO)
    .plus(pag.getPensaoAlimenticia() ?? ZERO)
    .plus(pag.getPrevidenciaPrivada() ?? ZERO);
}

/**
 * Java calcularLiquidoPago — quanto o reclamante efetivamente recebeu
 * apos descontos obrigatorios.
 */
export function calcularLiquidoPago(pag: Pagamento): Decimal {
  return (pag.getValorPagamento() ?? ZERO).minus(calcularDescontosObrigatorios(pag));
}

/**
 * Java aplicarPagamentoEmCustasJudiciais — verifica se valor de custas
 * cobre o saldo devedor de custas e retorna true/false.
 */
export function aplicarPagamentoEmCustasJudiciais(
  pag: Pagamento,
  custasDevidas: Decimal,
): { aplicado: Decimal; sobra: Decimal } {
  const custasPagas = pag.getCustasJudiciais() ?? ZERO;
  if (custasPagas.gte(custasDevidas)) {
    return { aplicado: custasDevidas, sobra: custasPagas.minus(custasDevidas) };
  }
  return { aplicado: custasPagas, sobra: ZERO };
}

/**
 * Java distribuirHonorariosNoCreditoReclamante — calcula a porcentagem do
 * saldo do credito que sera consumida por cada honorario na colecao
 * honorariosBrutosDevidosReclamante. Retorna mapa {indice → valor proporcional}.
 */
export function distribuirHonorariosNoCreditoReclamante(pag: Pagamento): Map<number, Decimal> {
  const result = new Map<number, Decimal>();
  const totalHonorarios = getTotalDeHonorariosNoCredito(pag);
  if (totalHonorarios.isZero()) return result;
  const saldoDisponivel = calcularSaldoCreditoReclamante(pag);
  const set = (pag as unknown as { getHonorariosBrutosDevidosReclamante?(): Set<HonorarioDoPagamentoLike> }).getHonorariosBrutosDevidosReclamante?.();
  if (!set) return result;
  let i = 0;
  for (const honor of set) {
    const valor = honor.getValorBruto?.() ?? null;
    if (!valor) { i++; continue; }
    const proporcional = valor.times(saldoDisponivel).div(totalHonorarios);
    result.set(i, proporcional);
    i++;
  }
  return result;
}

/**
 * Java distribuirMultasNoCreditoReclamante — analogo ao de honorarios.
 */
export function distribuirMultasNoCreditoReclamante(pag: Pagamento): Map<number, Decimal> {
  const result = new Map<number, Decimal>();
  const totalMultas = getTotalDeMultasNoCredito(pag);
  if (totalMultas.isZero()) return result;
  const saldoDisponivel = calcularSaldoCreditoReclamante(pag).minus(getTotalDeHonorariosNoCredito(pag));
  const set = (pag as unknown as { getMultasDevidasTerceiros?(): Set<MultaDoPagamentoLike> }).getMultasDevidasTerceiros?.();
  if (!set) return result;
  let i = 0;
  for (const multa of set) {
    const valor = multa.getValor?.() ?? null;
    if (!valor) { i++; continue; }
    const proporcional = valor.times(saldoDisponivel.gt(ZERO) ? saldoDisponivel : ZERO).div(totalMultas);
    result.set(i, proporcional);
    i++;
  }
  return result;
}

/**
 * Java validar — valida consistencia geral antes de salvar pagamento.
 * Retorna lista de erros (vazio = OK).
 */
export function validarPagamento(pag: Pagamento): string[] {
  const erros: string[] = [];
  const valorPagamento = pag.getValorPagamento() ?? ZERO;

  if (valorPagamento.lte(ZERO)) {
    erros.push('valorPagamento deve ser maior que zero');
  }

  if (pag.getDataPagamento() === null) {
    erros.push('dataPagamento eh obrigatoria');
  }

  // Rateio: soma das 3 parcelas == valorPagamento (com tolerancia 0.01)
  const credito = pag.getValorParcelaCreditoReclamante() ?? ZERO;
  const outros = pag.getValorParcelaOutrosDebitos() ?? ZERO;
  const debitos = pag.getValorParcelaDebitosCobrarDoReclamante() ?? ZERO;
  const somaParcelas = credito.plus(outros).plus(debitos);
  if (somaParcelas.minus(valorPagamento).abs().gt(0.01)) {
    erros.push(`Soma das parcelas (${somaParcelas.toFixed(2)}) divergente de valorPagamento (${valorPagamento.toFixed(2)})`);
  }

  // Amortizacao: valor amortizado nao pode exceder credito
  const amortizado = calcularValorAmortizado(pag);
  if (amortizado.gt(credito)) {
    erros.push(`Valor amortizado (${amortizado.toFixed(2)}) excede credito do reclamante (${credito.toFixed(2)})`);
  }

  // Descontos obrigatorios nao podem exceder valorPagamento
  const descontos = calcularDescontosObrigatorios(pag);
  if (descontos.gt(valorPagamento)) {
    erros.push(`Descontos obrigatorios (${descontos.toFixed(2)}) excedem valor do pagamento`);
  }

  return erros;
}

/** Java preparar — pre-liquidacao. Calcula campos derivados. */
export function prepararPagamento(pag: Pagamento): void {
  // Espelho de Java preparar() — preenche valores transient.
  // Implementacao 1:1 depende de MaquinaDeRateioDoPagamento (proximo sprint).
  // Por hora apenas valida.
  const erros = validarPagamento(pag);
  if (erros.length > 0) {
    console.warn('[pagamento.preparar] validacao falhou:', erros.join('; '));
  }
}
