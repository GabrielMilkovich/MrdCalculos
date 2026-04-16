import * as fs from 'fs';
import * as path from 'path';

/**
 * Gera os 6 índices restantes (IPCAETR, DevedorFazenda, IndebitoTributario,
 * TabelaUnicaJTMensal, TabelaUnicaJTDiario, TabelaUnicaDebitoTrabalhista) com
 * estrutura idêntica. Todos estendem IndiceBase e têm obterTabela(periodo).
 */
const indices = [
  {
    pasta: 'ipcatr',
    classe: 'IndiceIPCAETR',
    arquivo: 'indice-ipcae-tr',
    tabela: 'TABELA_IPCAETR',
    tabelaArquivo: 'tabela-ipcae-tr',
    descricao: 'IPCA-E/TR combinado (IPCA-E base + TR pós-FGTS)',
    diario: false,
  },
  {
    pasta: 'dfp',
    classe: 'IndiceDevedorFazenda',
    arquivo: 'indice-devedor-fazenda',
    tabela: 'TABELA_DEVEDOR_FAZENDA',
    tabelaArquivo: 'tabela-devedor-fazenda',
    descricao: 'Tabela Devedor Fazenda Pública (EC 113/2021 + Lei 9.430/96)',
    diario: false,
  },
  {
    pasta: 'it',
    classe: 'IndiceIndebitoTributario',
    arquivo: 'indice-indebito-tributario',
    tabela: 'TABELA_INDEBITO_TRIBUTARIO',
    tabelaArquivo: 'tabela-indebito-tributario',
    descricao: 'Tabela de Repetição de Indébito Tributário',
    diario: false,
  },
  {
    pasta: 'tabelaunica',
    classe: 'IndiceTabelaUnicaJTMensal',
    arquivo: 'indice-tabela-unica-jt-mensal',
    tabela: 'TABELA_UNICA_JT_MENSAL',
    tabelaArquivo: 'tabela-unica-jt-mensal',
    descricao: 'Tabela Única JT Mensal (CNJ)',
    diario: false,
  },
  {
    pasta: 'tabelaunica',
    classe: 'IndiceTabelaUnicaJTDiario',
    arquivo: 'indice-tabela-unica-jt-diario',
    tabela: 'TABELA_UNICA_JT_DIARIO',
    tabelaArquivo: 'tabela-unica-jt-diario',
    descricao: 'Tabela Única JT Diária (CNJ)',
    diario: true,
  },
  {
    pasta: 'tabelaunica',
    classe: 'IndiceTabelaUnicaDebitoTrabalhista',
    arquivo: 'indice-tabela-unica-debito-trabalhista',
    tabela: 'TABELA_UNICA_DEBITO_TRABALHISTA',
    tabelaArquivo: 'tabela-unica-debito-trabalhista',
    descricao: 'Tabela Única de Débito Trabalhista (TUACDT)',
    diario: true,
  },
];

const base = 'src/lib/pjecalc/core/dominio/indices';

for (const i of indices) {
  const dir = path.join(base, i.pasta);
  fs.mkdirSync(dir, { recursive: true });

  // Arquivo da classe
  const classContent = `/**
 * PJe-Calc v2.15.1 — ${i.classe}
 * Porte 1:1 de: br.jus.trt8.pjecalc.negocio.dominio.indices.${i.pasta}.${i.classe}
 *
 * ${i.descricao}.
 */
import Decimal from 'decimal.js';
import { IndiceBase } from '../indice-base';
import { HelperDate } from '../../../base/comum/helper-date';
import type { Periodo } from '../../../base/comum/periodo';
import { ${i.tabela} } from './${i.tabelaArquivo}';

export class ${i.classe} extends IndiceBase {
  constructor(competencia: Date, taxa: Decimal, dataCriacao?: Date) {
    super(competencia, taxa, dataCriacao);
  }

  static obterTabela(periodo: Periodo): ${i.classe}[] {
    const lista: ${i.classe}[] = [];
${i.diario
  ? `    for (const entry of ${i.tabela}) {
      const comp = new Date(entry.ano, entry.mes - 1, entry.dia);
      if (!HelperDate.dateBeforeOrEquals(periodo.getInicial(), comp)
          || !HelperDate.dateBeforeOrEquals(comp, periodo.getFinal())) continue;
      lista.push(new ${i.classe}(comp, new Decimal(entry.taxa)));
    }`
  : `    const inicio = HelperDate.getCurrentCompetence(periodo.getInicial());
    const fim = HelperDate.getCurrentCompetence(periodo.getFinal());
    for (const entry of ${i.tabela}) {
      const comp = new Date(entry.ano, entry.mes - 1, 1);
      if (comp < inicio.getDate() || comp > fim.getDate()) continue;
      lista.push(new ${i.classe}(comp, new Decimal(entry.taxa)));
    }`
}
    lista.sort((a, b) => a.getCompetencia().getTime() - b.getCompetencia().getTime());
    return lista;
  }

  clonar(): ${i.classe} {
    const c = new ${i.classe}(this.competencia, this.taxa, this.dataCriacao);
    if (this.valorAcumulado !== null) c.setValorAcumulado(this.valorAcumulado);
    return c;
  }
}
`;

  fs.writeFileSync(path.join(dir, `${i.arquivo}.ts`), classContent);

  // Arquivo da tabela
  const tabelaInterfaceName = `EntradaTabela${i.classe.replace('Indice', '')}`;
  const tabelaContent = `/**
 * PJe-Calc — Tabela ${i.classe.replace('Indice', '')}
 *
 * ${i.descricao}.
 * A popular via seed em produção.
 */
export interface ${tabelaInterfaceName} {
  ano: number;
  mes: number;
${i.diario ? '  dia: number;\n' : ''}  taxa: number;
}

export const ${i.tabela}: readonly ${tabelaInterfaceName}[] = [];
`;

  fs.writeFileSync(path.join(dir, `${i.tabelaArquivo}.ts`), tabelaContent);

  console.log(`Generated ${i.pasta}/${i.arquivo}.ts + ${i.tabelaArquivo}.ts`);
}

console.log(`\nTotal: ${indices.length} índices gerados.`);
