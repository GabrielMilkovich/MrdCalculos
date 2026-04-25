/**
 * EXPERIMENTO — porte 1:1 de MaquinaDeCalculoDoInss.calcularValorBaseVerbas
 *
 * Java original: pjecalc-fonte/.../sobresalarios/MaquinaDeCalculoDoInss.java linhas 606-622
 *
 * Este arquivo NÃO é usado pelo motor. É um experimento para:
 *   1. Demonstrar viabilidade de porte 1:1 da lógica
 *   2. Identificar dependências e divergências do código atual
 *   3. Servir de referência para futura integração via pipeline de agentes
 *
 * IMPORTANTE: este experimento depende de classes hipotéticas que ainda
 * não existem completas no TS:
 *   - VerbaDeCalculo.getOcorrenciasOptimizerListSearch() — não existe
 *   - OcorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias() — parcialmente existe
 *   - Calculo.getRegimeDoContrato() — não existe (não usamos regime intermitente)
 *
 * Esses são os GAPS reais que aparecem ao tentar portar 1:1.
 *
 * Tempo gasto neste experimento: ver experiments/inss-port-attempt/RELATORIO.md
 */

import Decimal from 'decimal.js';

// ─────────────────────────────────────────────────────────────────────────
// CONFIG: Decimal.js com mesmo contexto do Java (Utils.CONTEXTO_MATEMATICO)
// Java: MathContext(20, RoundingMode.HALF_EVEN)
// ─────────────────────────────────────────────────────────────────────────
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

// ─────────────────────────────────────────────────────────────────────────
// HELPERS — replica Utils.java do Java
// ─────────────────────────────────────────────────────────────────────────

/** Java: Utils.somar(p1, p2) — retorna null se qualquer for null */
function somar(p1: Decimal | null, p2: Decimal | null): Decimal | null {
  if (p1 === null || p2 === null) return null;
  return p1.plus(p2);
}

/** Java: Utils.zerarSeNegativo(v) — null se null, 0 se negativo, valor caso contrário */
function zerarSeNegativo(v: Decimal | null): Decimal | null {
  if (v === null) return null;
  if (v.isNegative()) return new Decimal(0);
  return v;
}

/** Java: Utils.nulo(x) */
function nulo(x: unknown): boolean {
  return x === null || x === undefined;
}

/** Java: Utils.naoNulo(x) */
function naoNulo(x: unknown): boolean {
  return x !== null && x !== undefined;
}

// ─────────────────────────────────────────────────────────────────────────
// INTERFACES — abstração dos tipos do Java necessários
// ─────────────────────────────────────────────────────────────────────────

export interface Competencia {
  getAno(): number;
  getMes(): number;
  /** Retorna chave string YYYY-MM para comparação rápida */
  toKey(): string;
}

export enum CaracteristicaDaVerba {
  COMUM = 'COMUM',
  DECIMO_TERCEIRO_SALARIO = 'DECIMO_TERCEIRO_SALARIO',
  FERIAS = 'FERIAS',
  AVISO_PREVIO = 'AVISO_PREVIO',
  // ... outros
}

export enum RegimeDoContrato {
  CLT = 'CLT',
  INTERMITENTE = 'INTERMITENTE',
  // ...
}

export interface VerbaDeCalculo {
  getCaracteristica(): CaracteristicaDaVerba;
  getCalculo(): { getRegimeDoContrato(): RegimeDoContrato };
  getIncidenciaINSS(): boolean;
  getOcorrencias(): OcorrenciaDeVerba[];
}

export interface OcorrenciaDeVerba {
  getAtivo(): boolean;
  getVerbaDeCalculo(): VerbaDeCalculo;
  getCompetencia(): Competencia;
  /**
   * Java linha 663: getDiferencaParaCalculoDasIncidencias()
   * Pode retornar null se férias indenizadas.
   * Aplica multiplicador 50% se férias com dobra.
   * Retira abono se férias com abono.
   */
  getDiferencaParaCalculoDasIncidencias(): Decimal | null;
}

