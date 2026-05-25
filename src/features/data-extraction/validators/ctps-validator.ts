import type { FeriasParseada } from '../parsers/ferias';
import type { FaltaParseada } from '../parsers/faltas';

export interface CtpsViolacao {
  severidade: 'critica' | 'alta' | 'media' | 'baixa';
  regra: string;
  descricao: string;
  contexto: {
    ferias_idx?: number;
    falta_idx?: number;
    data_problema?: string;
  };
}

export interface CtpsValidacaoResult {
  ok: boolean;
  violacoes: CtpsViolacao[];
  resumo: {
    total_ferias: number;
    total_faltas: number;
    violacoes_criticas: number;
    violacoes_altas: number;
  };
}

interface GozoRange {
  inicio: string;
  fim: string;
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00Z');
  return isNaN(d.getTime()) ? null : d;
}

function rangesSobrepoe(a: GozoRange, b: GozoRange): boolean {
  const a1 = parseDate(a.inicio);
  const a2 = parseDate(a.fim);
  const b1 = parseDate(b.inicio);
  const b2 = parseDate(b.fim);
  if (!a1 || !a2 || !b1 || !b2) return false;
  return a1 <= b2 && b1 <= a2;
}

function extrairGozos(f: FeriasParseada): GozoRange[] {
  const gozos: GozoRange[] = [];
  if (f.gozos) {
    for (const g of f.gozos) {
      if (g.inicio && g.fim) gozos.push({ inicio: g.inicio, fim: g.fim });
    }
  }
  return gozos;
}

export function validarCtps(
  ferias: FeriasParseada[],
  faltas: FaltaParseada[],
  contrato?: { data_admissao?: string; data_demissao?: string },
): CtpsValidacaoResult {
  const violacoes: CtpsViolacao[] = [];

  const todosGozos = ferias.flatMap((f, i) =>
    extrairGozos(f).map((g) => ({ ferias_idx: i, gozo: g })),
  );

  for (let i = 0; i < todosGozos.length; i++) {
    for (let j = i + 1; j < todosGozos.length; j++) {
      if (rangesSobrepoe(todosGozos[i].gozo, todosGozos[j].gozo)) {
        violacoes.push({
          severidade: 'alta',
          regra: 'gozos_sobrepostos',
          descricao: `Gozos sobrepostos: ${todosGozos[i].gozo.inicio}–${todosGozos[i].gozo.fim} e ${todosGozos[j].gozo.inicio}–${todosGozos[j].gozo.fim}`,
          contexto: { ferias_idx: todosGozos[i].ferias_idx },
        });
      }
    }
  }

  if (contrato?.data_admissao) {
    const admissao = parseDate(contrato.data_admissao);
    if (admissao) {
      for (const { ferias_idx, gozo } of todosGozos) {
        const gozoInicio = parseDate(gozo.inicio);
        if (gozoInicio && gozoInicio < admissao) {
          violacoes.push({
            severidade: 'critica',
            regra: 'gozo_antes_admissao',
            descricao: `Gozo ${gozo.inicio} antes da admissão ${contrato.data_admissao}`,
            contexto: { ferias_idx, data_problema: gozo.inicio },
          });
        }
      }
    }
  }

  for (let i = 0; i < faltas.length; i++) {
    const f = faltas[i];
    if (f.reiniciar_periodo_aquisitivo && f.duracao_dias <= 32) {
      violacoes.push({
        severidade: 'alta',
        regra: 'reinicia_aquisitivo_invalido',
        descricao: `Falta de ${f.duracao_dias} dia(s) não reinicia período aquisitivo (art. 130 CLT requer >32 dias)`,
        contexto: { falta_idx: i },
      });
    }
  }

  for (let i = 0; i < faltas.length; i++) {
    for (let j = i + 1; j < faltas.length; j++) {
      if (
        rangesSobrepoe(
          { inicio: faltas[i].data_inicio, fim: faltas[i].data_fim },
          { inicio: faltas[j].data_inicio, fim: faltas[j].data_fim },
        )
      ) {
        violacoes.push({
          severidade: 'media',
          regra: 'faltas_sobrepostas',
          descricao: `Faltas sobrepostas: ${faltas[i].data_inicio} e ${faltas[j].data_inicio}`,
          contexto: { falta_idx: i },
        });
      }
    }
  }

  return {
    ok: violacoes.filter((v) => v.severidade === 'critica' || v.severidade === 'alta').length === 0,
    violacoes,
    resumo: {
      total_ferias: ferias.length,
      total_faltas: faltas.length,
      violacoes_criticas: violacoes.filter((v) => v.severidade === 'critica').length,
      violacoes_altas: violacoes.filter((v) => v.severidade === 'alta').length,
    },
  };
}
