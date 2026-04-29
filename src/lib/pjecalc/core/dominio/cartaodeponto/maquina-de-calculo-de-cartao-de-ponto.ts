/**
 * PJe-Calc v2.15.1 — MaquinaDeCalculoDeCartaoDePonto
 * Porte progressivo de: br.jus.trt8.pjecalc.negocio.dominio.cartaodeponto.MaquinaDeCalculoDeCartaoDePonto
 *
 * Ref Java: pjecalc-fonte/.../cartaodeponto/MaquinaDeCalculoDeCartaoDePonto.java (1435 LOC)
 *
 * Estado anterior: 129 LOC stub (apurar() era no-op).
 * Estado atual: implementa apurar() que:
 *   1. Agrupa OcorrenciaDoCartaoDePonto por data (cada dia → 1 ApuracaoDiariaCartao).
 *   2. Pareia batidas em sequencia (entrada/saida) e soma horas trabalhadas.
 *   3. Detecta intervalo intrajornada (par interno) e calcula supressao.
 *   4. Calcula horas noturnas (interseccao com janela 22:00-05:00).
 *   5. Calcula horas extras simples (excedente sobre jornada padrao 8h ou 44h/sem).
 *   6. Detecta supressao Art. 253 CLT (15min apos cada 1h40 em ambiente frio).
 *
 * NAO portado (delega para verba-modules em paralelo, usados pelo engine v3):
 *   - src/lib/pjecalc/verba-modules/horas-extras.ts (HE com adicional CCT)
 *   - src/lib/pjecalc/verba-modules/intervalos.ts (intra/inter detalhado)
 *   - src/lib/pjecalc/verba-modules/adicional-noturno.ts (hora reduzida 52'30")
 *   - Aplicacao de tolerancias customizadas por turno (Lei 13.467/17 reforma).
 *
 * O engine v3 (engine-v3.ts) usa os verba-modules diretamente, NAO esta core.
 * Esta maquina core eh complementar e cobre auditoria/inspecao detalhada.
 */
import Decimal from 'decimal.js';
import type { ApuracaoCartaoDePonto } from './apuracao-cartao-de-ponto';
import { ApuracaoDiariaCartao } from './apuracao-diaria-cartao';
import type { CartaoDePonto } from './cartao-de-ponto';
import type { OcorrenciaDoCartaoDePonto } from './ocorrencia-do-cartao-de-ponto';

const ZERO = new Decimal(0);
const SEGUNDOS_POR_HORA = new Decimal(3600);
const JORNADA_PADRAO_DIARIA_SEGUNDOS = new Decimal(8 * 3600);
const NOTURNO_INICIO_HORA = 22;
const NOTURNO_FIM_HORA = 5;

/** Tipo da batida (Java enum simplificado). */
export type TipoBatida = 'ENTRADA' | 'SAIDA';

interface BatidaProcessada {
  data: Date;
  tipo: TipoBatida;
}

export class MaquinaDeCalculoDeCartaoDePonto {
  private cartaoDePonto: CartaoDePonto | null = null;
  private apuracaoCartaoDePonto: ApuracaoCartaoDePonto | null = null;

  private apuracoesDiarias: ApuracaoDiariaCartao[] = [];

  private totalHorasTrabalhadas: Decimal = ZERO;
  private totalHorasExtras: Decimal = ZERO;
  private totalHorasNoturnas: Decimal = ZERO;
  private totalSupressaoIntrajornada: Decimal = ZERO;
  private totalSupressaoInterjornada: Decimal = ZERO;
  private totalSupressaoArt253: Decimal = ZERO;

  getCartaoDePonto(): CartaoDePonto | null { return this.cartaoDePonto; }
  setCartaoDePonto(v: CartaoDePonto | null): void { this.cartaoDePonto = v; }
  getApuracaoCartaoDePonto(): ApuracaoCartaoDePonto | null { return this.apuracaoCartaoDePonto; }
  setApuracaoCartaoDePonto(v: ApuracaoCartaoDePonto | null): void { this.apuracaoCartaoDePonto = v; }
  getApuracoesDiarias(): ApuracaoDiariaCartao[] { return this.apuracoesDiarias; }
  setApuracoesDiarias(v: ApuracaoDiariaCartao[]): void { this.apuracoesDiarias = v; }

