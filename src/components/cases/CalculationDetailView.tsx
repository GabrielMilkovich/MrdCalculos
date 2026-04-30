import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calculator,
  User,
  Briefcase,
  CalendarDays,
  DollarSign,
  Scale,
  FileText,
  AlertTriangle,
  BookOpen,
  Clock,
  Hash,
  TrendingUp,
  ShieldCheck,
  Gavel,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// =====================================================
// FUNDAMENTAÇÃO JURÍDICA COMPLETA
// =====================================================
const FUNDAMENTOS: Record<string, {
  titulo: string;
  base_legal: string;
  tese: string;
  formula_explicada: string;
}> = {
  HORAS_EXTRAS: {
    titulo: "Horas Extras (50% e 100%)",
    base_legal: "Art. 59, caput e §1º da CLT; Art. 7º, XVI da CF/88; Súmula 85, IV do TST",
    tese: "As horas que excedem a jornada contratual de 8h diárias ou 44h semanais são remuneradas com adicional mínimo de 50%. Horas prestadas em domingos e feriados recebem adicional de 100%.",
    formula_explicada: "Valor Hora = Salário ÷ Divisor (220h). HE50% = Qtd Horas × Valor Hora × 1,5. HE100% = Qtd Horas × Valor Hora × 2,0.",
  },
  DSR_HORAS_EXTRAS: {
    titulo: "DSR sobre Horas Extras",
    base_legal: "Súmula 172 do TST; Lei 605/1949, Art. 7º, 'a' e 'b'",
    tese: "O repouso semanal remunerado incide sobre as horas extras habitualmente prestadas, garantindo que o descanso reflita a remuneração integral do trabalhador.",
    formula_explicada: "DSR = Total de Horas Extras ÷ 6 (proporção de 6 dias úteis para 1 dia de repouso).",
  },
  REFLEXO_13: {
    titulo: "Reflexo das Horas Extras no 13º Salário",
    base_legal: "Súmula 45 do TST; Lei 4.090/1962, Art. 1º",
    tese: "As horas extras habituais integram a remuneração para fins de cálculo do 13º salário, devendo-se apurar a média mensal no período e refletir proporcionalmente por ano trabalhado.",
    formula_explicada: "Média Mensal = Total HE ÷ Meses trabalhados. Reflexo por ano = (Média × Meses no ano) ÷ 12.",
  },
  REFLEXO_FERIAS: {
    titulo: "Reflexo das Horas Extras nas Férias",
    base_legal: "Art. 142, §5º da CLT; Súmula 151 do TST; Art. 7º, XVII da CF/88",
    tese: "As horas extras habituais integram a base de cálculo das férias, devendo-se apurar a média do período aquisitivo. O terço constitucional (1/3) incide sobre o valor encontrado.",
    formula_explicada: "Reflexo Férias = Média Mensal HE × (Avos ÷ 12). Terço = Reflexo × 1/3.",
  },
  REFLEXO_FERIAS_TERCO: {
    titulo: "1/3 Constitucional sobre Reflexo em Férias",
    base_legal: "Art. 7º, XVII da CF/88",
    tese: "O terço constitucional de férias é garantia irrenunciável, devendo incidir sobre todas as parcelas que integram a remuneração de férias, inclusive reflexos de horas extras.",
    formula_explicada: "Terço = Valor do Reflexo de Férias × 1/3.",
  },
  FGTS_8: {
    titulo: "FGTS 8% sobre Verbas Deferidas",
    base_legal: "Art. 15, caput da Lei 8.036/1990; Art. 7º, III da CF/88",
    tese: "O FGTS incide à alíquota de 8% sobre todas as verbas de natureza salarial deferidas em juízo, incluindo horas extras, reflexos e adicionais.",
    formula_explicada: "FGTS = (Total HE + Reflexo 13º + Reflexo Férias) × 8%.",
  },
  FGTS_MULTA_40: {
    titulo: "Multa Rescisória de 40% do FGTS",
    base_legal: "Art. 18, §1º da Lei 8.036/1990; Art. 7º, I da CF/88",
    tese: "Na dispensa sem justa causa, o empregador deve pagar multa de 40% sobre o montante total de depósitos de FGTS realizados durante o contrato de trabalho.",
    formula_explicada: "Multa = Total FGTS depositado × 40%.",
  },
  MULTA_FGTS_40: {
    titulo: "Multa Rescisória de 40% do FGTS",
    base_legal: "Art. 18, §1º da Lei 8.036/1990; Art. 7º, I da CF/88",
    tese: "Na dispensa sem justa causa, o empregador deve pagar multa de 40% sobre o montante total de depósitos de FGTS realizados durante o contrato de trabalho.",
    formula_explicada: "Multa = Total FGTS depositado × 40%.",
  },
  MULTA_FGTS_20: {
    titulo: "Multa Rescisória de 20% do FGTS (Acordo)",
    base_legal: "Art. 484-A, I, 'b' da CLT (Reforma Trabalhista — Lei 13.467/2017)",
    tese: "Na rescisão por acordo mútuo, a multa do FGTS é reduzida pela metade (20%), conforme disciplinado pela Reforma Trabalhista.",
    formula_explicada: "Multa = Total FGTS depositado × 20%.",
  },
  SALDO_SAL: {
    titulo: "Saldo de Salário",
    base_legal: "Art. 462 e 464 da CLT",
    tese: "O saldo de salário corresponde à remuneração dos dias efetivamente trabalhados no mês da rescisão contratual, calculado de forma proporcional.",
    formula_explicada: "Saldo = (Salário ÷ 30) × Dias trabalhados no mês da rescisão.",
  },
  AVISO_PREVIO: {
    titulo: "Aviso Prévio Indenizado",
    base_legal: "Art. 487, §1º da CLT; Lei 12.506/2011",
    tese: "O aviso prévio indenizado é de no mínimo 30 dias, acrescido de 3 dias por ano de serviço prestado na mesma empresa, até o limite máximo de 90 dias.",
    formula_explicada: "Dias = 30 + (Anos de Serviço × 3), máximo 90. Valor = (Salário ÷ 30) × Dias.",
  },
  AVISO_PREVIO_ACORDO: {
    titulo: "Aviso Prévio Indenizado (50% — Acordo Mútuo)",
    base_legal: "Art. 484-A, I, 'a' da CLT (Reforma Trabalhista — Lei 13.467/2017)",
    tese: "Na rescisão por acordo mútuo entre empregado e empregador, o aviso prévio indenizado é devido pela metade (50%).",
    formula_explicada: "Dias = ceil((30 + Anos × 3) ÷ 2). Valor = (Salário ÷ 30) × Dias.",
  },
  FERIAS_VENC: {
    titulo: "Férias Vencidas + 1/3 Constitucional",
    base_legal: "Art. 129, 130 e 137 da CLT; Art. 7º, XVII da CF/88",
    tese: "São devidas férias integrais quando o empregado adquiriu o direito e o período concessivo expirou sem gozo. O terço constitucional é garantia irrenunciável.",
    formula_explicada: "Férias = Salário + (Salário ÷ 3).",
  },
  FERIAS_PROP: {
    titulo: "Férias Proporcionais + 1/3 Constitucional",
    base_legal: "Art. 146, parágrafo único da CLT; Súmula 171 do TST; Art. 7º, XVII da CF/88",
    tese: "Férias proporcionais são devidas na rescisão sem justa causa, calculadas à razão de 1/12 por mês trabalhado ou fração igual ou superior a 15 dias.",
    formula_explicada: "Base = (Salário × Avos) ÷ 12. Total = Base + (Base ÷ 3).",
  },
  DECIMO_PROP: {
    titulo: "13º Salário Proporcional",
    base_legal: "Lei 4.090/1962, Art. 1º e 2º; Art. 7º, VIII da CF/88",
    tese: "O 13º salário proporcional é devido em qualquer modalidade de rescisão (exceto justa causa), calculado à razão de 1/12 por mês trabalhado no ano.",
    formula_explicada: "13º = (Salário × Avos) ÷ 12.",
  },
  horas_extras: {
    titulo: "Horas Extras",
    base_legal: "Art. 59 e 71 da CLT; Art. 7º, XVI da CF/88",
    tese: "Horas trabalhadas além da jornada contratual são remuneradas com adicional mínimo de 50%.",
    formula_explicada: "Valor = Quantidade de horas × (Salário ÷ Divisor) × Adicional.",
  },
  atualizacao_monetaria: {
    titulo: "Atualização Monetária",
    base_legal: "Art. 39, §1º da Lei 8.177/91; ADC 58 do STF",
    tese: "Os créditos trabalhistas são corrigidos pelo IPCA-E na fase pré-judicial e pela taxa SELIC na fase judicial, conforme decisão vinculante do STF.",
    formula_explicada: "Valor atualizado = Valor original × Fator acumulado do índice.",
  },
  inss: {
    titulo: "Desconto INSS (Contribuição Previdenciária)",
    base_legal: "Art. 195, I, 'a' da CF/88; Lei 8.212/1991, Art. 28",
    tese: "A contribuição previdenciária incide sobre verbas de natureza remuneratória, aplicando-se a tabela progressiva vigente à época.",
    formula_explicada: "Desconto progressivo por faixa salarial conforme tabela do INSS.",
  },
};

