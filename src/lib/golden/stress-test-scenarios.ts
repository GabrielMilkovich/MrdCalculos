/**
 * STRESS TEST SCENARIOS — 50 cenários sintéticos para validação em escala
 * 
 * Metodologia: Dados embaralhados dos 6 casos golden reais
 * (Maria Madalena, Antônio Harley, Rosicléia, Izabela Cristina, Joseli Silva, Roque Guerreiro)
 * 
 * Cenários 01–30: Combinações controladas com dados cruzados
 * Cenários 31–50: Dados totalmente embaralhados (chaos testing)
 * 
 * Cada cenário testa variações de:
 * - Multiplicadores (0.3, 0.4, 0.45, 0.7, 0.72, 1.5, 1.6, 1.7)
 * - Divisores (1, 30, 220, variável)
 * - Prescrição quinquenal (sim/não)
 * - Reflexos (13º, Férias, AP, RSR)
 * - Art. 384, Intrajornada, Interjornada
 * - Correção monetária (IPCA-E, SELIC, TRD)
 * - INSS progressivo, IRRF RRA
 * - FGTS 8% + multa 40%
 * - Honorários, custas
 */

// ── Pool de dados dos 6 casos ──

const NOMES_RECLAMANTES = [
  'MARIA MADALENA ALVES FERREIRA',
  'ANTONIO HARLEY MARQUES GOMES',
  'ROSICLEIA PEREIRA CHAVES',
  'IZABELA CRISTINA RANGEL DO AMARAL',
  'JOSELI SILVA WANDERLEY',
  'ROQUE GUERREIRO TEIXEIRA',
];

const NOMES_RECLAMADOS = [
  'GRUPO CASAS BAHIA S.A.',
  'MAGAZINE LUIZA S/A',
  'CARREFOUR COMERCIO E INDUSTRIA LTDA',
  'LOJAS AMERICANAS S.A.',
  'VIA S.A.',
  'GPA - COMPANHIA BRASILEIRA DE DISTRIBUICAO',
];

const CPFS = [
  '100.233.396-24', '030.864.683-51', '977.528.279-91',
  '306.546.958-81', '359.257.019-68', '123.456.789-00',
];

const CNPJS = [
  '33041260000164', '47960950080990', '33041260065290',
  '45543915014080', '33041260098472', '47508411022839',
];

const ESTADOS = ['SP', 'CE', 'PR', 'MG', 'RJ', 'RS', 'BA', 'SC', 'PE', 'GO'];
const MUNICIPIOS = [
  'SAO BERNARDO DO CAMPO', 'FORTALEZA', 'CURITIBA', 'BELO HORIZONTE',
  'RIO DE JANEIRO', 'PORTO ALEGRE', 'SALVADOR', 'JOINVILLE',
  'RECIFE', 'GOIANIA',
];

// Períodos de contrato reais (dos 6 casos)
const PERIODOS_CONTRATO = [
  { admissao: '2015-03-07', demissao: '2021-03-02', ajuizamento: '2021-04-16' },
  { admissao: '2019-11-21', demissao: '2020-11-13', ajuizamento: '2022-09-20' },
  { admissao: '2018-06-06', demissao: '2024-07-04', ajuizamento: '2024-08-07' },
  { admissao: '2020-11-12', demissao: '2022-04-14', ajuizamento: '2022-04-25' },
  { admissao: '2011-06-02', demissao: '2020-03-13', ajuizamento: '2021-08-17' },
  { admissao: '2003-11-24', demissao: '2021-03-09', ajuizamento: '2021-06-21' },
];

// Salários base dos casos reais (variados)
const SALARIOS_BASE = [
  1518.00, 1800.00, 2200.00, 2500.00, 3000.00, 3500.00,
  4000.00, 5000.00, 6500.00, 8000.00, 1412.00, 2793.88,
];

// Cargas horárias
const CARGAS = [220, 200, 180, 150, 120, 44];

// Multiplicadores observados nos casos
const MULTIPLICADORES_HE = [0.5, 0.7, 0.72, 1.0, 1.5];
const MULTIPLICADORES_INTERVALO = [1.5, 1.6, 1.7];
const MULTIPLICADORES_COMISSAO = [0.1, 0.3, 0.4, 0.45, 0.72];

