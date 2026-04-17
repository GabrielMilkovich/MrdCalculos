/**
 * PJe-Calc v2.15.1 — HonorarioDaAtualizacao (stub estrutural)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.pagamento.HonorarioDaAtualizacao
 *
 * Ref Java: pjecalc-fonte/.../pagamento/HonorarioDaAtualizacao.java (~732 linhas)
 *
 * Snapshot de um Honorario em uma atualização: campos base (honorario,
 * pagamento, datas, base/valor/indice/juros), campos IRPF
 * (aliquota/deducao/faixas) para o "saldo" e o "evento".
 */
import Decimal from 'decimal.js';
import type { Honorario } from '../calculo/honorarios/honorario';
import type { Pagamento } from './pagamento';

const ZERO = new Decimal(0);

export class HonorarioDaAtualizacao {
  private id: number | null = null;
  private versao: number = 0;
  private honorario: Honorario | null = null;
  private pagamento: Pagamento | null = null;
  private dataEvento: Date | null = null;
  private baseDeImposto: Decimal = ZERO;
  private baseDeImpostoDoSaldo: Decimal = ZERO;

  private valorInicialFaixaIrpf: Decimal | null = null;
  private valorFinalFaixaIrpf: Decimal | null = null;
  private valorAliquotaIrpf: Decimal | null = null;
  private valorDeducaoIrpf: Decimal | null = null;
  private valorImpostoRenda: Decimal | null = null;

  private valorInicialFaixaIrpfSaldo: Decimal | null = null;
  private valorFinalFaixaIrpfSaldo: Decimal | null = null;
  private valorAliquotaIrpfSaldo: Decimal | null = null;
  private valorDeducaoIrpfSaldo: Decimal | null = null;
  private valorImpostoRendaSaldo: Decimal | null = null;

  getId(): number | null { return this.id; }
  setId(v: number): void { this.id = v; }
  getVersao(): number { return this.versao; }
  setVersao(v: number): void { this.versao = v; }

  getHonorario(): Honorario | null { return this.honorario; }
  setHonorario(h: Honorario | null): void { this.honorario = h; }

  getPagamento(): Pagamento | null { return this.pagamento; }
  setPagamento(p: Pagamento | null): void { this.pagamento = p; }

  getDataEvento(): Date | null { return this.dataEvento; }
  setDataEvento(d: Date | null): void { this.dataEvento = d; }

  getBaseDeImposto(): Decimal { return this.baseDeImposto; }
  setBaseDeImposto(v: Decimal): void { this.baseDeImposto = v; }

  getBaseDeImpostoDoSaldo(): Decimal { return this.baseDeImpostoDoSaldo; }
  setBaseDeImpostoDoSaldo(v: Decimal): void { this.baseDeImpostoDoSaldo = v; }

  getValorInicialFaixaIrpf(): Decimal | null { return this.valorInicialFaixaIrpf; }
  setValorInicialFaixaIrpf(v: Decimal | null): void { this.valorInicialFaixaIrpf = v; }

  getValorFinalFaixaIrpf(): Decimal | null { return this.valorFinalFaixaIrpf; }
  setValorFinalFaixaIrpf(v: Decimal | null): void { this.valorFinalFaixaIrpf = v; }

  getValorAliquotaIrpf(): Decimal | null { return this.valorAliquotaIrpf; }
  setValorAliquotaIrpf(v: Decimal | null): void { this.valorAliquotaIrpf = v; }

  getValorDeducaoIrpf(): Decimal | null { return this.valorDeducaoIrpf; }
  setValorDeducaoIrpf(v: Decimal | null): void { this.valorDeducaoIrpf = v; }

  getValorImpostoRenda(): Decimal | null { return this.valorImpostoRenda; }
  setValorImpostoRenda(v: Decimal | null): void { this.valorImpostoRenda = v; }

  getValorInicialFaixaIrpfSaldo(): Decimal | null { return this.valorInicialFaixaIrpfSaldo; }
  setValorInicialFaixaIrpfSaldo(v: Decimal | null): void { this.valorInicialFaixaIrpfSaldo = v; }

  getValorFinalFaixaIrpfSaldo(): Decimal | null { return this.valorFinalFaixaIrpfSaldo; }
  setValorFinalFaixaIrpfSaldo(v: Decimal | null): void { this.valorFinalFaixaIrpfSaldo = v; }

  getValorAliquotaIrpfSaldo(): Decimal | null { return this.valorAliquotaIrpfSaldo; }
  setValorAliquotaIrpfSaldo(v: Decimal | null): void { this.valorAliquotaIrpfSaldo = v; }

  getValorDeducaoIrpfSaldo(): Decimal | null { return this.valorDeducaoIrpfSaldo; }
  setValorDeducaoIrpfSaldo(v: Decimal | null): void { this.valorDeducaoIrpfSaldo = v; }

  getValorImpostoRendaSaldo(): Decimal | null { return this.valorImpostoRendaSaldo; }
  setValorImpostoRendaSaldo(v: Decimal | null): void { this.valorImpostoRendaSaldo = v; }
}
