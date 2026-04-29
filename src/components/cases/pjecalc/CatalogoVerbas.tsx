import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { fromUntyped } from "@/lib/supabase-untyped";
import { toast } from "sonner";
import { BookOpen, Search, Loader2, Zap, UserMinus, Scale, Clock, Timer, ShieldAlert, LogOut, Handshake, PackagePlus, TrendingUp, Layers, DollarSign, Calendar, MapPin, Award, Bus, Heart, Baby, MinusCircle, Coins, AlertTriangle, Moon, Users } from "lucide-react";
import { TEMPLATES_EXPRESSO, type TemplateExpresso } from "@/lib/pjecalc/templates-expresso";

// =====================================================
// CATÁLOGO OFICIAL DE VERBAS TRABALHISTAS
// =====================================================

interface VerbaCatalogo {
  nome: string;
  tipo: 'principal' | 'reflexa';
  caracteristica: 'comum' | '13_salario' | 'aviso_previo' | 'ferias';
  ocorrencia_pagamento: 'mensal' | 'dezembro' | 'periodo_aquisitivo' | 'desligamento';
  multiplicador: number;
  divisor_informado: number;
  tipo_divisor: string;
  tipo_quantidade: string;
  quantidade_informada: number;
  incidencias: { fgts: boolean; irpf: boolean; contribuicao_social: boolean; previdencia_privada: boolean; pensao_alimenticia: boolean };
  exclusoes: { faltas_justificadas: boolean; faltas_nao_justificadas: boolean; ferias_gozadas: boolean };
  categoria: string;
  descricao: string;
}