// =====================================================
// HELPERS
// =====================================================
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const formatDateBR = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

const DEMISSAO_LABELS: Record<string, string> = {
  sem_justa_causa: "Dispensa sem Justa Causa",
  justa_causa: "Dispensa por Justa Causa",
  pedido_demissao: "Pedido de Demissão",
  rescisao_indireta: "Rescisão Indireta",
  acordo: "Acordo Mútuo (Art. 484-A CLT)",
};

const FACT_LABELS: Record<string, { label: string; icon: any; format: (v: string) => string }> = {
  data_admissao: { label: "Data de Admissão", icon: CalendarDays, format: formatDateBR },
  data_demissao: { label: "Data de Demissão", icon: CalendarDays, format: formatDateBR },
  salario_mensal: { label: "Salário Mensal", icon: DollarSign, format: (v) => { const n = parseFloat(v.replace(/[^\d.,\-]/g, "").replace(",", ".")); return isNaN(n) ? v : formatCurrency(n); } },
  salario_base: { label: "Salário Base", icon: DollarSign, format: (v) => { const n = parseFloat(v.replace(/[^\d.,\-]/g, "").replace(",", ".")); return isNaN(n) ? v : formatCurrency(n); } },
  cargo: { label: "Cargo / Função", icon: Briefcase, format: (v) => v },
  funcao: { label: "Função", icon: Briefcase, format: (v) => v },
  jornada_contratual: { label: "Jornada Contratual", icon: Clock, format: (v) => v.includes("{") ? "44h semanais / 220h mensais" : v },
  tipo_demissao: { label: "Motivo da Rescisão", icon: Scale, format: (v) => DEMISSAO_LABELS[v] || v.replace(/_/g, " ") },
  motivo_demissao: { label: "Motivo da Rescisão", icon: Scale, format: (v) => DEMISSAO_LABELS[v] || v.replace(/_/g, " ") },
  horas_extras_mensais: { label: "Média de Horas Extras/Mês", icon: Clock, format: (v) => `${v} horas` },
  media_horas_extras: { label: "Média de Horas Extras", icon: Clock, format: (v) => `${v} horas` },
  empregador: { label: "Empregador", icon: Briefcase, format: (v) => v },
  nome_reclamante: { label: "Nome do Reclamante", icon: User, format: (v) => v },
};

