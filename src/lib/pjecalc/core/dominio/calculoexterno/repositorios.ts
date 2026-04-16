/**
 * PJe-Calc v2.15.1 — Repositorios de ParcelasAtualizaveis* (stubs JPA)
 *
 * Porte TS-adaptado de:
 *   RepositorioDeParcelasAtualizaveisCreditosReclamante
 *   RepositorioDeParcelasAtualizaveisCustas
 *   RepositorioDeParcelasAtualizaveisDebitosReclamante
 *   RepositorioDeParcelasAtualizaveisDescontoCreditosReclamante
 *   RepositorioDeParcelasAtualizaveisHonorario
 *   RepositorioDeParcelasAtualizaveisMultaIndenizacao
 *   RepositorioDeParcelasAtualizaveisOutrosDebitosReclamado
 *
 * No Java são DAOs JPA que encapsulam queries Hibernate (`obterDoCalculo`,
 * `removerCustas`, `removerMultas`, `removerHonorarios`). A camada de persistência
 * do core TS usa Supabase e não precisa dessas classes. Mantemos as assinaturas
 * como stubs abstratos para garantir que consumidores externos possam importar
 * os tipos e, futuramente, prover implementações concretas via DI/Supabase.
 */
import type { Calculo } from '../calculo/calculo';
import type { ParcelasAtualizaveisCreditosReclamante } from './parcelas-atualizaveis-creditos-reclamante';
import type { ParcelasAtualizaveisCustas } from './parcelas-atualizaveis-custas';
import type { ParcelasAtualizaveisDebitosReclamante } from './parcelas-atualizaveis-debitos-reclamante';
import type { ParcelasAtualizaveisDescontoCreditosReclamante } from './parcelas-atualizaveis-desconto-creditos-reclamante';
import type { ParcelasAtualizaveisHonorario } from './parcelas-atualizaveis-honorario';
import type { ParcelasAtualizaveisMultaIndenizacao } from './parcelas-atualizaveis-multa-indenizacao';
import type { ParcelasAtualizaveisOutrosDebitosReclamado } from './parcelas-atualizaveis-outros-debitos-reclamado';

export abstract class RepositorioDeParcelasAtualizaveisCreditosReclamante {
  abstract obterDoCalculo(calculo: Calculo): ParcelasAtualizaveisCreditosReclamante | null;
}

export abstract class RepositorioDeParcelasAtualizaveisCustas {
  abstract removerCustas(custas: ParcelasAtualizaveisCustas[]): void;
}

export abstract class RepositorioDeParcelasAtualizaveisDebitosReclamante {
  abstract obterDoCalculo(calculo: Calculo): ParcelasAtualizaveisDebitosReclamante | null;
}

export abstract class RepositorioDeParcelasAtualizaveisDescontoCreditosReclamante {
  abstract obterDoCalculo(calculo: Calculo): ParcelasAtualizaveisDescontoCreditosReclamante | null;
}

export abstract class RepositorioDeParcelasAtualizaveisHonorario {
  abstract removerHonorarios(
    origem:
      | ParcelasAtualizaveisDescontoCreditosReclamante
      | ParcelasAtualizaveisOutrosDebitosReclamado
      | ParcelasAtualizaveisDebitosReclamante,
  ): void;
}

export abstract class RepositorioDeParcelasAtualizaveisMultaIndenizacao {
  abstract removerMultas(
    origem:
      | ParcelasAtualizaveisCreditosReclamante
      | ParcelasAtualizaveisDescontoCreditosReclamante
      | ParcelasAtualizaveisOutrosDebitosReclamado
      | ParcelasAtualizaveisDebitosReclamante,
  ): void;
}

export abstract class RepositorioDeParcelasAtualizaveisOutrosDebitosReclamado {
  abstract obterDoCalculo(calculo: Calculo): ParcelasAtualizaveisOutrosDebitosReclamado | null;
}