const CATALOGO: VerbaCatalogo[] = [
  // ── HORAS EXTRAS ──
  { nome: 'Horas Extras 50%', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1.5, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: true }, categoria: 'Horas Extras', descricao: 'CLT Art. 59 — adicional de 50% sobre hora normal' },
  { nome: 'Horas Extras 100%', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 2.0, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: true }, categoria: 'Horas Extras', descricao: 'CF Art. 7º, XVI — domingos e feriados' },
  { nome: 'Horas Extras 75%', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1.75, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: true }, categoria: 'Horas Extras', descricao: 'Adicional de 75% conforme CCT/ACT' },
  // ── ADICIONAIS ──
  { nome: 'Adicional Noturno', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 0.2, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: true }, categoria: 'Adicionais', descricao: 'CLT Art. 73 — 20% sobre hora noturna' },
  { nome: 'Adicional de Insalubridade', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 0.2, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Adicionais', descricao: 'CLT Art. 192 — grau médio (20%)' },
  { nome: 'Adicional de Periculosidade', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 0.3, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Adicionais', descricao: 'CLT Art. 193 — 30% sobre salário-base' },
  // ── REFLEXOS ──
  { nome: 'RSR sobre Horas Extras', tipo: 'reflexa', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 26, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Reflexos', descricao: 'Súm. 172 TST — repouso semanal remunerado' },
  { nome: 'Reflexo em 13º Salário', tipo: 'reflexa', caracteristica: '13_salario', ocorrencia_pagamento: 'dezembro', multiplicador: 1, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Reflexos', descricao: 'Reflexo das verbas deferidas no 13º' },
  { nome: 'Reflexo em Férias + 1/3', tipo: 'reflexa', caracteristica: 'ferias', ocorrencia_pagamento: 'periodo_aquisitivo', multiplicador: 1.3333, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, incidencias: { fgts: false, irpf: true, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Reflexos', descricao: 'CF Art. 7º, XVII — férias com 1/3 constitucional' },
  // ── VERBAS RESCISÓRIAS ──
  { nome: 'Saldo de Salário', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 30, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: false }, categoria: 'Rescisórias', descricao: 'CLT Art. 477 — dias trabalhados no mês da rescisão' },
  { nome: 'Aviso Prévio Indenizado', tipo: 'principal', caracteristica: 'aviso_previo', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 30, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 30, incidencias: { fgts: true, irpf: false, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Rescisórias', descricao: 'CLT Art. 487 + Lei 12.506/2011' },
  { nome: '13º Salário Proporcional', tipo: 'principal', caracteristica: '13_salario', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Rescisórias', descricao: 'Lei 4.090/62 — proporcional ao último ano' },
  { nome: 'Férias Proporcionais + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 1.3333, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, incidencias: { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Rescisórias', descricao: 'CLT Art. 146 + CF Art. 7º, XVII' },
   { nome: 'Férias Vencidas + 1/3', tipo: 'principal', caracteristica: 'ferias', ocorrencia_pagamento: 'desligamento', multiplicador: 1.3333, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, incidencias: { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Rescisórias', descricao: 'CLT Art. 137 — férias em dobro se não concedidas no prazo' },
  // ── INTERVALO ──
  { nome: 'Intervalo Intrajornada Suprimido', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1.5, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: true }, categoria: 'Intervalos', descricao: 'CLT Art. 71, §4º — natureza indenizatória (pós-Reforma)' },
  { nome: 'Intervalo Interjornadas', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1.5, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: true }, categoria: 'Intervalos', descricao: 'CLT Art. 66 — mínimo 11h entre jornadas' },
  // ── DOMINGOS E FERIADOS ──
  { nome: 'Domingos e Feriados Laborados', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 2.0, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: true }, categoria: 'Horas Extras', descricao: 'CF Art. 7º, XVI + Súm. 146 TST — pagamento em dobro' },
  // ── PARTE VARIÁVEL ──
  { nome: 'Horas Extras - Parte Variável', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1.5, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: true }, categoria: 'Horas Extras', descricao: 'HE calculadas sobre base variável (comissões/prêmios)' },
  // ── REFLEXO AVISO PRÉVIO ──
  { nome: 'Reflexo em Aviso Prévio', tipo: 'reflexa', caracteristica: 'aviso_previo', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 12, tipo_divisor: 'informado', tipo_quantidade: 'avos', quantidade_informada: 1, incidencias: { fgts: true, irpf: false, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Reflexos', descricao: 'Média das verbas deferidas no aviso prévio indenizado (Lei 12.506)' },
  // ── RSR E FERIADOS ──
  { nome: 'RSR e Feriados sobre Horas Extras', tipo: 'reflexa', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 26, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Reflexos', descricao: 'Súm. 172 TST — domingos, feriados e repousos sobre HE' },
  // ── ART. 384 CLT ──
  { nome: 'Art. 384 CLT (Intervalo Mulheres)', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1.5, divisor_informado: 220, tipo_divisor: 'carga_horaria', tipo_quantidade: 'cartao_ponto', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: true, ferias_gozadas: true }, categoria: 'Intervalos', descricao: 'Intervalo de 15 min para mulheres antes de hora extra' },
  // ── DIFERENÇAS ──
  { nome: 'Diferenças Salariais', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Diferenças', descricao: 'Diferenças de equiparação, reajuste ou reenquadramento' },
  // ── MULTA 477 ──
  { nome: 'Multa Art. 477 CLT', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'desligamento', multiplicador: 1, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, incidencias: { fgts: false, irpf: false, contribuicao_social: false, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Rescisórias', descricao: 'Multa pelo atraso no pagamento das verbas rescisórias' },
  // ── COMISSÕES E GRATIFICAÇÕES ──
  { nome: 'Campanhas de Incentivo', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Comissões', descricao: 'Verba de incentivo com valor constante mensal (PJe-Calc <Constante>)' },
  { nome: 'Gratificação', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Comissões', descricao: 'Gratificação de função ou cargo — CLT Art. 468, parágrafo único' },
  { nome: 'Comissões Estornadas', tipo: 'principal', caracteristica: 'comum', ocorrencia_pagamento: 'mensal', multiplicador: 1, divisor_informado: 1, tipo_divisor: 'informado', tipo_quantidade: 'informada', quantidade_informada: 1, incidencias: { fgts: true, irpf: true, contribuicao_social: true, previdencia_privada: false, pensao_alimenticia: false }, exclusoes: { faltas_justificadas: false, faltas_nao_justificadas: false, ferias_gozadas: false }, categoria: 'Comissões', descricao: 'Estorno indevido de comissões — Súmula 340 TST' },
];

const CATEGORIAS = [...new Set(CATALOGO.map(v => v.categoria))];

const ICON_MAP: Record<string, React.ReactNode> = {
  UserMinus: <UserMinus className="h-5 w-5" />,
  Scale: <Scale className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />,
  Timer: <Timer className="h-5 w-5" />,
  ShieldAlert: <ShieldAlert className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  LogOut: <LogOut className="h-5 w-5" />,
  Handshake: <Handshake className="h-5 w-5" />,
  TrendingUp: <TrendingUp className="h-5 w-5" />,
  Layers: <Layers className="h-5 w-5" />,
  DollarSign: <DollarSign className="h-5 w-5" />,
  Calendar: <Calendar className="h-5 w-5" />,
  MapPin: <MapPin className="h-5 w-5" />,
  Award: <Award className="h-5 w-5" />,
  Bus: <Bus className="h-5 w-5" />,
  Heart: <Heart className="h-5 w-5" />,
  Baby: <Baby className="h-5 w-5" />,
  MinusCircle: <MinusCircle className="h-5 w-5" />,
  Coins: <Coins className="h-5 w-5" />,
  AlertTriangle: <AlertTriangle className="h-5 w-5" />,
  Moon: <Moon className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
};

const CAT_COLORS: Record<string, string> = {
  rescisao: 'border-destructive/30 bg-destructive/5',
  horas_extras: 'border-primary/30 bg-primary/5',
  adicionais: 'border-accent/30 bg-accent/5',
  misto: 'border-secondary/30 bg-secondary/5',
};

interface Props {
  caseId: string;
  periodoInicio: string;
  periodoFim: string;
  ordemBase: number;
  onInsert: () => void;
}

export function CatalogoVerbas({ caseId, periodoInicio, periodoFim, ordemBase, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [inserting, setInserting] = useState(false);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [tab, setTab] = useState<'catalogo' | 'templates'>('templates');

  const filtered = CATALOGO.filter(v => {
    if (catFilter && v.categoria !== catFilter) return false;
    if (search && !v.nome.toLowerCase().includes(search.toLowerCase()) && !v.descricao.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggle = (idx: number) => {
    const realIdx = CATALOGO.indexOf(filtered[idx]);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(realIdx)) next.delete(realIdx); else next.add(realIdx);
      return next;
    });
  };

  const inserir = async () => {
    if (selected.size === 0) return;
    setInserting(true);
    try {
      let ordem = ordemBase;
      for (const idx of selected) {
        const v = CATALOGO[idx];
        await fromUntyped("pjecalc_verbas").insert({
          case_id: caseId,
          nome: v.nome,
          tipo: v.tipo,
          caracteristica: v.caracteristica,
          ocorrencia_pagamento: v.ocorrencia_pagamento,
          multiplicador: v.multiplicador,
          divisor_informado: v.divisor_informado,
          tipo_divisor: v.tipo_divisor,
          tipo_quantidade: v.tipo_quantidade,
          quantidade_informada: v.quantidade_informada,
          incidencias: v.incidencias,
          exclusoes: v.exclusoes,
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          ordem: ordem++,
        });
      }
      toast.success(`${selected.size} verba(s) adicionada(s) do catálogo`);
      setSelected(new Set());
      setOpen(false);
      onInsert();
    } catch (e) { toast.error((e as Error).message); }
    finally { setInserting(false); }
  };

  const inserirTemplate = async (template: TemplateExpresso) => {
    setInserting(true);
    try {
      let ordem = ordemBase;
      for (const v of template.verbas) {
        await fromUntyped("pjecalc_verbas").insert({
          case_id: caseId,
          nome: v.nome,
          tipo: v.tipo,
          caracteristica: v.caracteristica,
          ocorrencia_pagamento: v.ocorrencia_pagamento,
          multiplicador: v.multiplicador,
          divisor_informado: v.divisor_informado,
          tipo_divisor: v.tipo_divisor,
          tipo_quantidade: v.tipo_quantidade,
          quantidade_informada: v.quantidade_informada,
          compor_principal: v.compor_principal,
          incidencias: v.incidencias,
          exclusoes: v.exclusoes,
          ...(v.base_calculo ? { base_calculo: v.base_calculo } : {}),
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          ordem: ordem++,
        });
      }
      toast.success(`Template "${template.nome}" inserido — ${template.verbas.length} verba(s)`);
      setOpen(false);
      onInsert();
    } catch (e) { toast.error((e as Error).message); }
    finally { setInserting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <BookOpen className="h-4 w-4 mr-1" /> Catálogo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Catálogo de Verbas Trabalhistas
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates" className="text-xs">
              <PackagePlus className="h-3.5 w-3.5 mr-1" /> Lançamento Expresso
            </TabsTrigger>
            <TabsTrigger value="catalogo" className="text-xs">
              <BookOpen className="h-3.5 w-3.5 mr-1" /> Catálogo Individual
            </TabsTrigger>
          </TabsList>

          {/* ── TEMPLATES EXPRESSO ── */}
          <TabsContent value="templates" className="mt-3">
            <p className="text-xs text-muted-foreground mb-3">
              Selecione um template para inserir automaticamente todas as verbas configuradas.
            </p>
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2 pr-3">
                {TEMPLATES_EXPRESSO.map(tmpl => (
                  <Card
                    key={tmpl.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${CAT_COLORS[tmpl.categoria] || ''}`}
                    onClick={() => !inserting && inserirTemplate(tmpl)}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="mt-0.5 text-muted-foreground">
                        {ICON_MAP[tmpl.icone] || <PackagePlus className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{tmpl.nome}</span>
                          <Badge variant="outline" className="text-[9px]">{tmpl.verbas.length} verbas</Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">{tmpl.descricao}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tmpl.verbas.map((v, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px] font-normal">{v.nome}</Badge>
                          ))}
                        </div>
                      </div>
                      {inserting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── CATÁLOGO INDIVIDUAL ── */}
          <TabsContent value="catalogo" className="mt-3">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar verba..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
                </div>
                <Button size="sm" disabled={selected.size === 0 || inserting} onClick={inserir}>
                  {inserting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Adicionar ({selected.size})
                </Button>
              </div>
              <div className="flex gap-1 flex-wrap">
                <Badge variant={catFilter === null ? 'default' : 'outline'} className="text-[10px] cursor-pointer" onClick={() => setCatFilter(null)}>Todas</Badge>
                {CATEGORIAS.map(c => (
                  <Badge key={c} variant={catFilter === c ? 'default' : 'outline'} className="text-[10px] cursor-pointer" onClick={() => setCatFilter(c === catFilter ? null : c)}>{c}</Badge>
                ))}
              </div>
              <ScrollArea className="h-[50vh]">
                <div className="space-y-1.5 pr-3">
                  {filtered.map((v, idx) => {
                    const realIdx = CATALOGO.indexOf(v);
                    const isSelected = selected.has(realIdx);
                    return (
                      <Card key={idx} className={`cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/30'}`} onClick={() => toggle(idx)}>
                        <CardContent className="p-3 flex items-start gap-3">
                          <Checkbox checked={isSelected} className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{v.nome}</span>
                              <Badge variant={v.tipo === 'principal' ? 'default' : 'secondary'} className="text-[9px]">{v.tipo === 'principal' ? 'P' : 'R'}</Badge>
                              <Badge variant="outline" className="text-[9px]">{v.categoria}</Badge>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{v.descricao}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-3">
                              <span>×{v.multiplicador} ÷{v.divisor_informado}</span>
                              <span>{v.ocorrencia_pagamento}</span>
                              {v.incidencias.fgts && <span className="text-primary">FGTS</span>}
                              {v.incidencias.contribuicao_social && <span className="text-primary">CS</span>}
                              {v.incidencias.irpf && <span className="text-primary">IR</span>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