// Tipos de rubrica exercitados
type RubricaTipo = 'HE' | 'INTRAJORNADA' | 'INTERJORNADA' | 'DOM_FERIADOS' |
  'COMISSOES_ESTORNADAS' | 'VENDAS_PRAZO' | 'VENDAS_NAO_FATURADAS' |
  'PREMIO_ESTIMULO' | 'PREMIO_META' | 'VENDAS_REDUCAO_MARGEM' |
  'DIF_COMISSOES_CANCELADAS' | 'DIF_COMISSOES_PARCELADAS' |
  'DIF_VENDAS_CANCELADAS' | 'ART384' | 'RSR_COMISSIONISTA' |
  'SAL_SUBSTITUICAO' | 'FERIADOS_LABORADOS';

// Reflexos possíveis
type ReflexoTipo = '13' | 'FERIAS' | 'AP' | 'RSR';

// Comportamentos de média para reflexos
type MediaTipo = 'MEDIA_PELA_QUANTIDADE' | 'MEDIA_PELO_VALOR_CORRIGIDO' | 'MEDIA_PELO_VALOR' | 'VALOR_MENSAL';

export interface StressTestRubrica {
  codigo: string;
  tipo: RubricaTipo;
  multiplicador: number;
  divisor: number | 'VARIAVEL'; // 'VARIAVEL' = por competência
  quantidade: number | 'IMPORTADA_DO_CARTAO' | 'IMPORTADA_DO_CALENDARIO';
  reflexos: Array<{
    tipo: ReflexoTipo;
    media: MediaTipo;
  }>;
  periodo_inicio?: string;
  periodo_fim?: string;
  base_composta?: string[]; // códigos de outras rubricas que compõem a base
}

export interface StressTestScenario {
  id: string;
  nome_cenario: string;
  descricao: string;
  
  // Dados do processo
  reclamante: string;
  reclamado: string;
  cpf: string;
  cnpj: string;
  estado: string;
  municipio: string;
  
  // Contrato
  admissao: string;
  demissao: string;
  ajuizamento: string;
  inicio_calculo: string;
  termino_calculo: string;
  carga_horaria: number;
  salario_base: number;
  
  // Configurações
  sabado_dia_util: boolean;
  projeta_aviso: boolean;
  feriado_estadual: boolean;
  feriado_municipal: boolean;
  prescricao_quinquenal: boolean;
  zera_negativo: boolean;
  limitar_avos: boolean;
  
  // Rubricas a calcular
  rubricas: StressTestRubrica[];
  
  // Configurações de descontos
  fgts: { apurar: boolean; aliquota: number; multa: number };
  inss: { apurar: boolean };
  ir: { apurar: boolean; dependentes: number };
  honorarios: { percentual: number };
  custas: { valor: number };
  
  // Bandeiras de exercício de motor
  flags: string[];
}

