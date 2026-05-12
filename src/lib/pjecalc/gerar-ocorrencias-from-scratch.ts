/**
 * gerar-ocorrencias-from-scratch — gera `ocorrencias_precomputadas` para
 * verbas com `valor='calculado'` SEM precisar de XML PJC importado.
 *
 * Objetivo: virar a calculadora autônoma. Antes o engine V3 só calculava
 * verbas com `ocorrencias_precomputadas` (vindas do XML PJC). Verba
 * cadastrada manualmente retornava ZERO. Agora geramos as ocorrências
 * direto do (PjeVerba + PjeHistoricoSalarial[] + PjeCartaoPonto[] + PjeParametros),
 * usando a fórmula oficial PJe-Calc:
 *
 *   devido = ROUND_HALF_EVEN_2( base × multiplicador × quantidade ÷ divisor [× 2 se dobra] )
 *
 * Cobertura desta versão (verbas mais comuns):
 *   - mensal generic        (HE 50%, HE 100%, Adicional Noturno, ...)
 *   - dezembro / 13º        (proporcional integral + frações)
 *   - desligamento          (Aviso prévio indenizado, multa FGTS)
 *   - DSR derivado          (proporcional ao número de DSRs no mês)
 *   - férias proporcionais  (período aquisitivo, com 1/3 constitucional via reflexo)
 *
 * O que NÃO está coberto (marcado como TODO):
 *   - Período aquisitivo de férias com gozo parcial + abono pecuniário
 *   - Médias móveis para reflexos (valor_mensal / media_*)
 *   - Quantidade derivada de 'avos' com proporcionalidade fracionada
 *
 * Para esses, o engine V3 ainda exibe `verbas_sem_ocorrencias` no resumo.
 */
import type {
  PjeVerba,
  PjeHistoricoSalarial,
  PjeCartaoPonto,
  PjeParametros,
} from "./engine-types";

const HALF_EVEN_2 = (n: number): number => {
  // Banker's rounding a 2 casas (fórmula oficial PJe-Calc).
  // Pequenos epsilons evitam edge case do toEven em valores como 1.005.
  const x = n * 100;
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff > 0.5) return (floor + 1) / 100;
  if (diff < 0.5) return floor / 100;
  // Exatamente 0.5: arredonda para par.
  return (floor % 2 === 0 ? floor : floor + 1) / 100;
};

const COMP_RE = /^(\d{4})-(\d{2})/;

/** "2024-03-15" → "2024-03". */
function comp(dataISO: string): string {
  const m = COMP_RE.exec(dataISO);
  if (!m) return dataISO.slice(0, 7);
  return `${m[1]}-${m[2]}`;
}

