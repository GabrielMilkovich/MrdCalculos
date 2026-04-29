/**
 * Auto-Fill Authority Map — hierarquia de autoridade documental.
 *
 * Quando dois documentos extraem o MESMO campo com valores diferentes,
 * este mapa decide qual ganha (peso por tipo de documento × tipo de campo).
 *
 * Exemplo: data_admissao
 *   - CTPS:    score 100 (registro oficial)
 *   - TRCT:    score 90 (registro de rescisao, alta confianca)
 *   - sentenca: score 95 (decisao judicial, mas CTPS prevalece)
 *   - holerite: score 60 (nao costuma trazer admissao)
 *   - contrato: score 85
 *   - peticao:  score 30 (alegacao da parte, baixa autoridade)
 *
 * Para cada campo, o documento com MAIOR score ganha. Empate: o com
 * confianca_geral maior ganha. Empate ainda: o mais recente.
 *
 * Uso:
 *   import { resolveCampo } from './document-authority';
 *   const winner = resolveCampo('data_admissao', candidatos);
 *   // candidatos = [{ doc_tipo: 'CTPS', valor: '2018-03-15', confianca: 0.92, ... }]
 */

import Decimal from 'decimal.js';

export type DocumentoTipo =
  | 'CTPS'
  | 'TRCT'
  | 'CONTRATO_TRABALHO'
  | 'HOLERITE'
  | 'FICHA_FINANCEIRA'
  | 'CARTAO_PONTO'
  | 'SENTENCA'
  | 'ACORDAO'
  | 'PETICAO_INICIAL'
  | 'CONTESTACAO'
  | 'TERMO_AUDIENCIA'
  | 'RECIBO_FERIAS'
  | 'GUIA_FGTS'
  | 'EXTRATO_FGTS'
  | 'RECIBO_PAGAMENTO'
  | 'OUTRO';

export type CampoAutoFill =
  | 'data_admissao'
  | 'data_demissao'
  | 'data_ajuizamento'
  | 'numero_processo'
  | 'tribunal'
  | 'vara'
  | 'reclamante_nome'
  | 'reclamante_cpf'
  | 'reclamada_nome'
  | 'reclamada_cnpj'
  | 'cargo_funcao'
  | 'salario_base'
  | 'salario_competencia'
  | 'tipo_demissao'
  | 'jornada'
  | 'aviso_previo'
  | 'fgts_saldo'
  | 'fgts_multa_40'
  | 'ferias_periodos'
  | 'cartao_ponto_diario'
  | 'rubrica_mensal'
  | 'verba_rescisoria';

/**
 * Matriz de autoridade [campo][tipo] → score 0-100.
 * Score 0 = nao confiavel para esse campo. 100 = autoridade maxima.
 */