// =====================================================
// TYPES
// =====================================================
interface Fact {
  id: string;
  chave: string;
  valor: string;
  tipo: string;
  confianca: number | null;
  confirmado: boolean;
}

interface AuditLineRow {
  id: string;
  linha: number;
  calculadora: string;
  competencia: string | null;
  descricao: string | null;
  formula: string | null;
  valor_bruto: number | null;
  valor_liquido: number | null;
  metadata: any;
}

interface CalculationDetailViewProps {
  caseId: string;
  facts: Fact[];
  onExecuteCalc?: () => void;
}

// =====================================================
// COMPONENT
// =====================================================
export function CalculationDetailView({ caseId, facts, onExecuteCalc }: CalculationDetailViewProps) {
  const { data: latestRun } = useQuery({
    queryKey: ["latest_calc_run", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculation_runs")
        .select("*")
        .eq("case_id", caseId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: auditLines = [] } = useQuery({
    queryKey: ["audit_lines_detail", latestRun?.id],
    queryFn: async () => {
      if (!latestRun?.id) return [];
      const { data, error } = await supabase
        .from("audit_lines")
        .select("*")
        .eq("run_id", latestRun.id)
        .order("linha", { ascending: true });
      if (error) throw error;
      return data as AuditLineRow[];
    },
    enabled: !!latestRun?.id,
  });

  if (!latestRun) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
          <Calculator className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">Nenhum cálculo executado</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Execute o cálculo para gerar o relatório completo de liquidação com memória detalhada, fundamentação jurídica e demonstrativo de valores.
        </p>
        {onExecuteCalc && (
          <Button onClick={onExecuteCalc} size="lg" className="mt-2">
            <Calculator className="mr-2 h-4 w-4" /> Executar Cálculo
          </Button>
        )}
      </div>
    );
  }

  const resultadoBruto = (latestRun.resultado_bruto as Record<string, unknown>) || {};
  const resultadoLiquido = (latestRun.resultado_liquido as Record<string, unknown>) || {};
  const warnings = ((latestRun.warnings as unknown[]) || []);
  const porVerbaBruto = resultadoBruto.por_verba || {};
  const porVerbaLiquido = resultadoLiquido.por_verba || {};
  const totalBruto = resultadoBruto.total || 0;
  const totalLiquido = resultadoLiquido.total || totalBruto;
  const descontos = Math.abs(totalBruto - totalLiquido);
  
  // Merge verbas: usar bruto para créditos, líquido para descontos (INSS)
  const porVerba = { ...porVerbaBruto };
  // Se INSS está no líquido com valor negativo, exibir como desconto positivo
  if (porVerbaLiquido['INSS_DESCONTO'] && (!porVerba['INSS_DESCONTO'] || porVerba['INSS_DESCONTO'].valor === 0)) {
    porVerba['INSS_DESCONTO'] = {
      ...porVerbaLiquido['INSS_DESCONTO'],
      descricao: porVerbaLiquido['INSS_DESCONTO']?.descricao || 'Desconto INSS',
      valor: Math.abs(porVerbaLiquido['INSS_DESCONTO'].valor),
    };
  }

  // Group audit lines by calculator
  const auditByCalc: Record<string, AuditLineRow[]> = {};
  for (const line of auditLines) {
    if (!auditByCalc[line.calculadora]) auditByCalc[line.calculadora] = [];
    auditByCalc[line.calculadora].push(line);
  }

  // Build structured verba list
  const verbaEntries = Object.entries(porVerba).map(([codigo, data]: [string, any]) => {
    const fundamento = FUNDAMENTOS[codigo];
    // Match audit lines to this specific verba
    const matchedAuditLines = auditLines.filter(l => {
      if (codigo === "HORAS_EXTRAS" || codigo === "DSR_HORAS_EXTRAS") return l.calculadora === "horas_extras";
      if (["SALDO_SAL", "AVISO_PREVIO", "AVISO_PREVIO_ACORDO", "FERIAS_VENC", "FERIAS_PROP", "DECIMO_PROP", "MULTA_FGTS_40", "MULTA_FGTS_20"].includes(codigo))
        return l.calculadora === "verbas_rescisorias";
      if (codigo === "FGTS_8" || codigo === "FGTS_MULTA_40") return l.calculadora === "fgts";
      if (codigo === "REFLEXO_13") return l.calculadora === "reflexos_13";
      if (codigo === "REFLEXO_FERIAS" || codigo === "REFLEXO_FERIAS_TERCO") return l.calculadora === "reflexos_ferias";
      return l.calculadora === codigo.toLowerCase();
    });

    return {
      codigo,
      descricao: data.descricao || fundamento?.titulo || codigo,
      valor: data.valor || 0,
      fundamento,
      auditLines: matchedAuditLines,
    };
  });

  // Contract duration
  const admFact = facts.find(f => f.chave === "data_admissao");
  const demFact = facts.find(f => f.chave === "data_demissao");
  let duracaoTexto = "";
  if (admFact && demFact) {
    try {
      const a = new Date(admFact.valor);
      const d = new Date(demFact.valor);
      const diffMs = d.getTime() - a.getTime();
      const anos = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
      const meses = Math.floor((diffMs % (365.25 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000));
      duracaoTexto = `${anos > 0 ? anos + " ano(s) e " : ""}${meses} mês(es)`;
    } catch { /* ignore */ }
  }

  const executadoEm = latestRun.started_at
    ? format(new Date(latestRun.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : "—";

  // Fact display helpers
  const clientFactKeys = [
    "nome_reclamante", "empregador", "data_admissao", "data_demissao",
    "salario_mensal", "salario_base", "cargo", "funcao",
    "jornada_contratual", "tipo_demissao", "motivo_demissao",
    "horas_extras_mensais", "media_horas_extras",
  ];
  const displayFacts = clientFactKeys
    .map(key => {
      const fact = facts.find(f => f.chave === key);
      if (!fact) return null;
      const meta = FACT_LABELS[key];
      return { key, fact, meta };
    })
    .filter(Boolean) as { key: string; fact: Fact; meta: typeof FACT_LABELS[string] }[];

  const calcLabels: Record<string, string> = {
    horas_extras: "Horas Extras",
    verbas_rescisorias: "Verbas Rescisórias",
    reflexos_13: "Reflexos em 13º Salário",
    reflexos_ferias: "Reflexos em Férias",
    fgts: "FGTS",
    inss: "INSS",
    atualizacao_monetaria: "Atualização Monetária",
  };

  return (
    <div className="space-y-6">

      {/* ═══════════ CABEÇALHO DO RELATÓRIO ═══════════ */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Gavel className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold tracking-tight uppercase text-primary">
                Relatório de Liquidação Trabalhista
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Memória de cálculo com fundamentação jurídica • Gerado em {executadoEm}
            </p>
          </div>
          <Separator className="my-4" />

          {/* Dados do Vínculo */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-primary" />
              Dados do Vínculo Empregatício
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayFacts.map(({ key, fact, meta }) => {
                const Icon = meta.icon;
                return (
                  <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase text-muted-foreground font-medium">{meta.label}</div>
                      <div className="text-sm font-semibold truncate" title={fact.valor}>
                        {meta.format(fact.valor)}
                      </div>
                      {fact.confianca != null && (
                        <div className="text-[10px] text-muted-foreground">
                          OCR: {Math.round(fact.confianca * 100)}% de confiança
                          {fact.confirmado && <span className="text-[hsl(var(--success))] ml-1">✓ Confirmado</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {duracaoTexto && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-medium">Duração do Contrato</div>
                    <div className="text-sm font-semibold">{duracaoTexto}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════ QUADRO RESUMO FINANCEIRO ═══════════ */}
      <Card className="border-primary/20">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            Quadro Resumo — Demonstrativo de Valores
          </h3>

          {/* Summary Table */}
          <div className="rounded-lg border overflow-hidden mb-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Verba</TableHead>
                  <TableHead className="text-xs font-semibold">Fundamentação</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Valor (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verbaEntries.map((v, i) => (
                  <TableRow key={v.codigo} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                    <TableCell className="text-sm font-medium py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] shrink-0">{v.codigo}</Badge>
                        <span>{v.descricao}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[250px]">
                      {v.fundamento?.base_legal || "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">{formatCurrency(v.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totais */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/15 text-center">
              <div className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Total Bruto</div>
              <div className="text-xl font-bold text-primary">{formatCurrency(totalBruto)}</div>
            </div>
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/15 text-center">
              <div className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Descontos (INSS)</div>
              <div className="text-xl font-bold text-destructive">{formatCurrency(descontos)}</div>
            </div>
            <div className="p-4 rounded-lg bg-[hsl(var(--success))]/5 border border-[hsl(var(--success))]/15 text-center">
              <div className="text-[10px] uppercase text-muted-foreground font-medium mb-1">Total Líquido</div>
              <div className="text-xl font-bold text-[hsl(var(--success))]">{formatCurrency(totalLiquido)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════ AVISOS DO MOTOR ═══════════ */}
      {warnings.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-accent font-semibold text-sm mb-2">
              <AlertTriangle className="h-4 w-4" />
              Ressalvas e Observações ({warnings.length})
            </div>
            <ul className="space-y-1.5">
              {warnings.map((w: any, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ChevronRight className="h-3 w-3 mt-1 text-accent shrink-0" />
                  <div>
                    <span className="text-foreground/80">{w.mensagem || (typeof w === "string" ? w : JSON.stringify(w))}</span>
                    {w.sugestao && <span className="block text-xs text-muted-foreground mt-0.5">→ {w.sugestao}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ═══════════ MEMÓRIA DE CÁLCULO DETALHADA ═══════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Memória de Cálculo — Fundamentação e Demonstrativo
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Cada verba é apresentada com sua base legal, tese jurídica, fórmula aplicada e demonstrativo linha a linha.
          </p>
        </CardHeader>
        <CardContent>
          {verbaEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma verba calculada.</p>
          ) : (
            <Accordion type="multiple" defaultValue={verbaEntries.map(v => v.codigo)} className="space-y-4">
              {verbaEntries.map(verba => (
                <AccordionItem key={verba.codigo} value={verba.codigo} className="border rounded-lg overflow-hidden">
                  <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/30">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs">{verba.codigo}</Badge>
                        <span className="font-semibold text-sm">{verba.descricao}</span>
                      </div>
                      <span className="font-bold text-primary text-base">{formatCurrency(verba.valor)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-2">
                    <div className="space-y-4">

                      {/* Fundamentação Jurídica */}
                      {verba.fundamento && (
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Gavel className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold text-primary uppercase tracking-wide">Fundamentação Jurídica</span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <p>
                              <span className="font-semibold text-foreground">Base Legal: </span>
                              <span className="text-foreground/80">{verba.fundamento.base_legal}</span>
                            </p>
                            <p>
                              <span className="font-semibold text-foreground">Tese: </span>
                              <span className="text-foreground/80 leading-relaxed">{verba.fundamento.tese}</span>
                            </p>
                            <p className="pt-1">
                              <span className="font-semibold text-foreground">Fórmula: </span>
                              <span className="text-foreground/70 font-mono text-xs bg-muted/50 px-2 py-0.5 rounded">{verba.fundamento.formula_explicada}</span>
                            </p>
                          </div>
                        </div>
                      )}

                      {!verba.fundamento && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3" />
                          Fundamentação jurídica não catalogada para esta rubrica.
                        </div>
                      )}

                      {/* Demonstrativo (audit lines) */}
                      {verba.auditLines.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Hash className="h-3 w-3" />
                            Demonstrativo de Cálculo ({verba.auditLines.length} linhas)
                          </h4>
                          <div className="rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="text-[10px] w-8">#</TableHead>
                                  <TableHead className="text-[10px]">Comp.</TableHead>
                                  <TableHead className="text-[10px]">Descrição</TableHead>
                                  <TableHead className="text-[10px]">Fórmula Aplicada</TableHead>
                                  <TableHead className="text-[10px] text-right">Valor (R$)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {verba.auditLines.map((line) => {
                                  const isTotal = (line.descricao || "").toUpperCase().startsWith("TOTAL");
                                  return (
                                    <TableRow key={line.id} className={isTotal ? "bg-muted/40 font-semibold" : "text-xs"}>
                                      <TableCell className="text-muted-foreground text-[10px]">{line.linha}</TableCell>
                                      <TableCell className="font-mono text-[10px]">{line.competencia || "—"}</TableCell>
                                      <TableCell className="text-xs">{line.descricao || "—"}</TableCell>
                                      <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[200px]" title={line.formula || undefined}>
                                        {line.formula || "—"}
                                      </TableCell>
                                      <TableCell className={`text-right text-xs ${isTotal ? "font-bold text-primary" : "font-medium"}`}>
                                        {formatCurrency(line.valor_bruto)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      {verba.auditLines.length === 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2 p-3 rounded-lg bg-muted/20">
                          <FileText className="h-3 w-3" />
                          Detalhamento disponível na trilha de auditoria completa abaixo.
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* ═══════════ TRILHA DE AUDITORIA COMPLETA ═══════════ */}
      {Object.keys(auditByCalc).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Trilha de Auditoria Completa
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Registro integral de todas as operações realizadas pelo motor de cálculo, agrupado por módulo.
            </p>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="space-y-2">
              {Object.entries(auditByCalc).map(([calc, lines]) => {
                const calcFundamento = FUNDAMENTOS[calc];
                const calcTotal = lines.reduce((sum, l) => {
                  const isTotal = (l.descricao || "").toUpperCase().startsWith("TOTAL");
                  return isTotal ? (l.valor_bruto || 0) : sum;
                }, 0);

                return (
                  <AccordionItem key={calc} value={calc} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline text-sm">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-xs">{calc}</Badge>
                          <span className="font-medium">{calcLabels[calc] || calc}</span>
                          <Badge variant="secondary" className="text-[10px]">{lines.length} linhas</Badge>
                        </div>
                        {calcTotal > 0 && (
                          <span className="font-semibold text-primary text-sm">{formatCurrency(calcTotal)}</span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-0">
                      {calcFundamento && (
                        <div className="p-3 rounded-md bg-primary/5 border border-primary/10 mb-3 text-xs">
                          <div className="font-semibold text-primary mb-1">{calcFundamento.base_legal}</div>
                          <p className="text-muted-foreground leading-relaxed">{calcFundamento.tese}</p>
                        </div>
                      )}
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="text-[10px] w-8">#</TableHead>
                              <TableHead className="text-[10px]">Comp.</TableHead>
                              <TableHead className="text-[10px]">Descrição</TableHead>
                              <TableHead className="text-[10px]">Fórmula</TableHead>
                              <TableHead className="text-[10px] text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lines.map((line) => {
                              const isTotal = (line.descricao || "").toUpperCase().startsWith("TOTAL");
                              return (
                                <TableRow key={line.id} className={isTotal ? "bg-muted/40" : "text-xs"}>
                                  <TableCell className="text-muted-foreground text-[10px]">{line.linha}</TableCell>
                                  <TableCell className="font-mono text-[10px]">{line.competencia || "—"}</TableCell>
                                  <TableCell className="text-xs">{line.descricao}</TableCell>
                                  <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[200px] truncate" title={line.formula || undefined}>
                                    {line.formula || "—"}
                                  </TableCell>
                                  <TableCell className={`text-right text-xs ${isTotal ? "font-bold text-primary" : ""}`}>
                                    {formatCurrency(line.valor_bruto)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
