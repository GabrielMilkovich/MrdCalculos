import type { CtpsDominioV2 } from '../../tipos-dominio.ts';
import { seccionar } from './seccionar.ts';

/**
 * Detecta resultado de parsing degradado (OCR ruim, texto não-geometrizado).
 *
 * Regra: seção foi DETECTADA no texto (header presente) mas o parser
 * tirou ZERO linhas. Forte sinal de OCR degradado vs parser legítimo
 * encontrando seção vazia.
 *
 * Também valida campos sempre-presentes em CTPS válido (nome, cpf,
 * matricula, admissao). Se vierem vazios, parser furou.
 *
 * Não usa "toda seção tabular tem >= 1 entry" (over-restrictive) — alguns
 * docs legitimamente têm 0 dependentes, 0 funcoes, etc.
 */
export function pareceDegradado(texto: string, ctps: CtpsDominioV2): boolean {
  const secoes = seccionar(texto);

  if (secoes.has('HISTORICO_FERIAS') && ctps.historico_ferias.length === 0) return true;
  if (secoes.has('FUNCOES_EXERCIDAS') && ctps.funcoes_exercidas.length === 0) return true;
  if (secoes.has('HISTORICO_LOTACAO') && ctps.historico_lotacao.length === 0) return true;
  if (secoes.has('HISTORICO_SALARIAL') && ctps.historico_salarial.length === 0) return true;

  if (!ctps.dados_pessoais.nome || !ctps.dados_pessoais.cpf) return true;
  if (!ctps.dados_empregado.matricula || !ctps.dados_empregado.admissao) return true;

  return false;
}