export const AUTHORITY_MATRIX: Record<CampoAutoFill, Partial<Record<DocumentoTipo, number>>> = {
  data_admissao: {
    CTPS: 100,
    TRCT: 90,
    CONTRATO_TRABALHO: 95,
    HOLERITE: 60,
    SENTENCA: 95,
    ACORDAO: 95,
    PETICAO_INICIAL: 30,
    CONTESTACAO: 30,
    TERMO_AUDIENCIA: 70,
  },
  data_demissao: {
    CTPS: 95,
    TRCT: 100, // TRCT eh o documento oficial de rescisao
    HOLERITE: 70, // ultimo holerite costuma ter saida
    SENTENCA: 90,
    PETICAO_INICIAL: 40,
    CONTESTACAO: 40,
    TERMO_AUDIENCIA: 70,
  },
  data_ajuizamento: {
    PETICAO_INICIAL: 100,
    SENTENCA: 90,
    ACORDAO: 90,
    TERMO_AUDIENCIA: 80,
  },
  numero_processo: {
    PETICAO_INICIAL: 100,
    SENTENCA: 100,
    ACORDAO: 100,
    TERMO_AUDIENCIA: 100,
  },
  tribunal: {
    PETICAO_INICIAL: 95,
    SENTENCA: 100,
    ACORDAO: 100,
    TERMO_AUDIENCIA: 100,
  },
  vara: {
    PETICAO_INICIAL: 95,
    SENTENCA: 100,
    ACORDAO: 100,
    TERMO_AUDIENCIA: 100,
  },
  reclamante_nome: {
    CTPS: 100,
    TRCT: 90,
    CONTRATO_TRABALHO: 95,
    HOLERITE: 80,
    PETICAO_INICIAL: 90,
    SENTENCA: 90,
  },
  reclamante_cpf: {
    CTPS: 100,
    TRCT: 95,
    HOLERITE: 90,
    PETICAO_INICIAL: 85,
  },
  reclamada_nome: {
    CTPS: 95,
    TRCT: 100,
    HOLERITE: 95,
    CONTRATO_TRABALHO: 100,
    PETICAO_INICIAL: 80,
    SENTENCA: 90,
  },
  reclamada_cnpj: {
    CTPS: 95,
    TRCT: 100,
    HOLERITE: 100,
    CONTRATO_TRABALHO: 100,
    GUIA_FGTS: 100,
  },
  cargo_funcao: {
    CTPS: 100,
    TRCT: 80,
    CONTRATO_TRABALHO: 95,
    HOLERITE: 70,
    PETICAO_INICIAL: 50,
  },
  salario_base: {
    CTPS: 90, // CTPS tem ultimo salario registrado
    TRCT: 100,
    CONTRATO_TRABALHO: 95, // salario inicial
    HOLERITE: 90,
    FICHA_FINANCEIRA: 95,
    PETICAO_INICIAL: 40,
  },
  salario_competencia: {
    HOLERITE: 100,
    FICHA_FINANCEIRA: 100,
    TRCT: 60,
    PETICAO_INICIAL: 30,
  },
  tipo_demissao: {
    TRCT: 100, // TRCT tem campo SCFLDISP especifico
    CTPS: 70, // CTPS so dispensa registrada
    SENTENCA: 95, // se ja houve sentenca
    PETICAO_INICIAL: 50,
    CONTESTACAO: 60,
  },
  jornada: {
    CONTRATO_TRABALHO: 100,
    CTPS: 80,
    HOLERITE: 70,
    CARTAO_PONTO: 60, // jornada efetiva, nao contratual
    PETICAO_INICIAL: 40,
  },
  aviso_previo: {
    TRCT: 100,
    CTPS: 70,
    PETICAO_INICIAL: 50,
  },
  fgts_saldo: {
    EXTRATO_FGTS: 100,
    GUIA_FGTS: 95,
    TRCT: 80,
  },
  fgts_multa_40: {
    TRCT: 100,
    EXTRATO_FGTS: 80,
  },
  ferias_periodos: {
    RECIBO_FERIAS: 100,
    CTPS: 90,
    HOLERITE: 60,
    FICHA_FINANCEIRA: 80,
  },
  cartao_ponto_diario: {
    CARTAO_PONTO: 100,
  },
  rubrica_mensal: {
    HOLERITE: 100,
    FICHA_FINANCEIRA: 100,
    RECIBO_PAGAMENTO: 90,
  },
  verba_rescisoria: {
    TRCT: 100,
    SENTENCA: 95,
    PETICAO_INICIAL: 30,
  },
};

/** Candidato extraido de um documento, com metadados para resolucao. */
export interface CandidatoCampo<T = unknown> {
  doc_tipo: DocumentoTipo;
  document_id: string;
  valor: T;
  /** Confianca da extracao 0-1. */
  confianca: number;
  /** Data/hora da extracao (mais recente desempata). */
  extraido_em: Date;
  /** Pagina ou trecho de origem (para rastreabilidade). */
  evidencia?: string;
}

export interface ResolutionResult<T = unknown> {
  vencedor: CandidatoCampo<T>;
  motivo: 'authority' | 'confidence' | 'recency' | 'unico';
  perdedores: CandidatoCampo<T>[];
  /** Score final do vencedor (authority × confianca). */
  score_final: number;
}

/**
 * Resolve qual valor ganha quando varios documentos extraem o mesmo campo.
 *
 * Algoritmo:
 *   1. Filtra candidatos sem score authority > 0 para o campo (descarta
 *      tipos nao autorizativos, ex: holerite para data_admissao).
 *   2. Para cada candidato: score_final = authority × confianca.
 *   3. Vencedor = maior score_final.
 *   4. Empate: maior confianca; depois mais recente.
 */
export function resolveCampo<T = unknown>(
  campo: CampoAutoFill,
  candidatos: CandidatoCampo<T>[],
): ResolutionResult<T> | null {
  if (candidatos.length === 0) return null;
  if (candidatos.length === 1) {
    const authority = AUTHORITY_MATRIX[campo][candidatos[0].doc_tipo];
    if (authority === undefined || authority === 0) return null;
    return {
      vencedor: candidatos[0],
      motivo: 'unico',
      perdedores: [],
      score_final: authority * candidatos[0].confianca,
    };
  }

  const scored = candidatos
    .map(c => ({
      candidato: c,
      authority: AUTHORITY_MATRIX[campo][c.doc_tipo] ?? 0,
      score_final: (AUTHORITY_MATRIX[campo][c.doc_tipo] ?? 0) * c.confianca,
    }))
    .filter(s => s.authority > 0)
    .sort((a, b) => {
      if (b.score_final !== a.score_final) return b.score_final - a.score_final;
      if (b.candidato.confianca !== a.candidato.confianca) {
        return b.candidato.confianca - a.candidato.confianca;
      }
      return b.candidato.extraido_em.getTime() - a.candidato.extraido_em.getTime();
    });

  if (scored.length === 0) return null;

  const vencedor = scored[0];
  const motivo: ResolutionResult<T>['motivo'] =
    scored.length === 1 ? 'unico'
    : vencedor.authority > (scored[1].authority ?? 0) ? 'authority'
    : vencedor.candidato.confianca > scored[1].candidato.confianca ? 'confidence'
    : 'recency';

  return {
    vencedor: vencedor.candidato,
    motivo,
    perdedores: scored.slice(1).map(s => s.candidato),
    score_final: vencedor.score_final,
  };
}

