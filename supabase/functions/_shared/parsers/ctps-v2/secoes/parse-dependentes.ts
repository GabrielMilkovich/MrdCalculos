import type { CtpsDependente } from '../../../tipos-dominio.ts';
import { parseBoolBR } from '../helpers.ts';

/**
 * DEPENDENTES: 6 colunas tabulares
 *   Nome | Parentesco | Sexo | Nascimento | IRRF | Sal.Família
 *
 * Forma observada (extrairGeometrico):
 *   MARIA DILCE MATTOS GUERREIRO TEIXEIRA Cônjuge Feminino 29/03/1964 Sim Não
 *   GIOVANA RANGEL ANDREJESWKI Filho(a) Feminino 03/10/2006 Nao Não
 *
 * Âncora forte = whitelist de PARENTESCO. `.+?` lazy no nome cresce até
 * achar uma palavra do whitelist, daí parser determinístico até o fim.
 */
const PARENTESCO =
  '(C[ôo]njuge|Filho\\(a\\)|Filha\\(o\\)|Filho|Filha|Companheiro\\(a\\)|Companheira\\(o\\)|Enteado\\(a\\)|Enteada\\(o\\)|Pai|M[ãa]e|Tutelado\\(a\\)|Tutelado|Agregado\\(a\\)|Agregado)';
const SEXO = '(Masculino|Feminino)';
const BOOL = '(Sim|N[ãa]o|S|N)';

const RE_LINHA = new RegExp(
  `^\\s*(.+?)\\s+${PARENTESCO}\\s+${SEXO}\\s+(\\d{2}\\/\\d{2}\\/\\d{4})\\s+${BOOL}\\s+${BOOL}\\s*$`,
);

export function parseDependentes(linhas: string[]): CtpsDependente[] {
  const resultado: CtpsDependente[] = [];
  for (const linha of linhas) {
    const m = linha.match(RE_LINHA);
    if (!m) continue;
    resultado.push({
      nome: m[1].trim(),
      parentesco: m[2],
      sexo: (m[3] as 'Masculino' | 'Feminino'),
      nascimento: m[4],
      irrf: parseBoolBR(m[5]) ?? false,
      salario_familia: parseBoolBR(m[6]) ?? false,
    });
  }
  return resultado;
}