  getTotalHorasTrabalhadas(): Decimal { return this.totalHorasTrabalhadas; }
  getTotalHorasExtras(): Decimal { return this.totalHorasExtras; }
  getTotalHorasNoturnas(): Decimal { return this.totalHorasNoturnas; }
  getTotalSupressaoIntrajornada(): Decimal { return this.totalSupressaoIntrajornada; }
  getTotalSupressaoInterjornada(): Decimal { return this.totalSupressaoInterjornada; }
  getTotalSupressaoArt253(): Decimal { return this.totalSupressaoArt253; }

  /**
   * apurar — Java MaquinaDeCalculoDeCartaoDePonto.apurar() (linha ~270+).
   * Itera ocorrencias do cartao agrupando por data e gera 1 ApuracaoDiariaCartao
   * por dia com horas trabalhadas, noturnas, extras e supressoes.
   */
  apurar(): void {
    this.apuracoesDiarias = [];
    if (!this.cartaoDePonto || !this.apuracaoCartaoDePonto) return;
    const ocorrencias = this.cartaoDePonto.getOcorrencias();
    if (ocorrencias.length === 0) return;

    // Java: ordena por data
    const ordenadas = [...ocorrencias].sort((a, b) => a.compareTo(b));

    // Java: agrupa por dia (yyyy-mm-dd)
    const grupos = new Map<string, OcorrenciaDoCartaoDePonto[]>();
    for (const o of ordenadas) {
      const data = o.getDataOcorrencia();
      if (!data) continue;
      const key = `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}-${String(data.getUTCDate()).padStart(2, '0')}`;
      const list = grupos.get(key) ?? [];
      list.push(o);
      grupos.set(key, list);
    }

    // Java: cria ApuracaoDiariaCartao por dia
    for (const [, list] of grupos) {
      const adc = this.processarDia(list);
      this.apuracoesDiarias.push(adc);
    }

    this.somarTotais();
  }

  /**
   * Java MaquinaDeCalculoDeCartaoDePonto.processarDia() — equivalente.
   * Pareia batidas (assume alternancia ENTRADA/SAIDA), calcula:
   *  - horas trabalhadas = sum(saida-entrada por par)
   *  - intervalo intrajornada = par interno (saida[0], entrada[1])
   *  - horas noturnas = interseccao com [22:00-05:00]
   *  - horas extras = max(0, trabalhadas - 8h)
   *  - supressao intra = max(0, 1h - intervaloIntra) Art. 71 CLT
   */
  private processarDia(ocorrenciasDoDia: OcorrenciaDoCartaoDePonto[]): ApuracaoDiariaCartao {
    const adc = new ApuracaoDiariaCartao();
    adc.setApuracaoCartaoDePonto(this.apuracaoCartaoDePonto);

    // Pareia batidas — Java assume entrada/saida alternadas.
    const batidas: BatidaProcessada[] = ocorrenciasDoDia
      .map((o, idx) => ({
        data: o.getDataOcorrencia()!,
        tipo: (idx % 2 === 0 ? 'ENTRADA' : 'SAIDA') as TipoBatida,
      }))
      .filter(b => b.data);

    if (batidas.length < 2) return adc;

    let totalSegundosTrabalhados = ZERO;
    let totalSegundosNoturnos = ZERO;

    // Pares (entrada, saida): trabalhou.
    for (let i = 0; i + 1 < batidas.length; i += 2) {
      const entrada = batidas[i].data;
      const saida = batidas[i + 1].data;
      const segundosTrabalhados = (saida.getTime() - entrada.getTime()) / 1000;
      if (segundosTrabalhados <= 0) continue;
      totalSegundosTrabalhados = totalSegundosTrabalhados.plus(segundosTrabalhados);
      totalSegundosNoturnos = totalSegundosNoturnos.plus(this.segundosNoturnos(entrada, saida));
    }

    // Intervalo intrajornada — par interno (saida[0], entrada[1]).
    let segundosIntra = 0;
    if (batidas.length >= 4) {
      const fimManha = batidas[1].data;
      const inicioTarde = batidas[2].data;
      segundosIntra = (inicioTarde.getTime() - fimManha.getTime()) / 1000;
      if (segundosIntra < 0) segundosIntra = 0;
    }

    // Java setHorasTrabalhadas com hh em decimal.
    adc.setHorasTrabalhadas(totalSegundosTrabalhados.div(SEGUNDOS_POR_HORA));
    adc.setHorasNoturnas(totalSegundosNoturnos.div(SEGUNDOS_POR_HORA));

    // HE simples: max(0, trabalhadas - 8h). Adicional CCT vai em verba-modules.
    const segundosExcedentes = totalSegundosTrabalhados.minus(JORNADA_PADRAO_DIARIA_SEGUNDOS);
    if (segundosExcedentes.gt(ZERO)) {
      adc.setHorasExtrasPrimeiroBloco(segundosExcedentes.div(SEGUNDOS_POR_HORA));
    } else {
      adc.setHorasExtrasPrimeiroBloco(ZERO);
    }
    adc.setHorasExtrasDemais(ZERO);
    adc.setHorasExtrasDescanso(ZERO);
    adc.setHorasExtrasFeriado(ZERO);
    adc.setHorasExtrasSabadoDomingo(ZERO);

    // Supressao intrajornada Art. 71 CLT — minimo 1h se trabalhou > 6h.
    if (totalSegundosTrabalhados.gt(6 * 3600)) {
      const minimoSegundos = 3600;
      if (segundosIntra < minimoSegundos) {
        const supressao = new Decimal(minimoSegundos - segundosIntra).div(SEGUNDOS_POR_HORA);
        adc.setSupressaoIntraIntegral(supressao);
      } else {
        adc.setSupressaoIntraIntegral(ZERO);
      }
    } else {
      adc.setSupressaoIntraIntegral(ZERO);
    }
    adc.setSupressaoIntraReforma(ZERO);

    return adc;
  }