// ─────────────────────────────────────────────────────────────────────────
// PORTE 1:1 — calcularValorBaseVerbas
// Java original linhas 606-622:
// ─────────────────────────────────────────────────────────────────────────
//
// private BigDecimal calcularValorBaseVerbas(
//     List<OptimizerListSearch<Competencia, OcorrenciaDeVerba>> ocorrenciasDasVerbasComIncidenciaDeInss,
//     Competencia competencia,
//     boolean isDecimoTerceiro
// ) {
//     BigDecimal soma = BigDecimal.ZERO;
//     for (var optSearch : ocorrenciasDasVerbasComIncidenciaDeInss) {
//         var iter = optSearch.search(competencia);
//         while (Utils.naoNulo(iter) && iter.hasNext()) {
//             BigDecimal base;
//             var ocorrenciaDeVerba = iter.next();
//             if (Utils.nulo(ocorrenciaDeVerba)
//                 || !ocorrenciaDeVerba.getAtivo()
//                 || Utils.nulo(base = ocorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias())) continue;
//             boolean isCarac13 = DECIMO_TERCEIRO_SALARIO.equals(ocorrenciaDeVerba.getVerbaDeCalculo().getCaracteristica());
//             if (isDecimoTerceiro && isCarac13 || !isDecimoTerceiro && !isCarac13) {
//                 soma = Utils.somar(soma, Utils.zerarSeNegativo(base));
//             }
//             if (!isDecimoTerceiro || !isCarac13
//                 || !INTERMITENTE.equals(ocorrenciaDeVerba.getVerbaDeCalculo().getCalculo().getRegimeDoContrato())) continue;
//             soma = atualizarDiferencaDasOcorrenciasParaRegimeIntermitente(competencia, soma, ocorrenciaDeVerba);
//         }
//     }
//     return soma;
// }
//
// ─────────────────────────────────────────────────────────────────────────

/**
 * Soma diferenças das ocorrências de verbas com incidência INSS para uma
 * competência específica, separando por regime (normal vs 13º).
 *
 * @param verbasComIncidenciaInss Verbas pré-filtradas (incidência INSS = true).
 *                                No Java é List<OptimizerListSearch>, aqui usamos array
 *                                pelo simplicidade — preserva semântica.
 * @param competencia Competência alvo (ex: 2020-03)
 * @param isDecimoTerceiro Se true, soma só verbas de característica 13º.
 *                        Se false, soma só verbas que NÃO são 13º.
 *
 * @returns Soma das diferenças. Retorna `Decimal(0)` se nada (NUNCA null,
 *          mesmo que internamente algumas somas devolvam null — convertido).
 */
export function calcularValorBaseVerbas(
  verbasComIncidenciaInss: VerbaDeCalculo[],
  competencia: Competencia,
  isDecimoTerceiro: boolean,
): Decimal {
  let soma: Decimal | null = new Decimal(0);

  for (const verba of verbasComIncidenciaInss) {
    // Java: optSearch.search(competencia) retorna iterator das ocorrências
    // dessa competência específica nessa verba. No nosso TS, filtramos.
    const ocorrenciasDaCompetencia = verba.getOcorrencias().filter(
      (oc) => oc.getCompetencia().toKey() === competencia.toKey(),
    );

    for (const ocorrenciaDeVerba of ocorrenciasDaCompetencia) {
      // Filtros do Java linha 613:
      // 1. ocorrencia não-null (já garantido pelo TS — array iteration)
      // 2. ocorrencia.getAtivo() == true
      // 3. base != null (getDiferencaParaCalculoDasIncidencias retorna null
      //    para férias indenizadas)
      if (!ocorrenciaDeVerba.getAtivo()) continue;

      const base = ocorrenciaDeVerba.getDiferencaParaCalculoDasIncidencias();
      if (nulo(base)) continue;

      // Java linha 614: classifica se a verba é 13º
      const isCarac13 = ocorrenciaDeVerba.getVerbaDeCalculo().getCaracteristica()
        === CaracteristicaDaVerba.DECIMO_TERCEIRO_SALARIO;

      // Java linha 615: condicional XNOR
      // Soma SE (isDecimoTerceiro AND isCarac13) OR (!isDecimoTerceiro AND !isCarac13)
      // Em outras palavras: ambos true ou ambos false
      const ambosVerdadeiros = isDecimoTerceiro && isCarac13;
      const ambosFalsos = !isDecimoTerceiro && !isCarac13;
      if (ambosVerdadeiros || ambosFalsos) {
        // Java linha 616: soma = somar(soma, zerarSeNegativo(base))
        soma = somar(soma, zerarSeNegativo(base));
      }

      // Java linha 618: Regime INTERMITENTE no 13º — recursão pelos meses do ano
      // continue (pula o atualizar) se NÃO for 13º OU verba não é 13º OR regime não é INTERMITENTE
      if (
        !isDecimoTerceiro
        || !isCarac13
        || ocorrenciaDeVerba.getVerbaDeCalculo().getCalculo().getRegimeDoContrato()
          !== RegimeDoContrato.INTERMITENTE
      ) {
        continue;
      }

      // Java linha 619: trata regime intermitente
      soma = atualizarDiferencaDasOcorrenciasParaRegimeIntermitente(
        competencia,
        soma,
        ocorrenciaDeVerba,
      );
    }
  }

  // Java retorna BigDecimal — pode ser null se Utils.somar() devolveu null
  // em algum ponto. Aqui normalizamos para Decimal(0) para o caller.
  return soma ?? new Decimal(0);
}

