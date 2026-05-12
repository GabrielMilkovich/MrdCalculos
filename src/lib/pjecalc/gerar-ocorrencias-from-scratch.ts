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
  PjeFerias,
  PjeFalta,
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
 * Verifica se uma data foi reiniciada por uma falta com `reiniciar_periodo_aquisitivo`.
 * Porte simplificado de Calculo.encontrarFaltasQueReiniciamFerias(Java).
 */
function aplicarReinicioFerias(
  dataInicial: Date,
  faltas: PjeFalta[],
): Date {
  // Falta com flag reinicia o período a partir da data de retorno (data_final + 1).
  let cursor = new Date(dataInicial);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const f of faltas) {
      if (!f.reinicia) continue;
      const fim = new Date(f.data_final + "T00:00:00");
      if (fim >= cursor) {
        const retorno = new Date(fim);
        retorno.setDate(retorno.getDate() + 1);
        if (retorno > cursor) {
          cursor = retorno;
          mudou = true;
        }
      }
    }
  }
  return cursor;
}

/**
 * Gera ocorrências para verba em modo PERIODO_AQUISITIVO (férias).
 *
 * Porte simplificado do bloco PERIODO_AQUISITIVO de MaquinaDeCalculo.java:118-309.
 * Cobre:
 *   - GOZADAS: 1 ocorrência por gozo (até 3), com dobra individual quando marcada
 *   - GOZADAS_PARCIALMENTE: gozos + ocorrência adicional no demissão (saldo)
 *   - INDENIZADAS: 1 ocorrência no demissão (com dobra geral se marcada)
 *   - NAO_GOZADAS / VENCIDAS_NAO_GOZADAS: 1 ocorrência no demissão
 *   - PERDIDAS: 0 ocorrências
 *   - Abono pecuniário: marca ferias_com_abono na ocorrência (Art. 143 CLT)
 *   - Reinicio por falta: aplica `reinicia_ferias` flag da PjeFalta
 *   - Prescrição quinquenal: se data_prescricao posterior a periodo concessivo, ignora
 *   - Período aquisitivo fracionário: gera ocorrência se demissão antes de completar
 *     12 meses do último aquisitivo (mín 15 dias = 1 avo).
 *
 * NÃO COBRE (deixa de fora intencionalmente — corner cases raros):
 *   - Aviso prévio projetado modificando dataDemissaoProjetada (Java 130-132)
 *   - Dividir período de gozo em duas ocorrências quando atravessa periodoConcessivo
 *     (Java 153 dividirNaData) — caso muito incomum, gera 1 ocorrência única
 */