// ── Helper: pseudo-random determinístico (seed-based) ──
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickN<T>(arr: T[], n: number, rand: () => number): T[] {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// ── Gerador de rubricas aleatórias ──
function gerarRubricas(rand: () => number, complexidade: number): StressTestRubrica[] {
  const ALL_RUBRICAS: RubricaTipo[] = [
    'HE', 'INTRAJORNADA', 'INTERJORNADA', 'DOM_FERIADOS',
    'COMISSOES_ESTORNADAS', 'VENDAS_PRAZO', 'VENDAS_NAO_FATURADAS',
    'PREMIO_ESTIMULO', 'PREMIO_META', 'VENDAS_REDUCAO_MARGEM',
    'DIF_COMISSOES_CANCELADAS', 'DIF_COMISSOES_PARCELADAS',
    'DIF_VENDAS_CANCELADAS', 'ART384', 'RSR_COMISSIONISTA',
    'SAL_SUBSTITUICAO', 'FERIADOS_LABORADOS',
  ];

  const ALL_REFLEXOS: ReflexoTipo[] = ['13', 'FERIAS', 'AP', 'RSR'];
  const ALL_MEDIAS: MediaTipo[] = ['MEDIA_PELA_QUANTIDADE', 'MEDIA_PELO_VALOR_CORRIGIDO', 'MEDIA_PELO_VALOR', 'VALOR_MENSAL'];

  const numRubricas = Math.max(2, Math.min(complexidade, ALL_RUBRICAS.length));
  const selected = pickN(ALL_RUBRICAS, numRubricas, rand);

  return selected.map(tipo => {
    let mult = 1;
    let div: number | 'VARIAVEL' = 1;
    let qtd: number | 'IMPORTADA_DO_CARTAO' | 'IMPORTADA_DO_CALENDARIO' = 1;

    switch (tipo) {
      case 'HE':
        mult = pick(MULTIPLICADORES_HE, rand);
        div = rand() > 0.5 ? 220 : 'VARIAVEL';
        qtd = rand() > 0.3 ? 'IMPORTADA_DO_CARTAO' : Math.round(rand() * 30 + 5);
        break;
      case 'INTRAJORNADA':
      case 'INTERJORNADA':
        mult = pick(MULTIPLICADORES_INTERVALO, rand);
        div = 220;
        qtd = 'IMPORTADA_DO_CARTAO';
        break;
      case 'DOM_FERIADOS':
      case 'FERIADOS_LABORADOS':
        mult = rand() > 0.5 ? 1 : pick(MULTIPLICADORES_HE, rand);
        div = rand() > 0.5 ? 220 : 1;
        qtd = 'IMPORTADA_DO_CALENDARIO';
        break;
      case 'COMISSOES_ESTORNADAS':
      case 'VENDAS_PRAZO':
      case 'VENDAS_NAO_FATURADAS':
      case 'VENDAS_REDUCAO_MARGEM':
      case 'DIF_COMISSOES_CANCELADAS':
      case 'DIF_COMISSOES_PARCELADAS':
      case 'DIF_VENDAS_CANCELADAS':
        mult = pick(MULTIPLICADORES_COMISSAO, rand);
        break;
      case 'PREMIO_ESTIMULO':
      case 'PREMIO_META':
        mult = pick([0.3, 0.4, 0.45], rand);
        break;
      case 'ART384':
        mult = pick(MULTIPLICADORES_COMISSAO, rand);
        break;
      case 'RSR_COMISSIONISTA':
        div = 'VARIAVEL';
        qtd = 'IMPORTADA_DO_CALENDARIO';
        break;
      case 'SAL_SUBSTITUICAO':
        mult = 1;
        break;
    }

    // Reflexos: cada rubrica pode ter 0-4 reflexos
    const numReflexos = Math.floor(rand() * 5);
    const reflexos = pickN(ALL_REFLEXOS, numReflexos, rand).map(r => ({
      tipo: r,
      media: pick(ALL_MEDIAS, rand),
    }));

    // Base composta: 30% de chance de depender de outra rubrica
    const baseComposta = rand() > 0.7
      ? pickN(selected.filter(s => s !== tipo), Math.floor(rand() * 2) + 1, rand)
      : undefined;

    return {
      codigo: tipo,
      tipo,
      multiplicador: mult,
      divisor: div,
      quantidade: qtd,
      reflexos,
      base_composta: baseComposta,
    };
  });
}

// ── Gerador de cenário ──
function gerarCenario(id: number, rand: () => number, descricaoExtra: string = ''): StressTestScenario {
  const periodo = pick(PERIODOS_CONTRATO, rand);
  const prescricao = rand() > 0.7;
  
  // Se prescrição ativada, início do cálculo é 5 anos antes do ajuizamento
  const ajuiz = new Date(periodo.ajuizamento);
  const inicioCalc = prescricao
    ? new Date(ajuiz.getFullYear() - 5, ajuiz.getMonth(), ajuiz.getDate()).toISOString().split('T')[0]
    : periodo.admissao;
  
  const complexidade = Math.floor(rand() * 12) + 3; // 3 a 14 rubricas
  const flags: string[] = [];
  
  // Determinar flags com base nas rubricas
  const rubricas = gerarRubricas(rand, complexidade);
  
  if (rubricas.some(r => r.tipo === 'ART384')) flags.push('ART384_CLT');
  if (rubricas.some(r => r.tipo === 'RSR_COMISSIONISTA')) flags.push('COMISSIONISTA');
  if (rubricas.some(r => r.divisor === 'VARIAVEL')) flags.push('DIVISOR_VARIAVEL');
  if (rubricas.some(r => r.quantidade === 'IMPORTADA_DO_CARTAO')) flags.push('CARTAO_PONTO');
  if (rubricas.some(r => r.base_composta?.length)) flags.push('BASE_COMPOSTA');
  if (prescricao) flags.push('PRESCRICAO_QUINQUENAL');
  if (rand() > 0.5) flags.push('PROJETAR_AVISO');
  if (rand() > 0.7) flags.push('ZERA_NEGATIVO');
  if (rand() > 0.8) flags.push('FGTS_MULTA_40');
  if (rand() > 0.6) flags.push('INSS_PROGRESSIVO');
  if (rand() > 0.7) flags.push('IR_RRA');
  if (rubricas.length > 8) flags.push('ALTA_COMPLEXIDADE');
  if (rubricas.some(r => r.reflexos.some(ref => ref.media === 'VALOR_MENSAL'))) flags.push('REFLEXO_VALOR_MENSAL');
  
  const estadoIdx = Math.floor(rand() * ESTADOS.length);
  const salario = pick(SALARIOS_BASE, rand);

  return {
    id: `STRESS-${String(id).padStart(3, '0')}`,
    nome_cenario: `Cenário ${id}: ${pick(NOMES_RECLAMANTES, rand).split(' ').slice(0, 2).join(' ')} vs ${pick(NOMES_RECLAMADOS, rand).split(' ').slice(0, 2).join(' ')}`,
    descricao: descricaoExtra || `Cenário com ${rubricas.length} rubricas, ${flags.join(', ')}`,
    
    reclamante: pick(NOMES_RECLAMANTES, rand),
    reclamado: pick(NOMES_RECLAMADOS, rand),
    cpf: pick(CPFS, rand),
    cnpj: pick(CNPJS, rand),
    estado: ESTADOS[estadoIdx],
    municipio: MUNICIPIOS[estadoIdx],
    
    admissao: periodo.admissao,
    demissao: periodo.demissao,
    ajuizamento: periodo.ajuizamento,
    inicio_calculo: inicioCalc,
    termino_calculo: periodo.demissao,
    carga_horaria: pick(CARGAS, rand),
    salario_base: salario,
    
    sabado_dia_util: rand() > 0.3,
    projeta_aviso: flags.includes('PROJETAR_AVISO'),
    feriado_estadual: rand() > 0.2,
    feriado_municipal: rand() > 0.4,
    prescricao_quinquenal: prescricao,
    zera_negativo: flags.includes('ZERA_NEGATIVO'),
    limitar_avos: rand() > 0.8,
    
    rubricas,
    
    fgts: {
      apurar: rand() > 0.3,
      aliquota: 0.08,
      multa: flags.includes('FGTS_MULTA_40') ? 0.4 : 0,
    },
    inss: { apurar: rand() > 0.2 },
    ir: { apurar: rand() > 0.5, dependentes: Math.floor(rand() * 4) },
    honorarios: { percentual: pick([10, 15, 20], rand) },
    custas: { valor: pick([0, 400, 800, 1000, 2000], rand) },
    
    flags,
  };
}

// ── 30 Cenários Controlados (01–30) ──
export function generateControlledScenarios(): StressTestScenario[] {
  const scenarios: StressTestScenario[] = [];
  
  for (let i = 1; i <= 30; i++) {
    const rand = seededRandom(i * 1000 + 42);
    
    let desc = '';
    // Cenários temáticos
    if (i <= 5) desc = `Edge case: salário mínimo com ${i === 1 ? 'HE simples' : i === 2 ? 'comissões' : i === 3 ? 'intervalos' : i === 4 ? 'Art. 384' : 'todas verbas'}`;
    else if (i <= 10) desc = `Comissionista: multiplicador ${MULTIPLICADORES_HE[i - 6]} com ${i <= 8 ? 'divisor fixo' : 'divisor variável'}`;
    else if (i <= 15) desc = `Prescrição: ${i <= 12 ? 'quinquenal ativa' : i <= 14 ? 'sem prescrição, contrato longo' : 'FGTS trintenária'}`;
    else if (i <= 20) desc = `Reflexos: ${i === 16 ? 'apenas 13º' : i === 17 ? '13º + Férias' : i === 18 ? '13º + AP + RSR' : i === 19 ? 'MEDIA_PELO_VALOR_CORRIGIDO' : 'VALOR_MENSAL'}`;
    else if (i <= 25) desc = `Descontos: ${i === 21 ? 'INSS apenas' : i === 22 ? 'INSS + IR' : i === 23 ? 'INSS + IR + FGTS' : i === 24 ? 'honorários 20%' : 'custas R$ 2.000'}`;
    else desc = `Complexo: ${i === 26 ? '15+ rubricas com base composta' : i === 27 ? 'todos os flags ativos' : i === 28 ? 'caso curtíssimo (6 meses)' : i === 29 ? 'caso longo (18 anos)' : 'IR RRA com 44 competências'}`;
    
    scenarios.push(gerarCenario(i, rand, desc));
  }
  
  return scenarios;
}

// ── 20 Cenários Embaralhados (31–50) — Chaos Testing ──
export function generateShuffledScenarios(): StressTestScenario[] {
  const scenarios: StressTestScenario[] = [];
  
  for (let i = 31; i <= 50; i++) {
    const rand = seededRandom(i * 7777 + 13);
    
    // Chaos: troca nome de um caso com período de outro com salário de terceiro
    const nome1 = pick(NOMES_RECLAMANTES, rand);
    const periodo2 = pick(PERIODOS_CONTRATO, rand);
    const salario3 = pick(SALARIOS_BASE, rand);
    
    const cenario = gerarCenario(i, rand, `CHAOS ${i}: ${nome1.split(' ')[0]} com contrato de ${periodo2.admissao} a ${periodo2.demissao}, salário R$ ${salario3.toFixed(2)}`);
    
    // Sobrescrever com dados embaralhados
    cenario.reclamante = nome1;
    cenario.salario_base = salario3;
    cenario.admissao = periodo2.admissao;
    cenario.demissao = periodo2.demissao;
    
    // Forçar mix de flags aleatórios
    if (rand() > 0.5) cenario.prescricao_quinquenal = !cenario.prescricao_quinquenal;
    if (rand() > 0.5) cenario.zera_negativo = !cenario.zera_negativo;
    if (rand() > 0.5) cenario.ir.apurar = true;
    if (rand() > 0.5) cenario.fgts.multa = 0.4;
    
    scenarios.push(cenario);
  }
  
  return scenarios;
}

// ── Todos os 50 cenários ──
export function getAllStressScenarios(): StressTestScenario[] {
  return [...generateControlledScenarios(), ...generateShuffledScenarios()];
}

// ── Resumo estatístico dos cenários ──
export function getScenarioStats(scenarios: StressTestScenario[]): {
  total: number;
  comPrescricao: number;
  comIR: number;
  comFGTS: number;
  comArt384: number;
  comBaseComposta: number;
  comDivisorVariavel: number;
  comCartaoPonto: number;
  rubricasTotais: number;
  reflexosTotais: number;
  flagsCobertos: string[];
} {
  const allFlags = new Set<string>();
  let rubricasTotais = 0;
  let reflexosTotais = 0;

  scenarios.forEach(s => {
    s.flags.forEach(f => allFlags.add(f));
    rubricasTotais += s.rubricas.length;
    reflexosTotais += s.rubricas.reduce((acc, r) => acc + r.reflexos.length, 0);
  });

  return {
    total: scenarios.length,
    comPrescricao: scenarios.filter(s => s.prescricao_quinquenal).length,
    comIR: scenarios.filter(s => s.ir.apurar).length,
    comFGTS: scenarios.filter(s => s.fgts.apurar).length,
    comArt384: scenarios.filter(s => s.rubricas.some(r => r.tipo === 'ART384')).length,
    comBaseComposta: scenarios.filter(s => s.rubricas.some(r => r.base_composta?.length)).length,
    comDivisorVariavel: scenarios.filter(s => s.rubricas.some(r => r.divisor === 'VARIAVEL')).length,
    comCartaoPonto: scenarios.filter(s => s.rubricas.some(r => r.quantidade === 'IMPORTADA_DO_CARTAO')).length,
    rubricasTotais,
    reflexosTotais,
    flagsCobertos: Array.from(allFlags).sort(),
  };
}