// ─────────────────────────────────────────────────────────────────────────
// Helper: Regime INTERMITENTE no 13o
// Java linhas 625-641
// ─────────────────────────────────────────────────────────────────────────
function atualizarDiferencaDasOcorrenciasParaRegimeIntermitente(
  competencia: Competencia,
  soma: Decimal | null,
  ocorrenciaDeVerba: OcorrenciaDeVerba,
): Decimal | null {
  // Java percorre TODOS os meses do ano da competência atual,
  // somando as diferenças de cada mês.
  const ano = competencia.getAno();
  const mesAtual = competencia.getMes(); // 0-11 no Java (Calendar.JANUARY = 0)

  // Da competência atual até janeiro do ano (decrescente)
  for (let mes = mesAtual; mes >= 0; mes--) {
    const competenciaIter = makeCompetencia(ano, mes);
    const ocorrenciasAno = ocorrenciaDeVerba.getVerbaDeCalculo().getOcorrencias()
      .filter((oc) => oc.getCompetencia().toKey() === competenciaIter.toKey());

    for (const ocorrencia of ocorrenciasAno) {
      if (!ocorrencia.getAtivo()) continue;
      const valor = ocorrencia.getDiferencaParaCalculoDasIncidencias();
      if (nulo(valor)) continue;
      soma = somar(soma, zerarSeNegativo(valor));
    }
  }

  return soma;
}

function makeCompetencia(ano: number, mes: number): Competencia {
  return {
    getAno: () => ano,
    getMes: () => mes,
    toKey: () => `${ano}-${String(mes + 1).padStart(2, '0')}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// DIVERGÊNCIAS detectadas vs nosso InssModuloAdapter atual
// ─────────────────────────────────────────────────────────────────────────
//
// 1. Nosso TS NÃO usa getDiferencaParaCalculoDasIncidencias() — usa
//    oc.getDiferenca() direto. Diferença:
//    - Férias indenizadas: Java retorna null (exclui); nós usamos diferença
//    - Férias com dobra: Java multiplica × 0.5; nós usamos diferença total
//    - Férias com abono: Java retira abono; nós não
//
// 2. Nosso TS NÃO trata regime INTERMITENTE 13º (linha 618 Java).
//    Casos com regime intermitente terão 13º calculado errado.
//
// 3. Nosso TS soma com base.toNumber() (perda de precisão) e usa
//    Records<string, number>. Java mantém BigDecimal (precision 20).
//    Para valores típicos (R$ < 1M), perda ≈ 1 centavo por competência —
//    aceitável.
//
// 4. Nosso TS usa filtro inline do incidenciaINSS por verba dentro do loop.
//    Java pré-filtra antes de chamar calcularValorBaseVerbas (mais limpo,
//    mesma semântica).
//
// 5. Nosso TS NÃO chama Utils.somar(null, x) → null. Em vez disso,
//    usa números positivos. Em Java, se uma soma intermediária ficar null,
//    soma futura também é null. Isso afeta verbas com férias indenizadas
//    no meio do loop — pode propagar null indevidamente.
//
// IMPACTO ESTIMADO no caso joseli-silva:
//   Joseli tem comissões + DSR + mínimo garantido. NÃO tem férias.
//   Logo as divergências #1, #2 não afetam joseli.
//   Divergência #3 é precisão pequena (centavos).
//   GAP de R$15K em INSS NÃO é explicado por este método.
//   → INVESTIGAR liquidarInssSobreSalariosDevidos (chamador deste).
