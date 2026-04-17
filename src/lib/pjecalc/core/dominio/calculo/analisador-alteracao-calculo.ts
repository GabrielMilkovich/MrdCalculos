/**
 * PJe-Calc v2.15.1 — AnalisadorAlteracaoCalculo (stub)
 * Porte de: br.jus.trt8.pjecalc.negocio.dominio.calculo.AnalisadorAlteracaoCalculo
 *
 * Ref Java: pjecalc-fonte/.../calculo/AnalisadorAlteracaoCalculo.java (~341 linhas)
 *
 * Compara duas instâncias de `Calculo` e detecta alterações que exigem
 * recálculo de liquidação ou invalidação do hash de validação. Consumido
 * em fluxos de edição (UI) para aplicar regras de auditoria.
 *
 * **Status**: stub com a fachada mínima (método `analisar`) — as comparações
 * campo a campo virão em fase futura quando o Calculo completo estiver
 * estabilizado.
 */
import type { Calculo } from './calculo';

export interface ResultadoAnaliseAlteracao {
  alterouCalculo: boolean;
  alterouAtualizacao: boolean;
  camposAlterados: string[];
}

export class AnalisadorAlteracaoCalculo {
  /**
   * analisar (Java) — compara calculoOriginal vs calculoAlterado e retorna
   * quais módulos foram afetados. Stub por enquanto.
   */
  static analisar(_original: Calculo, _alterado: Calculo): ResultadoAnaliseAlteracao {
    return {
      alterouCalculo: false,
      alterouAtualizacao: false,
      camposAlterados: [],
    };
  }
}
