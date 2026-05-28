import type { CtpsDadosEmpregado } from '../../../tipos-dominio.ts';
import { extrairCamposKVConhecidos } from '../helpers.ts';

/**
 * DADOS DE EMPREGADO tem 2 blocos separados por linha em branco:
 *   Bloco 1 (admissão): Matrícula, Admissão, Vínculo, Registro MTE, FGTS,
 *                       Observações (FGTS) — possivelmente multi-linha.
 *   Bloco 2 (desligamento): Banco Pagto, Afastamento, Data Desligamento,
 *                           Observações (desligamento).
 *
 * "Observações" aparece DUAS vezes — a primeira ocorrência é FGTS, a segunda
 * é desligamento. Splitamos no marcador "Banco Pagto" (início do bloco 2).
 *
 * Linhas que não têm `:` (sem novos pares chave-valor) são continuação da
 * observação anterior.
 */

const CHAVES_BLOCO1 = [
  'Matrícula',
  'Admissão',
  'Vínculo',
  'Registro no MTE',
  'Data Opção FGTS',
  'Banco FGTS',
  'Agência FGTS',
  'Conta FGTS',
  'Observações',
];

const CHAVES_BLOCO2 = [
  'Banco Pagto',
  'Agência Pagto',
  'Conta Pagto',
  'Afastamento',
  // "Data Desligamento com Projeção Aviso Prévio" PRIMEIRO (mais longa) pra
  // ganhar do prefixo "Data Desligamento" via sort por length desc.
  'Data Desligamento com Projeção Aviso Prévio',
  'Data Desligamento',
  'Observações',
];

export function parseDadosEmpregado(linhas: string[]): CtpsDadosEmpregado | null {
  if (linhas.length === 0) return null;

  // Acha o índice da linha "Banco Pagto..."
  let idxBloco2 = linhas.length;
  for (let i = 0; i < linhas.length; i++) {
    if (/Banco\s+Pagto/i.test(linhas[i])) {
      idxBloco2 = i;
      break;
    }
  }

  const bloco1 = linhas.slice(0, idxBloco2);
  const bloco2 = linhas.slice(idxBloco2);

  const parseBloco = (
    linhasBloco: string[],
    chavesConhecidas: readonly string[],
  ): { campos: Map<string, string>; observacoes: string | null } => {
    const campos = new Map<string, string>();
    let obsParts: string[] = [];
    let coletando = false;

    for (const linha of linhasBloco) {
      const pares = extrairCamposKVConhecidos(linha, chavesConhecidas);

      if (pares.size > 0) {
        // Linha de campo real (potencialmente abrindo nova observação).
        if (coletando && !pares.has('observacoes')) coletando = false;
        for (const [k, v] of pares) {
          if (k === 'observacoes') {
            obsParts = [v];
            coletando = true;
          } else if (!campos.has(k)) {
            campos.set(k, v);
          }
        }
      } else if (coletando && linha.trim()) {
        // Continuação da observação (mesmo com colons em "Empresa:" / "Data:").
        obsParts.push(linha.trim());
      }
    }

    return { campos, observacoes: obsParts.join(' ').trim() || null };
  };

  const r1 = parseBloco(bloco1, CHAVES_BLOCO1);
  const c1 = r1.campos;
  const observacoesFgts = r1.observacoes;

  const r2 = parseBloco(bloco2, CHAVES_BLOCO2);
  const c2 = r2.campos;
  const observacoesDesligamento = r2.observacoes;

  // Dias de aviso prévio: regex /(\d+)\s+dias/ em observacoes_desligamento.
  let diasAvisoPrevio: number | null = null;
  if (observacoesDesligamento) {
    const m = observacoesDesligamento.match(/(\d+)\s+dias/i);
    if (m) diasAvisoPrevio = parseInt(m[1], 10);
  }

  if (!c1.has('matricula') && !c1.has('admissao')) return null;

  return {
    matricula: c1.get('matricula') ?? '',
    admissao: c1.get('admissao') ?? '',
    vinculo: c1.get('vinculo') ?? '',
    registro_mte: c1.get('registro_no_mte') || c1.get('registro_mte') || null,
    data_opcao_fgts: c1.get('data_opcao_fgts') || null,
    banco_fgts: c1.get('banco_fgts') || null,
    agencia_fgts: c1.get('agencia_fgts') || null,
    conta_fgts: c1.get('conta_fgts') || null,
    observacoes_fgts: observacoesFgts,
    banco_pagamento: c2.get('banco_pagto') || null,
    agencia_pagamento: c2.get('agencia_pagto') || null,
    conta_pagamento: c2.get('conta_pagto') || null,
    tipo_afastamento: c2.get('afastamento') || null,
    data_desligamento: c2.get('data_desligamento') || null,
    data_desligamento_com_projecao_aviso:
      c2.get('data_desligamento_com_projecao_aviso_previo') || null,
    observacoes_desligamento: observacoesDesligamento,
    dias_aviso_previo: diasAvisoPrevio,
  };
}
