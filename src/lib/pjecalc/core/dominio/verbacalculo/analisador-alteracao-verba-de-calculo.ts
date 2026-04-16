/**
 * PJe-Calc v2.15.1 — AnalisadorAlteracaoVerbaDeCalculo (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.verbacalculo.AnalisadorAlteracaoVerbaDeCalculo
 *
 * Ref Java: pjecalc-fonte/.../verbacalculo/AnalisadorAlteracaoVerbaDeCalculo.java (~270 linhas)
 *
 * Detecta alterações entre duas instâncias de `VerbaDeCalculo` e determina
 * se é necessário reexecutar liquidação. Usa `ComparadorDeListas` para
 * comparar coleções de ocorrências, histórico salarial vinculado, vales
 * transporte etc.
 */
import type { VerbaDeCalculo } from './verba-de-calculo';

export interface ResultadoAnaliseAlteracaoVerba {
  alterouBase: boolean;
  alterouFormula: boolean;
  alterouIncidencias: boolean;
  alterouOcorrencias: boolean;
  camposAlterados: string[];
}

export class AnalisadorAlteracaoVerbaDeCalculo {
  /**
   * analisar (Java) — compara `original` vs `alterado` e retorna lista de
   * diferenças relevantes para decidir se precisa recalcular.
   * Stub por enquanto.
   */
  static analisar(_original: VerbaDeCalculo, _alterado: VerbaDeCalculo): ResultadoAnaliseAlteracaoVerba {
    return {
      alterouBase: false,
      alterouFormula: false,
      alterouIncidencias: false,
      alterouOcorrencias: false,
      camposAlterados: [],
    };
  }
}
