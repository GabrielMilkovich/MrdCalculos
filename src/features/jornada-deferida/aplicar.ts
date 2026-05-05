/**
 * Aplica a regra de jornada deferida (sentença) sobre o resultado do parser
 * de cartão de ponto. Transforma os horários antes do CSV ser gerado.
 *
 * Modos:
 *   1. OFFSET (regra base) — soma delta_inicio_min na ENTRADA do primeiro
 *      par e delta_fim_min na SAÍDA do último par. Pares intermediários
 *      (intervalos de almoço) ficam intactos.
 *   2. OVERRIDE (data específica) — substitui TODA a jornada do dia por
 *      um par único [inicio_hora, fim_hora] com `intervalo_min` no meio.
 *
 * Casos de borda tratados:
 *   - Cruzou meia-noite no fim: saida vira "00:00" (PJe-Calc trata).
 *   - Cruzou início do dia: trunca em "00:00" e adiciona warning.
 *   - Override em dia sem batida no cartão: aplica mesmo assim.
 *   - Override fora da vigência da regra base: respeita override.
 *   - Saída antes da entrada após override: descarta override e warna.
 *
 * Tudo em minutos inteiros (não usa Number/parseFloat para horários).
 */

import type {
  ApuracaoDiaria,
  Marcacao,
  ParseCartaoPontoResult,
} from '../data-extraction/parsers/cartao-ponto';
import {
  dataDoAno,
  type RegraRecorrente,
} from './calendario-comemorativo';

export interface JornadaRegraBase {
  delta_inicio_min: number; // negativo = antes
  delta_fim_min: number; // positivo = depois
  intervalo_min: number | null; // null = mantém o intervalo do cartão
  vigencia: { inicio: Date | null; fim: Date | null };
}

export type JornadaOverride =
  | {
      kind: 'data_especifica';
      data: Date; // UTC midnight
      inicio: string; // 'HH:MM'
      fim: string;
      intervalo_min: number;
      descricao: string;
    }
  | {
      kind: 'recorrente';
      regra: RegraRecorrente;
      inicio: string;
      fim: string;
      intervalo_min: number;
      descricao: string;
    };

export interface JornadaRegras {
  regraBase: JornadaRegraBase;
  overrides: JornadaOverride[];
}

export interface DiffPorDia {
  data: string; // ISO yyyy-mm-dd
  antes: ApuracaoDiaria;
  depois: ApuracaoDiaria;
  transformacao: 'offset' | 'override' | 'sem_alteracao';
  descricao_override?: string;
}

export interface AplicarResult {
  apuracoes: ApuracaoDiaria[];
  warnings: string[];
  diffPorDia: DiffPorDia[];
}

// ============================================================
// Helpers minutos / HH:MM
// ============================================================

function hhmmToMin(s: string): number | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function minToHhmm(min: number): string {
  // Trunca em [0, 24*60) — chamada principal trata travessia separadamente.
  const m = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function dataIsoToUtc(iso: string): Date {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`Data ISO inválida: ${iso}`);
  return new Date(
    Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)),
  );
}

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

// ============================================================
// Materialização dos overrides
// ============================================================

interface OverrideMaterializado {
  data: Date;
  inicio: string;
  fim: string;
  intervalo_min: number;
  descricao: string;
}

/**
 * Expande regras recorrentes nas datas concretas dentro do range das
 * apurações. Datas específicas passam direto.
 */
function materializarOverrides(
  overrides: JornadaOverride[],
  rangeAnos: { inicio: number; fim: number },
): OverrideMaterializado[] {
  const out: OverrideMaterializado[] = [];
  for (const o of overrides) {
    if (o.kind === 'data_especifica') {
      out.push({
        data: o.data,
        inicio: o.inicio,
        fim: o.fim,
        intervalo_min: o.intervalo_min,
        descricao: o.descricao,
      });
    } else {
      for (let ano = rangeAnos.inicio; ano <= rangeAnos.fim; ano++) {
        const d = dataDoAno(o.regra, ano);
        if (d) {
          out.push({
            data: d,
            inicio: o.inicio,
            fim: o.fim,
            intervalo_min: o.intervalo_min,
            descricao: o.descricao,
          });
        }
      }
    }
  }
  return out;
}

// ============================================================
// Aplicação
// ============================================================