/** Iterador de competências mensais inclusivas: inicio="2024-01", fim="2024-12" → 12 strings. */
function competenciasNoIntervalo(inicio: string, fim: string): string[] {
  const [ay, am] = inicio.split("-").map(Number);
  const [by, bm] = fim.split("-").map(Number);
  const out: string[] = [];
  let y = ay;
  let m = am;
  while (y < by || (y === by && m <= bm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** Resolve a base salarial vigente em uma competência específica para a verba. */
function baseSalarialEm(
  competencia: string,
  verba: PjeVerba,
  historicos: PjeHistoricoSalarial[],
): number {
  // `base_calculo.historicos` pode conter IDs (UUIDs ou "hist-XXX") OU
  // nomes ("Salário Base"). Aceitamos ambos por compatibilidade.
  const refs = new Set(
    (verba.base_calculo?.historicos ?? []).map((n) =>
      String(n).toUpperCase().trim(),
    ),
  );
  let soma = 0;
  for (const h of historicos) {
    const idMatch = refs.has(String(h.id).toUpperCase().trim());
    const nomeMatch = refs.has(h.nome.toUpperCase().trim());
    const elegivel = refs.size === 0 || idMatch || nomeMatch;
    if (!elegivel) continue;
    // 1) Ocorrência específica daquela competência tem prioridade
    const oc = h.ocorrencias?.find((o) =>
      (o.competencia ?? "").startsWith(competencia),
    );
    if (oc?.valor) {
      soma += oc.valor;
      continue;
    }
    // 2) Fallback: valor fixo informado (rubrica "Salário Base")
    if (h.tipo_valor === "informado" && h.valor_informado) {
      soma += h.valor_informado;
    }
  }
  return soma;
}

/** Resolve a quantidade da verba em uma competência (HE/cartão/avos/informada). */
function quantidadeEm(
  competencia: string,
  verba: PjeVerba,
  cartao: PjeCartaoPonto[],
  diasNoMes: number,
  diasTrabalhadosNoMes: number,
): number {
  const tipo = verba.tipo_quantidade;
  if (tipo === "informada") {
    return verba.quantidade_informada ?? 0;
  }
  // Cartão de ponto: agrega colunas declaradas em quantidade_cartao_colunas
  const cartaoMes = cartao.find((c) => c.competencia === competencia);
  if (tipo === "cartao_ponto" || tipo === "cartao_horas") {
    if (!cartaoMes) return 0;
    const colunas = verba.quantidade_cartao_colunas ?? [];
    if (colunas.length === 0) {
      // Sem colunas declaradas — para verbas "Horas Extras 50%" pegamos
      // horas_extras_50 por default
      const nomeLower = verba.nome.toLowerCase();
      if (nomeLower.includes("100")) return cartaoMes.horas_extras_100 ?? 0;
      if (nomeLower.includes("noturn")) return cartaoMes.horas_noturnas ?? 0;
      if (nomeLower.includes("dsr")) return cartaoMes.dsr_horas ?? 0;
      return cartaoMes.horas_extras_50 ?? 0;
    }
    let total = 0;
    for (const c of colunas) {
      const v = (cartaoMes as Record<string, unknown>)[c];
      if (typeof v === "number") total += v;
    }
    return total;
  }
  if (tipo === "cartao_dias") {
    return cartaoMes?.dias_trabalhados ?? diasTrabalhadosNoMes;
  }
  if (tipo === "calendario") {
    return diasNoMes;
  }
  if (tipo === "avos") {
    // 1 avo por mês trabalhado (aproximação simples para 13º proporcional)
    return diasTrabalhadosNoMes >= 15 ? 1 : 0;
  }
  return verba.quantidade_informada ?? 0;
}

/** Quantos dias no mês (yyyy-mm). */
function diasNoMes(competencia: string): number {
  const [y, m] = competencia.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** Dias trabalhados de um período (data_admissao..data_demissao) intersectado com a competência. */
function diasTrabalhadosEm(
  competencia: string,
  dataAdmissao: string,
  dataDemissao: string | null,
): number {
  const [y, m] = competencia.split("-").map(Number);
  const inicioMes = new Date(y, m - 1, 1);
  const fimMes = new Date(y, m, 0);
  const adm = new Date(dataAdmissao + "T00:00:00");
  const dem = dataDemissao ? new Date(dataDemissao + "T00:00:00") : null;
  const inicio = adm > inicioMes ? adm : inicioMes;
  const fim = dem && dem < fimMes ? dem : fimMes;
  if (inicio > fim) return 0;
  return Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1;
}

export type OcorrenciaPrecomputada = NonNullable<PjeVerba["ocorrencias_precomputadas"]>[number];

/**
 * Gera as ocorrências da verba "do zero" baseado em modo de pagamento.
 * Devolve array vazio se a verba não puder ser gerada (cobertura faltando)
 * — caller é responsável por marcar no resumo.
 */
export function gerarOcorrenciasFromScratch(
  verba: PjeVerba,
  historicos: PjeHistoricoSalarial[],
  cartao: PjeCartaoPonto[],
  parametros: PjeParametros,
): OcorrenciaPrecomputada[] {
  if (verba.valor !== "calculado") return [];

  const pi = verba.periodo_inicio;
  const pf = verba.periodo_fim;
  if (!pi || !pf) return [];

  const oc = verba.ocorrencia_pagamento ?? "mensal";

  // Modo `periodo_aquisitivo` exige port completo do PJe-Calc com
  // tracking de período aquisitivo de férias, gozos, abono pecuniário,
  // prescrição quinquenal — não coberto nesta wave. Devolve [] para
  // que o resumo marque a verba como sem ocorrências (banner UI).
  if (oc === "periodo_aquisitivo") return [];

  const competencias = competenciasNoIntervalo(comp(pi), comp(pf));

  const out: OcorrenciaPrecomputada[] = [];

  for (const c of competencias) {
    // Filtragem por modo de pagamento
    if (oc === "dezembro" && !c.endsWith("-12")) continue;
    if (oc === "desligamento") {
      const demComp = parametros.data_demissao
        ? comp(parametros.data_demissao)
        : null;
      if (demComp !== c) continue;
    }

    const base = baseSalarialEm(c, verba, historicos);
    if (base <= 0 && verba.tipo_quantidade !== "informada") continue;
    const dias = diasNoMes(c);
    const diasTrab = diasTrabalhadosEm(
      c,
      parametros.data_admissao,
      parametros.data_demissao ?? null,
    );
    const qty = quantidadeEm(c, verba, cartao, dias, diasTrab);
    if (qty <= 0) continue;

    let mult = verba.multiplicador ?? 1;
    // Súmula 340 TST: comissionista puro → HE = só adicional (mult - 1)
    if (verba.sumula_340_comissionista && mult > 1) {
      mult = mult - 1;
    }

    let div = verba.divisor_informado ?? 220;
    // Carga horária reduzida (bancário 6h → 180), comerciário, etc.
    if (verba.tipo_divisor === "carga_horaria") {
      div = parametros.carga_horaria_padrao ?? 220;
    }

    const dobra = !!verba.dobrar_valor_devido;

    // Fórmula oficial PJe-Calc com HALF_EVEN
    let devido = (base * mult * qty) / div;
    if (dobra) devido = devido * 2;
    devido = HALF_EVEN_2(devido);

    // Caso 13º proporcional/dezembro: divide o "ano" em avos
    if (oc === "dezembro" && verba.caracteristica === "13_salario") {
      const [yearC] = c.split("-").map(Number);
      // Conta meses trabalhados no ano até dezembro
      let avos = 0;
      for (let mm = 1; mm <= 12; mm++) {
        const compMes = `${yearC}-${String(mm).padStart(2, "0")}`;
        const diasTrabMes = diasTrabalhadosEm(
          compMes,
          parametros.data_admissao,
          parametros.data_demissao ?? null,
        );
        if (diasTrabMes >= 15) avos += 1;
      }
      if (avos === 0) continue;
      // devido = (base / 12) * avos
      const devido13 = HALF_EVEN_2((base / 12) * avos);
      out.push({
        competencia: c,
        base,
        divisor: 12,
        multiplicador: 1,
        quantidade: avos,
        dobra,
        devido: devido13,
        pago: 0,
      });
      continue;
    }

    out.push({
      competencia: c,
      base,
      divisor: div,
      multiplicador: mult,
      quantidade: qty,
      dobra,
      devido,
      pago: 0,
    });
  }

  return out;
}

/**
 * Aplica o gerador para TODAS as verbas de uma lista, preenchendo
 * `ocorrencias_precomputadas` quando ausente. Não toca em verbas que
 * já vieram com ocorrências (do XML PJC).
 *
 * Retorna a lista de nomes de verbas que NÃO conseguimos gerar
 * (cobertura faltando) — caller propaga para o resumo.
 */
export function preencherOcorrenciasFromScratch(
  verbas: PjeVerba[],
  historicos: PjeHistoricoSalarial[],
  cartao: PjeCartaoPonto[],
  parametros: PjeParametros,
): { naoCobertas: string[] } {
  const naoCobertas: string[] = [];
  for (const v of verbas) {
    if (v.valor !== "calculado") continue;
    if (v.ocorrencias_precomputadas?.length) continue;
    const ocs = gerarOcorrenciasFromScratch(v, historicos, cartao, parametros);
    if (ocs.length > 0) {
      v.ocorrencias_precomputadas = ocs;
    } else {
      naoCobertas.push(v.nome);
    }
  }
  return { naoCobertas };
}
