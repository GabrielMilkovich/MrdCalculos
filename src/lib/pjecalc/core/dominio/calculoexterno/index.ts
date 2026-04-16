/**
 * PJe-Calc v2.15.1 — Barrel do pacote `dominio/calculoexterno`.
 * Fase 14 — Integração com Cálculo Externo (PJe/eGestão).
 */

// Base + Utils estático
export { ParcelasAtualizaveisUtils } from './parcelas-atualizaveis-utils';

// Entidades (data-holders)
export { ParcelasAtualizaveisCustas } from './parcelas-atualizaveis-custas';
export {
  ParcelasAtualizaveisMultaIndenizacao,
  type MultaRef,
} from './parcelas-atualizaveis-multa-indenizacao';
export {
  ParcelasAtualizaveisHonorario,
  type HonorarioRef,
} from './parcelas-atualizaveis-honorario';
export { ParcelasAtualizaveisCreditosReclamante } from './parcelas-atualizaveis-creditos-reclamante';
export { ParcelasAtualizaveisDebitosReclamante } from './parcelas-atualizaveis-debitos-reclamante';
export { ParcelasAtualizaveisDescontoCreditosReclamante } from './parcelas-atualizaveis-desconto-creditos-reclamante';
export { ParcelasAtualizaveisOutrosDebitosReclamado } from './parcelas-atualizaveis-outros-debitos-reclamado';

// Utils por entidade
export { ParcelasAtualizaveisCustasUtils } from './parcelas-atualizaveis-custas-utils';
export { ParcelasAtualizaveisMultaIndenizacaoUtils } from './parcelas-atualizaveis-multa-indenizacao-utils';
export { ParcelasAtualizaveisHonorarioUtils } from './parcelas-atualizaveis-honorario-utils';
export { ParcelasAtualizaveisCreditosReclamanteUtils } from './parcelas-atualizaveis-creditos-reclamante-utils';
export { ParcelasAtualizaveisDebitosReclamanteUtils } from './parcelas-atualizaveis-debitos-reclamante-utils';
export { ParcelasAtualizaveisDescontoCreditosReclamanteUtils } from './parcelas-atualizaveis-desconto-creditos-reclamante-utils';
export { ParcelasAtualizaveisOutrosDebitosReclamadoUtils } from './parcelas-atualizaveis-outros-debitos-reclamado-utils';

// Repositórios (JPA stubs)
export {
  RepositorioDeParcelasAtualizaveisCreditosReclamante,
  RepositorioDeParcelasAtualizaveisCustas,
  RepositorioDeParcelasAtualizaveisDebitosReclamante,
  RepositorioDeParcelasAtualizaveisDescontoCreditosReclamante,
  RepositorioDeParcelasAtualizaveisHonorario,
  RepositorioDeParcelasAtualizaveisMultaIndenizacao,
  RepositorioDeParcelasAtualizaveisOutrosDebitosReclamado,
} from './repositorios';