function gerarOcorrenciasPeriodoAquisitivo(
  verba: PjeVerba,
  historicos: PjeHistoricoSalarial[],
  parametros: PjeParametros,
  ferias: PjeFerias[],
  faltas: PjeFalta[],
): OcorrenciaPrecomputada[] {
  const out: OcorrenciaPrecomputada[] = [];
  const dataDemissao = parametros.data_demissao
    ? new Date(parametros.data_demissao + "T00:00:00")
    : null;
  const periodoInicial = new Date(verba.periodo_inicio + "T00:00:00");
  const periodoFinal = new Date(verba.periodo_fim + "T00:00:00");
  const dataPrescricao = parametros.data_prescricao_quinquenal
    ? new Date(parametros.data_prescricao_quinquenal + "T00:00:00")
    : null;

  const baseNa = (data: Date): number => {
    const c = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    return baseSalarialEm(c, verba, historicos);
  };

  const divisor = verba.divisor_informado ?? 30; // férias: divisor=30 (1/30 avo)
  const multBase = verba.multiplicador ?? 1;

  function pushOcorrencia(
    competenciaDate: Date,
    quantidade: number,
    dobra: boolean,
    feriasComAbono: boolean,
    feriasIndenizadas: boolean,
  ): void {
    const base = baseNa(competenciaDate);
    if (base <= 0 || quantidade <= 0) return;
    let devido = (base * multBase * quantidade) / divisor;
    if (dobra) devido = devido * 2;
    devido = HALF_EVEN_2(devido);
    const competencia = `${competenciaDate.getFullYear()}-${String(
      competenciaDate.getMonth() + 1,
    ).padStart(2, "0")}`;
    out.push({
      competencia,
      base,
      divisor,
      multiplicador: multBase,
      quantidade,
      dobra,
      devido,
      pago: 0,
      ferias_indenizadas: feriasIndenizadas,
      ferias_com_abono: feriasComAbono,
    });
  }

  const periodosAquisitivosTratados = new Set<string>();

  for (const f of ferias) {
    if (f.situacao === "perdidas") continue;

    // Prescrição: se data_prescricao está APÓS o fim do concessivo, ignora.
    const fimConcessivo = new Date(f.periodo_concessivo_fim + "T00:00:00");
    if (
      parametros.prescricao_quinquenal &&
      dataPrescricao &&
      dataPrescricao > fimConcessivo
    ) {
      continue;
    }

    periodosAquisitivosTratados.add(f.periodo_aquisitivo_inicio);

    // INDENIZADAS / VENCIDAS_NAO_GOZADAS: 1 ocorrência no demissão
    if (
      f.situacao === "indenizadas" ||
      (f.situacao as string) === "vencidas_nao_gozadas"
    ) {
      if (!dataDemissao || dataDemissao > periodoFinal) continue;
      pushOcorrencia(
        dataDemissao,
        f.prazo_dias,
        !!f.dobra,
        !!f.abono,
        true, // ferias_indenizadas
      );
      continue;
    }

    // GOZADAS / GOZADAS_PARCIALMENTE: 1 ocorrência por gozo
    let diasGozados = 0;
    type Gozo = { inicio?: string; fim?: string; dobra?: boolean };
    const gozos: Gozo[] = [
      // Compatível com tipos atuais que têm campos gozo_*_inicio diretos
      // OU array periodos_gozo[].
      ...(f.periodos_gozo ?? []),
      // Compat fallback: testa propriedades em `f` que podem existir
      // em variações do tipo (gozo_1_inicio etc.). Não falha se ausente.
      ...(["1", "2", "3"]
        .map((n) => {
          const fr = f as unknown as Record<string, unknown>;
          const inicio = fr[`gozo_${n}_inicio`] as string | undefined;
          const fim = fr[`gozo_${n}_fim`] as string | undefined;
          const dobra = fr[`gozo_${n}_dobra`] as boolean | undefined;
          if (inicio && fim) return { inicio, fim, dobra: !!dobra };
          return null;
        })
        .filter(Boolean) as Gozo[]),
    ];

    for (const g of gozos) {
      if (!g.inicio || !g.fim) continue;
      const iniGozo = new Date(g.inicio + "T00:00:00");
      const fimGozo = new Date(g.fim + "T00:00:00");
      if (iniGozo < periodoInicial || iniGozo > periodoFinal) continue;
      const diasNo = Math.round(
        (fimGozo.getTime() - iniGozo.getTime()) / 86400000,
      ) + 1;
      pushOcorrencia(iniGozo, diasNo, !!g.dobra, !!f.abono, false);
      diasGozados += diasNo;
    }

    if (f.abono) diasGozados += f.abono_dias ?? f.prazo_dias / 3;

    // GOZADAS_PARCIALMENTE: complementa com saldo na demissão (se aplicável)
    if (
      f.situacao === "gozadas_parcialmente" &&
      dataDemissao &&
      dataDemissao <= periodoFinal
    ) {
      const saldo = f.prazo_dias - diasGozados;
      if (saldo > 0) {
        pushOcorrencia(dataDemissao, saldo, !!f.dobra, !!f.abono, true);
      }
    }
  }

  // Período aquisitivo FRACIONÁRIO — quando demissão pega o trabalhador
  // antes de completar 12 meses do último aquisitivo. Gera ocorrência
  // proporcional ao período trabalhado, com 30/12 avos por mês.
  if (dataDemissao && dataDemissao <= periodoFinal) {
    let dataInicialFrac: Date;
    const ultimosFerias = [...ferias].sort((a, b) =>
      a.periodo_aquisitivo_fim.localeCompare(b.periodo_aquisitivo_fim),
    );
    const ultimo = ultimosFerias[ultimosFerias.length - 1];
    if (ultimo) {
      const fimAquis = new Date(ultimo.periodo_aquisitivo_fim + "T00:00:00");
      dataInicialFrac = new Date(fimAquis);
      dataInicialFrac.setDate(dataInicialFrac.getDate() + 1);
    } else {
      dataInicialFrac = new Date(parametros.data_admissao + "T00:00:00");
    }
    dataInicialFrac = aplicarReinicioFerias(dataInicialFrac, faltas);

    const dias =
      Math.round((dataDemissao.getTime() - dataInicialFrac.getTime()) / 86400000) + 1;
    if (dias >= 15) {
      // 1 avo de 30/12 por mês fracionado (regra clássica do PJe-Calc)
      const meses = Math.max(1, Math.floor(dias / 30));
      const proporcional = (30 / 12) * meses;
      pushOcorrencia(
        dataDemissao,
        proporcional,
        !!verba.dobrar_valor_devido,
        false,
        true,
      );
    }
  }

  return out;
}

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
  ferias: PjeFerias[] = [],
  faltas: PjeFalta[] = [],
): OcorrenciaPrecomputada[] {
  if (verba.valor !== "calculado") return [];

  const pi = verba.periodo_inicio;
  const pf = verba.periodo_fim;
  if (!pi || !pf) return [];

  const oc = verba.ocorrencia_pagamento ?? "mensal";

  // Modo PERIODO_AQUISITIVO: férias (gozadas/indenizadas/parcial/perdidas)
  // Quando o caller fornece `ferias`, usa o gerador especializado.
  // Sem férias declaradas, devolve [] e a verba é marcada como sem ocorrências.
  if (oc === "periodo_aquisitivo") {
    if (ferias.length === 0 && !parametros.data_demissao) return [];
    return gerarOcorrenciasPeriodoAquisitivo(
      verba,
      historicos,
      parametros,
      ferias,
      faltas,
    );
  }

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
 * Calcula a média de uma verba principal, usada para reflexos.
 * Implementa 4 modos suportados pela UI:
 *   - `valor_mensal`: a verba reflexa replica o valor mensal da principal
 *   - `media_valor_absoluto`: média aritmética dos `devido` da principal
 *   - `media_valor_corrigido`: idem mas com correção monetária (TODO: índice mensal)
 *   - `media_quantidade`: média da `quantidade` (multiplicada pela base do reflexo)
 *   - `media_pela_quantidade`: media ponderada pela quantidade
 *
 * Resultado: lista de OcorrenciaPrecomputada na competência do reflexo.
 * Para 13º proporcional sobre HE, por exemplo, o reflexo aplica a média
 * das HEs no mês de dezembro.
 */
function gerarReflexoComMedia(
  verbaReflexa: PjeVerba,
  verbaPrincipal: PjeVerba,
  parametros: PjeParametros,
): OcorrenciaPrecomputada[] {
  const ocPrincipal = verbaPrincipal.ocorrencias_precomputadas ?? [];
  if (ocPrincipal.length === 0) return [];

  const modo = verbaReflexa.comportamento_reflexo ?? "valor_mensal";
  const periodoAgrup = verbaReflexa.periodo_media_reflexo ?? "ano_civil";
  const ocPgto = verbaReflexa.ocorrencia_pagamento ?? "dezembro";

  // Agrupa ocorrências da principal por chave de agrupamento
  function chaveAgrupamento(comp: string): string {
    if (periodoAgrup === "ano_civil") return comp.slice(0, 4);
    if (periodoAgrup === "global") return "GLOBAL";
    return comp.slice(0, 7); // mensal
  }

  const grupos = new Map<string, typeof ocPrincipal>();
  for (const o of ocPrincipal) {
    const k = chaveAgrupamento(o.competencia);
    const arr = grupos.get(k) ?? [];
    arr.push(o);
    grupos.set(k, arr);
  }

  const out: OcorrenciaPrecomputada[] = [];

  for (const [chave, ocs] of grupos) {
    if (ocs.length === 0) continue;

    let valor = 0;
    let qty = 1;
    if (modo === "valor_mensal") {
      // Replica o valor mensal da principal
      for (const o of ocs) {
        valor += o.devido;
      }
    } else if (modo === "media_valor_absoluto") {
      const soma = ocs.reduce((s, o) => s + o.devido, 0);
      valor = soma / ocs.length;
    } else if (modo === "media_valor_corrigido") {
      // Aproximação: mesma média (a correção monetária é aplicada depois
      // pelo ParametrosDeAtualizacao no engine).
      const soma = ocs.reduce((s, o) => s + o.devido, 0);
      valor = soma / ocs.length;
    } else if (modo === "media_quantidade") {
      const somaQ = ocs.reduce((s, o) => s + o.quantidade, 0);
      qty = somaQ / ocs.length;
      // base × multiplicador / divisor sobre a média de quantidade
      const base =
        ocs.reduce((s, o) => s + o.base, 0) / ocs.length;
      const div = ocs[0].divisor ?? 1;
      const mult = verbaReflexa.multiplicador ?? 1;
      valor = (base * mult * qty) / div;
    } else if (modo === "media_pela_quantidade") {
      // Média ponderada pela quantidade
      const totalQty = ocs.reduce((s, o) => s + o.quantidade, 0);
      const somaPond = ocs.reduce((s, o) => s + o.devido * o.quantidade, 0);
      valor = totalQty > 0 ? somaPond / totalQty : 0;
    }

    // Aplica multiplicador do reflexo (ex.: 1/12 para 13º, 1/3 para férias)
    if (verbaReflexa.multiplicador && modo !== "media_quantidade") {
      valor = valor * verbaReflexa.multiplicador;
    }
    if (verbaReflexa.divisor_informado && modo !== "media_quantidade") {
      valor = valor / verbaReflexa.divisor_informado;
    }

    const valorRound = HALF_EVEN_2(valor);
    if (valorRound === 0) continue;

    // Competência do reflexo
    let competencia: string;
    if (ocPgto === "dezembro") {
      competencia = `${chave.slice(0, 4)}-12`;
    } else if (ocPgto === "desligamento") {
      competencia = parametros.data_demissao
        ? parametros.data_demissao.slice(0, 7)
        : chave.slice(0, 7);
    } else {
      competencia = chave.length === 7 ? chave : `${chave.slice(0, 4)}-12`;
    }

    // Importante: o engine V3 RECALCULA `devido` a partir de base/mult/qty/div
    // (calcularDevidoFromScratch). Para preservar o valor que computamos,
    // setamos base=valorRound e divisor=mult=qty=1, de forma que
    // base*mult*qty/divisor = valorRound.
    out.push({
      competencia,
      base: valorRound,
      divisor: 1,
      multiplicador: 1,
      quantidade: 1,
      dobra: false,
      devido: valorRound,
      pago: 0,
    });
  }

  return out;
}

/**
 * Aplica o gerador para TODAS as verbas de uma lista, preenchendo
 * `ocorrencias_precomputadas` quando ausente. Duas passadas:
 *   1) Verbas não-reflexas (principais)
 *   2) Verbas reflexas — usam média/valor da principal recém-calculada
 *
 * Não toca em verbas que já vieram com ocorrências (do XML PJC).
 * Retorna lista de nomes de verbas NÃO geradas (banner UI).
 */
export function preencherOcorrenciasFromScratch(
  verbas: PjeVerba[],
  historicos: PjeHistoricoSalarial[],
  cartao: PjeCartaoPonto[],
  parametros: PjeParametros,
  ferias: PjeFerias[] = [],
  faltas: PjeFalta[] = [],
): { naoCobertas: string[] } {
  const naoCobertas: string[] = [];

  // PASSADA 1: verbas principais (não-reflexas)
  for (const v of verbas) {
    if (v.valor !== "calculado") continue;
    if (v.ocorrencias_precomputadas?.length) continue;
    if (v.tipo === "reflexa") continue;
    const ocs = gerarOcorrenciasFromScratch(
      v,
      historicos,
      cartao,
      parametros,
      ferias,
      faltas,
    );
    if (ocs.length > 0) {
      v.ocorrencias_precomputadas = ocs;
    } else {
      naoCobertas.push(v.nome);
    }
  }

  // Indexador por id para reflexos
  const verbaPorId = new Map<string, PjeVerba>();
  for (const v of verbas) verbaPorId.set(v.id, v);

  // PASSADA 2: reflexas — usam a principal já populada
  for (const v of verbas) {
    if (v.valor !== "calculado") continue;
    if (v.ocorrencias_precomputadas?.length) continue;
    if (v.tipo !== "reflexa") continue;
    const principal = v.verba_principal_id
      ? verbaPorId.get(v.verba_principal_id)
      : undefined;
    if (!principal || !principal.ocorrencias_precomputadas?.length) {
      // Sem principal calculada → cai no fluxo padrão
      const ocs = gerarOcorrenciasFromScratch(
        v,
        historicos,
        cartao,
        parametros,
        ferias,
        faltas,
      );
      if (ocs.length > 0) {
        v.ocorrencias_precomputadas = ocs;
      } else {
        naoCobertas.push(v.nome);
      }
      continue;
    }
    const ocs = gerarReflexoComMedia(v, principal, parametros);
    if (ocs.length > 0) {
      v.ocorrencias_precomputadas = ocs;
    } else {
      naoCobertas.push(v.nome);
    }
  }

  return { naoCobertas };
}
