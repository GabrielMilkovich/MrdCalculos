import { parseHistoricoFerias } from '../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-historico-ferias';
import { parseAfastamentos } from '../../../../../supabase/functions/_shared/parsers/ctps-v2/secoes/parse-afastamentos';
import { adaptarFerias } from './adapters/to-ferias-parseada';
import { adaptarFaltas } from './adapters/to-falta-parseada';
import type { CtpsDominioV2 } from '@/domain/tipos-dominio';
import type { ParseFeriasResult } from '../ferias';
import type { ParseFaltasResult } from '../faltas';

function normalizarMistral(texto: string): string[] {
  return texto.split('\n').map(l =>
    l.replace(/\|/g, ' ')
     .replace(/^#+\s*/, '')
     .replace(/\s+/g, ' ')
     .trim()
  );
}

// Recorta linhas entre uma âncora de início e a primeira de várias âncoras de fim.
// Se nenhuma das âncoras de fim for encontrada, vai até EOF — parseAfastamentos
// e parseHistoricoFerias filtram lixo por regex de data, então sobre-captura é segura.
function recortar(
  linhas: string[],
  reIni: RegExp,
  reFins: RegExp[],
): string[] {
  const i = linhas.findIndex(l => reIni.test(l));
  if (i < 0) return [];
  let j = linhas.slice(i + 1).findIndex(l => reFins.some(re => re.test(l)));
  j = j < 0 ? linhas.length : i + 1 + j;
  return linhas.slice(i + 1, j);
}

// Âncoras validadas contra 5 CTPS reais em produção (Roque/Joseli×2/Izabela/Idadela):
//
// FÉRIAS:
//   "HISTÓRICO DE FÉRIAS"  → Roque, Izabela
//   "HISTÓRICO DE PERIAS"  → Joseli (OCR F→P)
//   [FP][EÉ] cobre as duas; \b em vez de $ tolera `:` ou ruído de cauda.
//
// AFASTAMENTOS PRINCIPAL (suspensão, demissão, rescisão):
//   "AFASTAMENTOS" sozinho → todos os 4 docs ADP com seção principal.
//   \s*$ exige nada (ou só espaço) após — distingue de OUTROS.
//
// AFASTAMENTOS OUTROS (atestados, auxílios, licenças):
//   "AFASTAMENTOS OUTROS" → Joseli, Izabela
//   "AFASTAMENTOS OUTRAS" → Idadela
//   "AFASTAMENTOS USTAIS" → Roque (OCR O→U+S)
//   \s+\S exige pelo menos uma palavra após — distingue de PRINCIPAL.
const RE_FERIAS_HEADER = /^HIST[ÓO]RICO\s+DE\s+[FP][EÉ]RIAS\b/i;
const RE_AFASTAMENTOS_PRINCIPAL = /^AFASTAMENTOS\s*$/i;
const RE_AFASTAMENTOS_OUTROS = /^AFASTAMENTOS\s+\S/i;

// Fim de seção: rodapé universal das fichas ADP — "Data:.../.../..." ou "Portarias MTE/MTB".
const RE_FIM_FERIAS: RegExp[] = [
  /^Data:\s*\.\.\.\s*\//i,
  /^Portarias?\s+MT[BE]/i,
];

/**
 * Extrai férias e faltas de texto Mistral OCR (CTPS ADP-Web/SAP).
 *
 * O Mistral formata tabelas com `|` como separador de colunas — o
 * normalizarMistral troca `|` por espaço, deixando o texto no mesmo
 * formato que os parsers de Fase B (`parseHistoricoFerias`/
 * `parseAfastamentos`) já esperam do caminho geométrico V6.
 *
 * Separa AFASTAMENTOS (principal) de AFASTAMENTOS OUTROS para que
 * suspensões/demissões sejam categorizadas como `afastamento`/
 * `desligamento` e atestados/auxílios como `atestado_medico`/
 * `auxilio_doenca`. Sem isso, suspensões viravam `outros`.
 */
export function extrairFeriasFaltasMistral(ocrText: string): {
  feriasParsed: ParseFeriasResult;
  faltasParsed: ParseFaltasResult;
} {
  const linhas = normalizarMistral(ocrText);

  const feriasRaw = parseHistoricoFerias(
    recortar(linhas, RE_FERIAS_HEADER, RE_FIM_FERIAS),
  );

  const afastPrincipalRaw = parseAfastamentos(
    recortar(linhas, RE_AFASTAMENTOS_PRINCIPAL, [
      RE_AFASTAMENTOS_OUTROS,
      RE_FERIAS_HEADER,
      ...RE_FIM_FERIAS,
    ]),
    'principal',
  );

  const afastOutrosRaw = parseAfastamentos(
    recortar(linhas, RE_AFASTAMENTOS_OUTROS, [
      RE_FERIAS_HEADER,
      ...RE_FIM_FERIAS,
    ]),
    'outros',
  );

  // adaptarFerias lê só `.historico_ferias`; adaptarFaltas lê só
  // `.afastamentos` + `.afastamentos_outros`. Objeto parcial é seguro —
  // nenhum outro campo é acessado internamente pelos dois adaptadores.
  const syntheticCtps = {
    historico_ferias: feriasRaw,
    afastamentos: afastPrincipalRaw,
    afastamentos_outros: afastOutrosRaw,
  } as unknown as CtpsDominioV2;

  return {
    feriasParsed: adaptarFerias(syntheticCtps),
    faltasParsed: adaptarFaltas(syntheticCtps),
  };
}