export function aplicarJornadaDeferida(
  parsed: ParseCartaoPontoResult,
  regras: JornadaRegras,
): AplicarResult {
  const warnings: string[] = [];
  const diffPorDia: DiffPorDia[] = [];

  // Range de anos para materializar regras recorrentes.
  const datas = parsed.apuracoes.map((a) => dataIsoToUtc(a.data));
  const rangeAnos =
    datas.length === 0
      ? { inicio: new Date().getUTCFullYear(), fim: new Date().getUTCFullYear() }
      : {
          inicio: Math.min(...datas.map((d) => d.getUTCFullYear())),
          fim: Math.max(...datas.map((d) => d.getUTCFullYear())),
        };

  const overridesMat = materializarOverrides(regras.overrides, rangeAnos);
  // Index: data → override (último override do dia ganha).
  const overrideMap = new Map<string, OverrideMaterializado>();
  for (const o of overridesMat) {
    const k = isoDate(o.data);
    overrideMap.set(k, o);
  }

  const novas: ApuracaoDiaria[] = [];

  for (const ap of parsed.apuracoes) {
    const apData = dataIsoToUtc(ap.data);
    const ov = overrideMap.get(ap.data);

    // 1. Override tem precedência absoluta (sentença mais específica vence).
    if (ov) {
      const transformada = aplicarOverride(ap, ov, warnings);
      if (transformada) {
        novas.push(transformada);
        diffPorDia.push({
          data: ap.data,
          antes: ap,
          depois: transformada,
          transformacao: 'override',
          descricao_override: ov.descricao,
        });
      } else {
        novas.push(ap);
        diffPorDia.push({
          data: ap.data,
          antes: ap,
          depois: ap,
          transformacao: 'sem_alteracao',
          descricao_override: `${ov.descricao} (descartado por inconsistência)`,
        });
      }
      continue;
    }

    // 2. Vigência da regra base.
    const dentroVigencia =
      (!regras.regraBase.vigencia.inicio ||
        apData >= regras.regraBase.vigencia.inicio) &&
      (!regras.regraBase.vigencia.fim ||
        apData <= regras.regraBase.vigencia.fim);

    if (!dentroVigencia) {
      novas.push(ap);
      diffPorDia.push({
        data: ap.data,
        antes: ap,
        depois: ap,
        transformacao: 'sem_alteracao',
      });
      continue;
    }

    // 3. Aplica offset (se houver delta).
    if (
      regras.regraBase.delta_inicio_min === 0 &&
      regras.regraBase.delta_fim_min === 0 &&
      regras.regraBase.intervalo_min === null
    ) {
      novas.push(ap);
      diffPorDia.push({
        data: ap.data,
        antes: ap,
        depois: ap,
        transformacao: 'sem_alteracao',
      });
      continue;
    }

    const transformada = aplicarOffset(ap, regras.regraBase, warnings);
    novas.push(transformada);
    diffPorDia.push({
      data: ap.data,
      antes: ap,
      depois: transformada,
      transformacao: 'offset',
    });
  }

  // 4. Datas SEM cartão mas COM override — adicionamos como apuração nova.
  for (const ov of overridesMat) {
    const k = isoDate(ov.data);
    if (parsed.apuracoes.some((a) => a.data === k)) continue;
    if (
      ov.data.getUTCFullYear() < rangeAnos.inicio ||
      ov.data.getUTCFullYear() > rangeAnos.fim
    ) {
      // fora do range de cartões — não pertence a este caso
      continue;
    }
    const novaApuracao = montarApuracaoDeOverride(k, ov, warnings);
    if (novaApuracao) {
      novas.push(novaApuracao);
      diffPorDia.push({
        data: k,
        antes: vazia(k),
        depois: novaApuracao,
        transformacao: 'override',
        descricao_override: `${ov.descricao} (dia sem batida no cartão)`,
      });
    }
  }

  // Re-ordena cronologicamente (override pode ter inserido datas).
  novas.sort((a, b) => a.data.localeCompare(b.data));

  return {
    apuracoes: novas,
    warnings,
    diffPorDia,
  };
}

function isoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function vazia(dataIso: string): ApuracaoDiaria {
  return {
    data: dataIso,
    dia_semana: null,
    ocorrencia: 'NORMAL',
    marcacoes: [],
    eventos: [],
    observacao: null,
  };
}

function aplicarOverride(
  ap: ApuracaoDiaria,
  ov: OverrideMaterializado,
  warnings: string[],
): ApuracaoDiaria | null {
  const ini = hhmmToMin(ov.inicio);
  const fim = hhmmToMin(ov.fim);
  if (ini === null || fim === null) {
    warnings.push(
      `${ap.data}: override "${ov.descricao}" tem horários inválidos (${ov.inicio} / ${ov.fim}) — ignorado.`,
    );
    return null;
  }
  const intervalo = ov.intervalo_min;
  if (fim <= ini && fim !== 0) {
    warnings.push(
      `${ap.data}: override "${ov.descricao}" tem fim ≤ início (${ov.inicio}/${ov.fim}). Pode indicar travessia de meia-noite — confira no Review.`,
    );
  }
  if (intervalo < 0 || intervalo > 240) {
    warnings.push(
      `${ap.data}: override "${ov.descricao}" tem intervalo fora de [0,240] min (${intervalo}) — ignorado.`,
    );
    return null;
  }

  // Modela como 2 pares: [ini, ini+meioJornada], [ini+meioJornada+intervalo, fim].
  // Mais simples e fiel: 1 par só [ini, fim]; intervalo fica como evento informativo.
  // PJe-Calc aceita 1 par.
  // Mas se o intervalo > 0, modelar como 2 pares respeitando o intervalo no meio
  // requer saber QUANDO o intervalo cai. Sentença típica não fixa isso —
  // assumimos meio da jornada.
  let marcacoes: Marcacao[];
  if (intervalo === 0 || fim - ini <= intervalo) {
    marcacoes = [{ e: minToHhmm(ini), s: minToHhmm(fim) }];
  } else {
    const meio = ini + Math.floor((fim - ini - intervalo) / 2);
    marcacoes = [
      { e: minToHhmm(ini), s: minToHhmm(meio) },
      { e: minToHhmm(meio + intervalo), s: minToHhmm(fim) },
    ];
  }

  return {
    ...ap,
    marcacoes,
    observacao: `Jornada deferida pela sentença: ${ov.descricao}`,
  };
}