/**
 * Helper: detecta divergencia entre candidatos. Retorna true se ha 2+ valores
 * distintos com authority > 0. Usado para sinalizar "conflito" na UI.
 */
export function temConflito<T = unknown>(
  campo: CampoAutoFill,
  candidatos: CandidatoCampo<T>[],
  tolerancia: { tipo: 'string' | 'numero' | 'data'; eps?: number } = { tipo: 'string' },
): boolean {
  const validos = candidatos.filter(c => (AUTHORITY_MATRIX[campo][c.doc_tipo] ?? 0) > 0);
  if (validos.length < 2) return false;

  const valores = new Set<string>();
  for (const c of validos) {
    if (tolerancia.tipo === 'data') {
      const raw = String(c.valor ?? '');
      // Normaliza: extrai os 8 digitos e ordena para YYYYMMDD.
      const digitos = raw.replace(/[^\d]/g, '');
      let canonico = digitos;
      if (digitos.length === 8) {
        // Detecta se eh YYYYMMDD ou DDMMYYYY pelo primeiro grupo > 1900.
        const possivelAno = digitos.slice(0, 4);
        const ano = parseInt(possivelAno, 10);
        if (ano >= 1900 && ano <= 2100) {
          canonico = digitos; // YYYYMMDD
        } else {
          // DDMMYYYY → YYYYMMDD
          canonico = digitos.slice(4, 8) + digitos.slice(2, 4) + digitos.slice(0, 2);
        }
      }
      valores.add(canonico);
    } else if (tolerancia.tipo === 'numero') {
      const n = Number(c.valor);
      // Bucket de 1% para tolerancia monetaria
      valores.add((Math.round(n * 100) / 100).toFixed(2));
    } else {
      const s = String(c.valor).trim().toLowerCase();
      valores.add(s);
    }
  }
  return valores.size > 1;
}

/**
 * Helper: ordena candidatos por authority decrescente para um campo.
 * Util para UI "sugestao primaria" + "alternativas".
 */
export function ordenarPorAuthority<T = unknown>(
  campo: CampoAutoFill,
  candidatos: CandidatoCampo<T>[],
): CandidatoCampo<T>[] {
  return [...candidatos].sort((a, b) => {
    const sa = (AUTHORITY_MATRIX[campo][a.doc_tipo] ?? 0) * a.confianca;
    const sb = (AUTHORITY_MATRIX[campo][b.doc_tipo] ?? 0) * b.confianca;
    return sb - sa;
  });
}

/** Helper: nome legivel do tipo de documento (para UI). */
export function nomeDocumento(tipo: DocumentoTipo): string {
  const nomes: Record<DocumentoTipo, string> = {
    CTPS: 'Carteira de Trabalho (CTPS)',
    TRCT: 'Termo de Rescisão (TRCT)',
    CONTRATO_TRABALHO: 'Contrato de Trabalho',
    HOLERITE: 'Holerite',
    FICHA_FINANCEIRA: 'Ficha Financeira',
    CARTAO_PONTO: 'Cartão de Ponto',
    SENTENCA: 'Sentença',
    ACORDAO: 'Acórdão',
    PETICAO_INICIAL: 'Petição Inicial',
    CONTESTACAO: 'Contestação',
    TERMO_AUDIENCIA: 'Termo de Audiência',
    RECIBO_FERIAS: 'Recibo de Férias',
    GUIA_FGTS: 'Guia FGTS',
    EXTRATO_FGTS: 'Extrato FGTS',
    RECIBO_PAGAMENTO: 'Recibo de Pagamento',
    OUTRO: 'Outro',
  };
  return nomes[tipo];
}

/** Helper: aplica tolerancia monetaria de 1% para evitar conflitos por arredondamento. */
export function valoresMonetariosIguais(a: Decimal | number | string, b: Decimal | number | string): boolean {
  const da = a instanceof Decimal ? a : new Decimal(a);
  const db = b instanceof Decimal ? b : new Decimal(b);
  if (da.isZero() && db.isZero()) return true;
  if (da.isZero() || db.isZero()) return false;
  const diff = da.minus(db).abs().div(da.abs().gt(db.abs()) ? da.abs() : db.abs());
  return diff.lt(0.01);
}
