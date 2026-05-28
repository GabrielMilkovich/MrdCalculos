import type { CtpsAfastamento } from '../../../tipos-dominio.ts';

/**
 * AFASTAMENTOS e AFASTAMENTOS_OUTROS compartilham o mesmo layout:
 *   Data Afastamento | Situação do Afastamento | Retorno (opcional)
 *
 * Forma observada (extrairGeometrico):
 *   24/04/2020 Suspensão Contrato de Trabalho 24/05/2020   (com retorno)
 *   09/03/2021 Demissão                                    (sem retorno)
 *
 * Regex única — `.+?` lazy + retorno OPCIONAL no final. Linhas sem match
 * (separadores, headers, lixo de rodapé) são ignoradas.
 *
 * `tipo` controla as regras de derivação de `categoria`:
 *   - "principal" (AFASTAMENTOS): Demissão → desligamento; Suspensão/etc → afastamento
 *   - "outros" (AFASTAMENTOS_OUTROS): Atestado → atestado_medico;
 *      Auxilio Doença → auxilio_doenca; outros → outros
 */
const RE_LINHA =
  /^\s*(\d{2}\/\d{2}\/\d{4})\s+(.+?)(?:\s+(\d{2}\/\d{2}\/\d{4}))?\s*$/;

export function parseAfastamentos(
  linhas: string[],
  tipo: 'principal' | 'outros',
): CtpsAfastamento[] {
  const resultado: CtpsAfastamento[] = [];
  for (const linha of linhas) {
    const m = linha.match(RE_LINHA);
    if (!m) continue;
    const situacao = m[2].trim();
    if (!situacao) continue;
    resultado.push({
      data_inicio: m[1],
      situacao,
      retorno: m[3] ?? null,
      categoria: derivarCategoria(situacao, tipo),
    });
  }
  return resultado;
}

function derivarCategoria(
  situacao: string,
  tipo: 'principal' | 'outros',
): CtpsAfastamento['categoria'] {
  if (tipo === 'principal') {
    if (/demiss/i.test(situacao)) return 'desligamento';
    return 'afastamento';
  }
  if (/atestado/i.test(situacao)) return 'atestado_medico';
  if (/aux[íi]lio\s+doen/i.test(situacao)) return 'auxilio_doenca';
  return 'outros';
}