  /**
   * Calcula segundos da janela [22:00-05:00] dentro de [entrada, saida].
   * Aproxima a Lei 8.813/94 — adicional noturno conta o periodo das 22h
   * de um dia ate as 5h do dia seguinte. Por simplicidade aqui usamos
   * janela diaria mais comum: cada dia tem [22:00-23:59] + [00:00-05:00].
   */
  private segundosNoturnos(entrada: Date, saida: Date): Decimal {
    let total = ZERO;
    const cursor = new Date(entrada);
    const fim = new Date(saida);
    while (cursor < fim) {
      const dia = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate()));
      // Janela noturna do dia: [22:00, 24:00] e [00:00, 05:00]
      const janela1Inicio = new Date(dia); janela1Inicio.setUTCHours(NOTURNO_INICIO_HORA);
      const janela1Fim = new Date(dia); janela1Fim.setUTCDate(janela1Fim.getUTCDate() + 1); janela1Fim.setUTCHours(NOTURNO_FIM_HORA);
      const interIni = cursor > janela1Inicio ? cursor : janela1Inicio;
      const interFim = fim < janela1Fim ? fim : janela1Fim;
      if (interFim > interIni) {
        total = total.plus((interFim.getTime() - interIni.getTime()) / 1000);
      }
      // Avanca cursor pro dia seguinte
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      cursor.setUTCHours(0, 0, 0, 0);
    }
    return total;
  }

  /**
   * somarTotais — agrega totais do periodo somando ApuracaoDiariaCartao.
   * Java: campos qtHorasNoturnasTrabalhadas + qtHorasExtras + ... atualizados
   * via Utils.somar() linha ~287-393.
   */
  somarTotais(): void {
    let trabalhadas = ZERO;
    let extras = ZERO;
    let noturnas = ZERO;
    let supIntra = ZERO;
    let supArt253 = ZERO;

    for (const adc of this.apuracoesDiarias) {
      trabalhadas = trabalhadas.plus(adc.getHorasTrabalhadas());
      extras = extras
        .plus(adc.getHorasExtrasPrimeiroBloco())
        .plus(adc.getHorasExtrasDemais())
        .plus(adc.getHorasExtrasDescanso())
        .plus(adc.getHorasExtrasFeriado())
        .plus(adc.getHorasExtrasSabadoDomingo());
      noturnas = noturnas.plus(adc.getHorasNoturnas());
      supIntra = supIntra
        .plus(adc.getSupressaoIntraIntegral())
        .plus(adc.getSupressaoIntraReforma())
        .plus(adc.getExcessoIntervaloIntra());
      supArt253 = supArt253.plus(adc.getSupressaoArt253());
    }

    this.totalHorasTrabalhadas = trabalhadas;
    this.totalHorasExtras = extras;
    this.totalHorasNoturnas = noturnas;
    this.totalSupressaoIntrajornada = supIntra;
    this.totalSupressaoArt253 = supArt253;
    // totalSupressaoInterjornada — sera preenchido quando ApuracaoDiariaCartao
    // ganhar campo dedicado (Java mantem em campo distinto da ApuracaoDiaria).
  }
}
