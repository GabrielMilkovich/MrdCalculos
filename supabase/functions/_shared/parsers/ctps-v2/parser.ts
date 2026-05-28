import type { CtpsDominioV2 } from '../../tipos-dominio.ts';
import { detectarEmissor, isFichaAnotacoes } from './detectar.ts';
import { seccionar } from './seccionar.ts';
import { parseLocalTrabalho } from './secoes/parse-local-trabalho.ts';
import { parseDadosPessoais } from './secoes/parse-dados-pessoais.ts';
import { parseEnderecoResidencial } from './secoes/parse-endereco-residencial.ts';
import { parseDependentes } from './secoes/parse-dependentes.ts';
import { parseDadosEmpregado } from './secoes/parse-dados-empregado.ts';
import { parseFuncaoAtual } from './secoes/parse-funcao-atual.ts';
import { parseInformacoesSindicais } from './secoes/parse-informacoes-sindicais.ts';
import { parseHistoricoSalarial } from './secoes/parse-historico-salarial.ts';
import { parseFuncoesExercidas } from './secoes/parse-funcoes-exercidas.ts';
import { parseHistoricoLotacao } from './secoes/parse-historico-lotacao.ts';
import { parseAfastamentos } from './secoes/parse-afastamentos.ts';
import { parseHistoricoFerias } from './secoes/parse-historico-ferias.ts';

const PARSER_VERSION = 'ctps-ficha-anotacoes-v2-2026-05-28';

/**
 * Parser CTPS V2 — Ficha de Anotações.
 *
 * Recebe texto layout-preservado (saída de `extrairGeometrico` em edge
 * function ou de `extrair-texto.ts` em vitest/Node). Devolve estrutura
 * completa V2 ou null se não for Ficha de Anotações.
 *
 * Seções essenciais (LOCAL_TRABALHO, DADOS_PESSOAIS, ENDERECO_RESIDENCIAL,
 * DADOS_EMPREGADO, FUNCAO_ATUAL) precisam estar presentes — sem isso,
 * devolve null pra forçar fallback OCR/Claude vision.
 */
export function parseFichaAnotacoes(texto: string): CtpsDominioV2 | null {
  if (!isFichaAnotacoes(texto)) return null;
  const emissor = detectarEmissor(texto);
  if (!emissor || (emissor !== 'ADP-Web' && emissor !== 'SAP')) return null;

  const secoes = seccionar(texto);

  const local_trabalho = parseLocalTrabalho(secoes.get('LOCAL_TRABALHO') ?? []);
  const dados_pessoais = parseDadosPessoais(secoes.get('DADOS_PESSOAIS') ?? []);
  const endereco_residencial = parseEnderecoResidencial(
    secoes.get('ENDERECO_RESIDENCIAL') ?? [],
  );
  const dependentes = parseDependentes(secoes.get('DEPENDENTES') ?? []);
  const dados_empregado = parseDadosEmpregado(secoes.get('DADOS_EMPREGADO') ?? []);
  const funcao_atual = parseFuncaoAtual(secoes.get('FUNCAO_ATUAL') ?? []);
  const informacoes_sindicais = parseInformacoesSindicais(
    secoes.get('INFORMACOES_SINDICAIS') ?? [],
  );
  const historico_salarial = parseHistoricoSalarial(
    secoes.get('HISTORICO_SALARIAL') ?? [],
  );
  const funcoes_exercidas = parseFuncoesExercidas(
    secoes.get('FUNCOES_EXERCIDAS') ?? [],
  );
  const historico_lotacao = parseHistoricoLotacao(
    secoes.get('HISTORICO_LOTACAO') ?? [],
  );
  const afastamentos = parseAfastamentos(
    secoes.get('AFASTAMENTOS') ?? [],
    'principal',
  );
  const afastamentos_outros = parseAfastamentos(
    secoes.get('AFASTAMENTOS_OUTROS') ?? [],
    'outros',
  );
  const historico_ferias = parseHistoricoFerias(secoes.get('HISTORICO_FERIAS') ?? []);

  // Seções essenciais — sem elas, parser falha e força fallback.
  if (
    !local_trabalho ||
    !dados_pessoais ||
    !endereco_residencial ||
    !dados_empregado ||
    !funcao_atual
  ) {
    return null;
  }

  return {
    local_trabalho,
    dados_pessoais,
    endereco_residencial,
    dependentes,
    dados_empregado,
    funcao_atual,
    informacoes_sindicais,
    historico_salarial,
    funcoes_exercidas,
    historico_lotacao,
    afastamentos,
    afastamentos_outros,
    historico_ferias,
    _meta: {
      parser: PARSER_VERSION,
      source_emitter: emissor as 'ADP-Web' | 'SAP',
      extraction_method: 'pdfjs_geometric',
      extracted_at: new Date().toISOString(),
      confidence: 1.0,
    },
  };
}
