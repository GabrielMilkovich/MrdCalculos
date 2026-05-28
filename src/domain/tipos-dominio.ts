/**
 * Re-export dos tipos CTPS V2 a partir de supabase/functions/_shared/.
 *
 * Single source of truth: supabase/functions/_shared/tipos-dominio.ts.
 * Esta camada existe pra evitar caminhos relativos longos no frontend
 * e pra futura migração caso os tipos virem pacote separado.
 */
export type {
  CtpsDominioV2,
  CtpsLocalTrabalho,
  CtpsDadosPessoais,
  CtpsEnderecoResidencial,
  CtpsDependente,
  CtpsDadosEmpregado,
  CtpsFuncaoAtual,
  CtpsInformacoesSindicais,
  CtpsHistoricoSalarialItem,
  CtpsFuncaoExercida,
  CtpsLotacao,
  CtpsAfastamento,
  CtpsHistoricoFeriasItem,
} from '../../supabase/functions/_shared/tipos-dominio';