function montarApuracaoDeOverride(
  dataIso: string,
  ov: OverrideMaterializado,
  warnings: string[],
): ApuracaoDiaria | null {
  return aplicarOverride(vazia(dataIso), ov, warnings);
}

function aplicarOffset(
  ap: ApuracaoDiaria,
  regra: JornadaRegraBase,
  warnings: string[],
): ApuracaoDiaria {
  if (ap.marcacoes.length === 0) {
    return ap; // sem batidas, nada a transformar
  }

  // Encontra a entrada do PRIMEIRO par e a saída do ÚLTIMO par.
  const primeiroComE = ap.marcacoes.findIndex((m) => m.e);
  const ultimoComS = (() => {
    for (let i = ap.marcacoes.length - 1; i >= 0; i--) {
      if (ap.marcacoes[i].s) return i;
    }
    return -1;
  })();

  if (primeiroComE === -1 || ultimoComS === -1) return ap;

  const novasMarcs = ap.marcacoes.map((m) => ({ ...m }));

  // Aplica delta_inicio na entrada do primeiro par.
  const eOriginal = hhmmToMin(novasMarcs[primeiroComE].e);
  if (eOriginal !== null) {
    let eNovo = eOriginal + regra.delta_inicio_min;
    if (eNovo < 0) {
      warnings.push(
        `${ap.data}: offset cruza início do dia (entrada ${novasMarcs[primeiroComE].e} ${regra.delta_inicio_min}min = ${eNovo}min). Truncado em 00:00 — confira se deve retroagir ao dia anterior.`,
      );
      eNovo = 0;
    } else if (eNovo >= 24 * 60) {
      eNovo = eNovo % (24 * 60);
    }
    novasMarcs[primeiroComE].e = minToHhmm(eNovo);
  }

  // Aplica delta_fim na saída do último par.
  const sOriginal = hhmmToMin(novasMarcs[ultimoComS].s);
  if (sOriginal !== null) {
    let sNovo = sOriginal + regra.delta_fim_min;
    if (sNovo >= 24 * 60) {
      sNovo = sNovo - 24 * 60; // cruzou meia-noite — saída no dia seguinte
      // PJe-Calc aceita; sinaliza só por transparência.
      // Não emite warning porque é caso comum no varejo (loja fecha 22h, +1h vira 23h, +2h vira 00h do dia seguinte).
    } else if (sNovo < 0) {
      warnings.push(
        `${ap.data}: offset retroage saída antes do início do dia (${novasMarcs[ultimoComS].s} ${regra.delta_fim_min}min). Truncado em 00:00.`,
      );
      sNovo = 0;
    }
    novasMarcs[ultimoComS].s = minToHhmm(sNovo);
  }

  // Intervalo: se especificado, ajusta o gap entre primeiro par e segundo par
  // (caso houver). Sentença típica diz "intervalo de 30 min" — se o cartão
  // tinha 1h, comprime o intervalo. Implementação: re-calcula o início do
  // 2º par como `saída do 1º par + intervalo_min`.
  if (regra.intervalo_min !== null && novasMarcs.length >= 2) {
    const saida1 = hhmmToMin(novasMarcs[0].s);
    const entrada2 = hhmmToMin(novasMarcs[1].e);
    if (saida1 !== null && entrada2 !== null) {
      const novaEntrada2 = saida1 + regra.intervalo_min;
      if (novaEntrada2 >= 24 * 60) {
        warnings.push(
          `${ap.data}: aplicar intervalo de ${regra.intervalo_min}min cruzaria meia-noite — intervalo NÃO aplicado.`,
        );
      } else if (novaEntrada2 !== entrada2) {
        novasMarcs[1].e = minToHhmm(novaEntrada2);
      }
    }
  }

  return {
    ...ap,
    marcacoes: novasMarcs,
    observacao: ap.observacao ?? null,
  };
}
