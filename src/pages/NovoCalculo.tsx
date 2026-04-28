import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MainLayoutPremium } from "@/components/layout/MainLayoutPremium";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ChevronRight, ChevronLeft, Check, FileText, Calendar, Clock,
  Shield, Scale, Calculator, AlertTriangle, Plus, Trash2, Loader2,
} from "lucide-react";

// =====================================================
// WIZARD STEPS
// =====================================================

const STEPS = [
  { id: 'contrato', label: 'Contrato', icon: FileText, desc: 'Tipo de contrato e localização' },
  { id: 'periodos', label: 'Períodos', icon: Calendar, desc: 'Datas e salários' },
  { id: 'jornada', label: 'Jornada', icon: Clock, desc: 'Divisor, extras e noturno' },
  { id: 'adicionais', label: 'Adicionais', icon: Shield, desc: 'Periculosidade e insalubridade' },
  { id: 'teses', label: 'Teses', icon: Scale, desc: 'Controvérsias e opções' },
  { id: 'calcular', label: 'Calcular', icon: Calculator, desc: 'Gerar resultado' },
];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function NovoCalculo() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Contrato
  const [tipoContrato, setTipoContrato] = useState('clt');
  const [categoria, setCategoria] = useState('urbano');
  const [uf, setUf] = useState('');
  const [cidade, setCidade] = useState('');
  const [cctAct, setCctAct] = useState('');
  const [clienteNome, setClienteNome] = useState('');

  // Step 2: Períodos
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [dataDemissao, setDataDemissao] = useState('');
  const [tipoDemissao, setTipoDemissao] = useState('sem_justa_causa');
  const [ajuizamentoData, setAjuizamentoData] = useState('');
  const [salarioInicial, setSalarioInicial] = useState('');
  const [mudancasSalariais, setMudancasSalariais] = useState<{data: string; valor: string}[]>([]);

  // Step 3: Jornada
  const [divisor, setDivisor] = useState('220');
  const [horasSemanais, setHorasSemanais] = useState('44');
  const [eventosExtras, setEventosExtras] = useState<{
    competencia: string; horas_50: string; horas_100: string; horas_noturnas: string;
  }[]>([]);

  // Step 4: Adicionais
  const [periculosidade, setPericulosidade] = useState(false);
  const [pericInicio, setPericInicio] = useState('');
  const [pericFim, setPericFim] = useState('');
  const [insalubridade, setInsalubridade] = useState(false);
  const [insalubGrau, setInsalubGrau] = useState('minimo');
  const [insalubBase, setInsalubBase] = useState('salario_minimo');
  const [insalubInicio, setInsalubInicio] = useState('');
  const [insalubFim, setInsalubFim] = useState('');

  // Step 5: Teses
  const [indiceCorrecao, setIndiceCorrecao] = useState('selic');
  const [juros, setJuros] = useState('selic');
  const [multa467, setMulta467] = useState(false);
  const [multa477, setMulta477] = useState(false);

  // Load legal rules for controversy display
  const { data: legalRules = [] } = useQuery({
    queryKey: ['legal_rules_controversias'],
    queryFn: async () => {
      const { data } = await supabase
        .from('legal_rules')
        .select('*')
        .eq('flag_controversia', true)
        .eq('ativo', true);
      return data || [];
    },
  });

  // Validations per step
  const stepValidations = [
    () => !!clienteNome && !!tipoContrato && !!categoria,
    () => !!dataAdmissao && !!dataDemissao && !!salarioInicial && parseFloat(salarioInicial) > 0,
    () => parseInt(divisor) > 0 && parseInt(horasSemanais) > 0,
    () => true,
    () => true,
    () => true,
  ];

  const canProceed = stepValidations[currentStep]();

  const addMudancaSalarial = () => {
    setMudancasSalariais(prev => [...prev, { data: '', valor: '' }]);
  };

  const addEventoExtra = () => {
    setEventosExtras(prev => [...prev, { competencia: '', horas_50: '0', horas_100: '0', horas_noturnas: '0' }]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // 1. Criar caso
      const { data: caso, error: caseErr } = await supabase
        .from('cases')
        .insert({
          cliente: clienteNome,
          criado_por: user.id,
          status: 'em_analise',
        })
        .select()
        .single();
      if (caseErr || !caso) throw caseErr || new Error('Falha ao criar caso');

      // 2. Criar calculation_case
      await supabase.from('calculation_cases').insert({
        case_id: caso.id,
        tipo_contrato: tipoContrato,
        categoria,
        uf: uf || null,
        cidade: cidade || null,
        cct_act: cctAct || null,
        ajuizamento_data: ajuizamentoData || null,
        periodo_inicio: dataAdmissao,
        periodo_fim: dataDemissao,
      });

      // 3. Criar contrato de emprego
      await supabase.from('employment_contracts').insert({
        case_id: caso.id,
        data_admissao: dataAdmissao,
        data_demissao: dataDemissao,
        tipo_demissao: tipoDemissao as any,
        salario_inicial: parseFloat(salarioInicial),
        historico_salarial: mudancasSalariais
          .filter(m => m.data && m.valor)
          .map(m => ({ data: m.data, valor: parseFloat(m.valor) })),
        jornada_contratual: {
          divisor: parseInt(divisor),
          horas_semanais: parseInt(horasSemanais),
        },
      });

      // 4. Criar fatos obrigatórios
      const factsToInsert = [
        { chave: 'data_admissao', valor: dataAdmissao, tipo: 'data' as const },
        { chave: 'data_demissao', valor: dataDemissao, tipo: 'data' as const },
        { chave: 'salario_base', valor: salarioInicial, tipo: 'moeda' as const },
        { chave: 'salario_mensal', valor: salarioInicial, tipo: 'moeda' as const },
        { chave: 'jornada_contratual', valor: `${horasSemanais}h/${divisor}`, tipo: 'texto' as const },
        { chave: 'tipo_demissao', valor: tipoDemissao, tipo: 'texto' as const },
      ];

      await supabase.from('facts').insert(
        factsToInsert.map(f => ({
          case_id: caso.id,
          chave: f.chave,
          valor: f.valor,
          tipo: f.tipo,
          origem: 'usuario' as const,
          confirmado: true,
          confianca: 1.0,
        }))
      );

      // 5. Inserir eventos de jornada como case_inputs
      if (eventosExtras.length > 0) {
        const inputs = eventosExtras
          .filter(e => e.competencia)
          .flatMap(e => {
            const items: any[] = [];
            if (parseFloat(e.horas_50) > 0) {
              items.push({
                case_id: caso.id,
                tipo_evento: 'horas_extras_50',
                data_inicio: e.competencia + '-01',
                valor: null,
                quantidade: parseFloat(e.horas_50),
                metadata_json: { competencia: e.competencia },
              });
            }
            if (parseFloat(e.horas_100) > 0) {
              items.push({
                case_id: caso.id,
                tipo_evento: 'horas_extras_100',
                data_inicio: e.competencia + '-01',
                valor: null,
                quantidade: parseFloat(e.horas_100),
                metadata_json: { competencia: e.competencia },
              });
            }
            if (parseFloat(e.horas_noturnas) > 0) {
              items.push({
                case_id: caso.id,
                tipo_evento: 'adicional_noturno',
                data_inicio: e.competencia + '-01',
                valor: null,
                quantidade: parseFloat(e.horas_noturnas),
                metadata_json: { competencia: e.competencia },
              });
            }
            return items;
          });

        if (inputs.length > 0) {
          await supabase.from('case_inputs').insert(inputs);
        }
      }

      // 6. Inserir adicionais
      if (periculosidade && pericInicio) {
        await supabase.from('case_inputs').insert({
          case_id: caso.id,
          tipo_evento: 'adicional_periculosidade',
          data_inicio: pericInicio,
          data_fim: pericFim || null,
          metadata_json: { percentual: 0.3 },
        });
      }
      if (insalubridade && insalubInicio) {
        await supabase.from('case_inputs').insert({
          case_id: caso.id,
          tipo_evento: 'adicional_insalubridade',
          data_inicio: insalubInicio,
          data_fim: insalubFim || null,
          metadata_json: { grau: insalubGrau, base: insalubBase },
        });
      }

      toast.success('Caso criado com sucesso! Redirecionando...');
      navigate(`/casos/${caso.id}`);
    } catch (err) {
      logger.error("NovoCalculo handler error", { error: String(err) });
      toast.error('Erro ao criar caso: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================================
  // RENDER STEPS
  // =====================================================

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Contrato
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Nome do Cliente / Reclamante *</Label>
              <Input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Ex: João da Silva" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Tipo de Contrato *</Label>
                <Select value={tipoContrato} onValueChange={setTipoContrato}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clt">CLT</SelectItem>
                    <SelectItem value="domestico">Doméstico</SelectItem>
                    <SelectItem value="rural">Rural</SelectItem>
                    <SelectItem value="aprendiz">Aprendiz</SelectItem>
                    <SelectItem value="intermitente">Intermitente</SelectItem>
                    <SelectItem value="temporario">Temporário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Categoria *</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urbano">Urbano</SelectItem>
                    <SelectItem value="rural">Rural</SelectItem>
                    <SelectItem value="domestico">Doméstico</SelectItem>
                    <SelectItem value="intermitente">Intermitente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">UF</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Cidade</Label>
                <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: São Paulo" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">CCT/ACT (se aplicável)</Label>
              <Input value={cctAct} onChange={e => setCctAct(e.target.value)} placeholder="Ex: Sindicato dos Metalúrgicos - SP" className="mt-1" />
            </div>
          </div>
        );

      case 1: // Períodos
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Data de Admissão *</Label>
                <Input type="date" value={dataAdmissao} onChange={e => setDataAdmissao(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Data de Demissão *</Label>
                <Input type="date" value={dataDemissao} onChange={e => setDataDemissao(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Tipo de Demissão *</Label>
                <Select value={tipoDemissao} onValueChange={setTipoDemissao}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem_justa_causa">Sem Justa Causa</SelectItem>
                    <SelectItem value="justa_causa">Justa Causa</SelectItem>
                    <SelectItem value="pedido_demissao">Pedido de Demissão</SelectItem>
                    <SelectItem value="rescisao_indireta">Rescisão Indireta</SelectItem>
                    <SelectItem value="acordo">Acordo (art. 484-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Data do Ajuizamento</Label>
                <Input type="date" value={ajuizamentoData} onChange={e => setAjuizamentoData(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Salário Inicial (R$) *</Label>
              <Input type="number" step="0.01" value={salarioInicial} onChange={e => setSalarioInicial(e.target.value)} placeholder="0,00" className="mt-1" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Mudanças Salariais</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMudancaSalarial}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
              {mudancasSalariais.map((m, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input type="date" value={m.data} onChange={e => {
                    const copy = [...mudancasSalariais];
                    copy[i].data = e.target.value;
                    setMudancasSalariais(copy);
                  }} className="flex-1" />
                  <Input type="number" step="0.01" value={m.valor} onChange={e => {
                    const copy = [...mudancasSalariais];
                    copy[i].valor = e.target.value;
                    setMudancasSalariais(copy);
                  }} placeholder="Novo salário" className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => setMudancasSalariais(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );

      case 2: // Jornada
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Divisor *</Label>
                <Select value={divisor} onValueChange={setDivisor}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="220">220h (44h/sem)</SelectItem>
                    <SelectItem value="200">200h (40h/sem)</SelectItem>
                    <SelectItem value="180">180h (36h/sem)</SelectItem>
                    <SelectItem value="150">150h (30h/sem)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Horas Semanais *</Label>
                <Input type="number" value={horasSemanais} onChange={e => setHorasSemanais(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Eventos de Jornada (Horas Extras / Noturno por mês)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEventoExtra}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Mês
                </Button>
              </div>
              {eventosExtras.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center border rounded-md border-dashed">
                  Nenhum evento de jornada registrado. Clique em "Adicionar Mês" para inserir horas extras ou noturno.
                </p>
              )}
              {eventosExtras.map((e, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end">
                  <div>
                    <Label className="text-xs">Competência</Label>
                    <Input type="month" value={e.competencia} onChange={ev => {
                      const copy = [...eventosExtras];
                      copy[i].competencia = ev.target.value;
                      setEventosExtras(copy);
                    }} />
                  </div>
                  <div>
                    <Label className="text-xs">HE 50%</Label>
                    <Input type="number" step="0.5" value={e.horas_50} onChange={ev => {
                      const copy = [...eventosExtras];
                      copy[i].horas_50 = ev.target.value;
                      setEventosExtras(copy);
                    }} />
                  </div>
                  <div>
                    <Label className="text-xs">HE 100%</Label>
                    <Input type="number" step="0.5" value={e.horas_100} onChange={ev => {
                      const copy = [...eventosExtras];
                      copy[i].horas_100 = ev.target.value;
                      setEventosExtras(copy);
                    }} />
                  </div>
                  <div>
                    <Label className="text-xs">Noturno</Label>
                    <Input type="number" step="0.5" value={e.horas_noturnas} onChange={ev => {
                      const copy = [...eventosExtras];
                      copy[i].horas_noturnas = ev.target.value;
                      setEventosExtras(copy);
                    }} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEventosExtras(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );

      case 3: // Adicionais
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Checkbox checked={periculosidade} onCheckedChange={v => setPericulosidade(!!v)} />
                  <div>
                    <CardTitle className="text-base">Adicional de Periculosidade (30%)</CardTitle>
                    <CardDescription>CLT art. 193 + NR-16</CardDescription>
                  </div>
                </div>
              </CardHeader>
              {periculosidade && (
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Período Início</Label>
                    <Input type="date" value={pericInicio} onChange={e => setPericInicio(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Período Fim</Label>
                    <Input type="date" value={pericFim} onChange={e => setPericFim(e.target.value)} className="mt-1" />
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Checkbox checked={insalubridade} onCheckedChange={v => setInsalubridade(!!v)} />
                  <div>
                    <CardTitle className="text-base">Adicional de Insalubridade</CardTitle>
                    <CardDescription>CLT art. 192 + NR-15</CardDescription>
                  </div>
                </div>
              </CardHeader>
              {insalubridade && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Grau</Label>
                      <Select value={insalubGrau} onValueChange={setInsalubGrau}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimo">Mínimo (10%)</SelectItem>
                          <SelectItem value="medio">Médio (20%)</SelectItem>
                          <SelectItem value="maximo">Máximo (40%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Base de Cálculo</Label>
                      <Select value={insalubBase} onValueChange={setInsalubBase}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="salario_minimo">Salário Mínimo (SV 4, STF)</SelectItem>
                          <SelectItem value="salario_base">Salário Base</SelectItem>
                          <SelectItem value="instrumento_coletivo">Instrumento Coletivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Período Início</Label>
                      <Input type="date" value={insalubInicio} onChange={e => setInsalubInicio(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm">Período Fim</Label>
                      <Input type="date" value={insalubFim} onChange={e => setInsalubFim(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                  {insalubBase === 'salario_minimo' && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">
                        <strong>Controvérsia:</strong> STF Súmula Vinculante 4 proíbe uso do SM como indexador, 
                        mas TST Súmula 228 foi cancelada. Enquanto não editada lei ou norma coletiva, 
                        mantém-se o SM como base (decisão pragmática da maioria dos TRTs).
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        );

      case 4: // Teses
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Atualização Monetária e Juros</CardTitle>
                <CardDescription>STF ADC 58/59 - Marco temporal para aplicação da SELIC</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Índice de Correção</Label>
                  <Select value={indiceCorrecao} onValueChange={setIndiceCorrecao}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="selic">SELIC (ADC 58/59 STF)</SelectItem>
                      <SelectItem value="ipca_e">IPCA-E (fase pré-judicial)</SelectItem>
                      <SelectItem value="tr">TR (posição superada)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Juros Moratórios</Label>
                  <Select value={juros} onValueChange={setJuros}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="selic">Embutidos na SELIC (ADC 58/59)</SelectItem>
                      <SelectItem value="1_am">1% ao mês (art. 883 CLT)</SelectItem>
                      <SelectItem value="nenhum">Nenhum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Multas Opcionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox checked={multa467} onCheckedChange={v => setMulta467(!!v)} />
                  <div>
                    <p className="text-sm font-medium">Multa art. 467 CLT</p>
                    <p className="text-xs text-muted-foreground">50% sobre verbas incontroversas não pagas em audiência</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox checked={multa477} onCheckedChange={v => setMulta477(!!v)} />
                  <div>
                    <p className="text-sm font-medium">Multa art. 477, §8º CLT</p>
                    <p className="text-xs text-muted-foreground">1 salário por atraso no pagamento das verbas rescisórias</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {legalRules.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Controvérsias Identificadas</CardTitle>
                  <CardDescription>Temas com divergência jurisprudencial</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {legalRules.map((rule: any) => (
                    <div key={rule.id} className="bg-muted/50 rounded-md p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{rule.jurisdicao}</Badge>
                        <span className="text-sm font-medium">{rule.titulo}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{rule.descricao}</p>
                      {rule.referencia && (
                        <p className="text-xs text-primary mt-1">📎 {rule.referencia}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 5: // Resumo e Calcular
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo do Cálculo</CardTitle>
                <CardDescription>Confirme os dados antes de gerar o cálculo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  <div><span className="text-muted-foreground">Cliente:</span> <strong>{clienteNome}</strong></div>
                  <div><span className="text-muted-foreground">Contrato:</span> <strong>{tipoContrato.toUpperCase()}</strong></div>
                  <div><span className="text-muted-foreground">Admissão:</span> <strong>{dataAdmissao}</strong></div>
                  <div><span className="text-muted-foreground">Demissão:</span> <strong>{dataDemissao}</strong></div>
                  <div><span className="text-muted-foreground">Tipo:</span> <strong>{tipoDemissao.replace(/_/g, ' ')}</strong></div>
                  <div><span className="text-muted-foreground">Salário:</span> <strong>R$ {parseFloat(salarioInicial || '0').toFixed(2)}</strong></div>
                  <div><span className="text-muted-foreground">Divisor:</span> <strong>{divisor}h</strong></div>
                  <div><span className="text-muted-foreground">Correção:</span> <strong>{indiceCorrecao.toUpperCase()}</strong></div>
                  {periculosidade && <div><Badge>Periculosidade 30%</Badge></div>}
                  {insalubridade && <div><Badge>Insalubridade {insalubGrau}</Badge></div>}
                  {multa467 && <div><Badge variant="secondary">Multa 467</Badge></div>}
                  {multa477 && <div><Badge variant="secondary">Multa 477</Badge></div>}
                </div>
                {eventosExtras.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-muted-foreground mb-1">Eventos de jornada: {eventosExtras.length} mês(es)</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              className="w-full h-12 text-base"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Criando caso e calculando...</>
              ) : (
                <><Calculator className="h-5 w-5 mr-2" /> Gerar Cálculo</>
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MainLayoutPremium breadcrumbs={[{ label: 'Casos', href: '/casos' }, { label: 'Novo Cálculo' }]}>
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Step Indicator */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isCompleted = i < currentStep;
            const isCurrent = i === currentStep;
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => i <= currentStep && setCurrentStep(i)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm whitespace-nowrap",
                    isCurrent && "bg-primary text-primary-foreground",
                    isCompleted && "bg-primary/10 text-primary cursor-pointer",
                    !isCurrent && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep].label}</CardTitle>
            <CardDescription>{STEPS[currentStep].desc}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        {currentStep < 5 && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}
              disabled={!canProceed}
            >
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </MainLayoutPremium>
  );
}
