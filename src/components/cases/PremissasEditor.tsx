import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Settings2,
  Calculator,
  Clock,
  Calendar,
  Percent,
  Scale,
  AlertTriangle,
  Check,
  Save,
  RotateCcw,
  BookOpen,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type PremissasCasoConfig,
  type PremissaMetodoHE,
  type PremissaDSR,
  type PremissaCorrecao,
  type PremissaJuros,
  type PremissaMedia,
  type PremissaBaseCalculo,
  type PremissaPrescricao,
  type TipoDemissao,
  PREMISSAS_TRT3_PADRAO,
  validarPremissasCompletas,
  gerarHashConfig,
} from "@/lib/calculation/premissas-juridicas";
import { toast } from "sonner";

interface PremissasEditorProps {
  caseId: string;
  initialConfig?: Partial<PremissasCasoConfig>;
  onSave?: (config: PremissasCasoConfig) => void;
  onConfirm?: (config: PremissasCasoConfig) => void;
  readOnly?: boolean;
}

export function PremissasEditor({
  caseId,
  initialConfig,
  onSave,
  onConfirm,
  readOnly = false,
}: PremissasEditorProps) {
  const [config, setConfig] = useState<PremissasCasoConfig>(() => ({
    id: crypto.randomUUID(),
    caseId,
    versao: 1,
    criadoEm: new Date().toISOString(),
    criadoPor: "",
    status: "rascunho",
    ...PREMISSAS_TRT3_PADRAO,
    ...initialConfig,
  }));

  const validacao = validarPremissasCompletas(config);

  const handleSave = () => {
    const hash = gerarHashConfig(config);
    const updated = { ...config, hashConfig: hash };
    setConfig(updated);
    onSave?.(updated);
    toast.success("Premissas salvas com sucesso!");
  };

  const handleConfirm = () => {
    if (!validacao.valido) {
      toast.error("Corrija os erros antes de confirmar as premissas.");
      return;
    }
    
    const hash = gerarHashConfig(config);
    const updated = { ...config, hashConfig: hash, status: "confirmado" as const };
    setConfig(updated);
    onConfirm?.(updated);
    toast.success("Premissas confirmadas e travadas!");
  };

  const handleReset = () => {
    setConfig({
      ...config,
      ...PREMISSAS_TRT3_PADRAO,
    });
    toast.info("Premissas restauradas para o padrão TRT-3");
  };

  const updateDivisor = (valor: string) => {
    setConfig({
      ...config,
      divisor: {
        ...config.divisor,
        valor: valor as "220" | "200" | "180" | "150" | "custom",
      },
    });
  };

  const isLocked = config.status === "travado" || config.status === "confirmado";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
              <Settings2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Premissas Jurídicas</h2>
              <p className="text-sm text-muted-foreground">
                Configure os parâmetros de cálculo antes de executar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant={config.status === "confirmado" ? "default" : "secondary"}
              className={cn(
                "px-3 py-1",
                config.status === "confirmado" && "bg-green-500"
              )}
            >
              {config.status === "rascunho" ? "Rascunho" : 
               config.status === "confirmado" ? "Confirmado" : "Travado"}
            </Badge>
            {config.hashConfig && (
              <Badge variant="outline" className="font-mono text-xs">
                #{config.hashConfig}
              </Badge>
            )}
          </div>
        </div>

        {/* Validation Status */}
        {(validacao.erros.length > 0 || validacao.alertas.length > 0) && (
          <div className="mt-4 space-y-2">
            {validacao.erros.map((erro, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                {erro}
              </div>
            ))}
            {validacao.alertas.map((alerta, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                {alerta}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Premissas Sections */}
      <Accordion type="multiple" defaultValue={["jornada", "rescisao", "atualizacao"]} className="space-y-4">
        {/* Jornada e Horas Extras */}
        <AccordionItem value="jornada" className="glass-card rounded-xl border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-semibold">Jornada e Horas Extras</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Divisor */}
              <div className="space-y-2">
                <Label className="font-medium">Divisor</Label>
                <Select 
                  value={config.divisor.valor} 
                  onValueChange={updateDivisor}
                  disabled={isLocked || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="220">220 (44h/semana)</SelectItem>
                    <SelectItem value="200">200 (40h/semana)</SelectItem>
                    <SelectItem value="180">180 (36h/semana)</SelectItem>
                    <SelectItem value="150">150 (30h/semana)</SelectItem>
                    <SelectItem value="custom">Customizado</SelectItem>
                  </SelectContent>
                </Select>
                {config.divisor.valor === "custom" && (
                  <Input
                    type="number"
                    placeholder="Digite o divisor"
                    value={config.divisor.valorCustom || ""}
                    onChange={(e) => setConfig({
                      ...config,
                      divisor: { ...config.divisor, valorCustom: Number(e.target.value) }
                    })}
                    disabled={isLocked || readOnly}
                  />
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {config.divisor.fundamentacaoLegal}
                </p>
              </div>

              {/* Método HE */}
              <div className="space-y-2">
                <Label className="font-medium">Método de Apuração de HE</Label>
                <Select 
                  value={config.metodoHE.valor}
                  onValueChange={(v) => setConfig({
                    ...config,
                    metodoHE: { ...config.metodoHE, valor: v as PremissaMetodoHE['valor'] }
                  })}
                  disabled={isLocked || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diaria">Diária ({">"} 8h/dia)</SelectItem>
                    <SelectItem value="semanal">Semanal ({">"} 44h/semana)</SelectItem>
                    <SelectItem value="hibrida">Híbrida (ambos)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {config.metodoHE.fundamentacaoLegal}
                </p>
              </div>

              {/* DSR */}
              <div className="space-y-2">
                <Label className="font-medium">Método de DSR sobre Variáveis</Label>
                <Select 
                  value={config.dsr.metodo}
                  onValueChange={(v) => setConfig({
                    ...config,
                    dsr: { ...config.dsr, metodo: v as PremissaDSR['metodo'] }
                  })}
                  disabled={isLocked || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calendario">Calendário (dias úteis/DSR)</SelectItem>
                    <SelectItem value="fator_fixo">Fator Fixo (1/6)</SelectItem>
                  </SelectContent>
                </Select>
                {config.dsr.metodo === "fator_fixo" && (
                  <Input
                    type="number"
                    placeholder="Fator (ex: 6 para 1/6)"
                    value={config.dsr.fatorFixo || 6}
                    onChange={(e) => setConfig({
                      ...config,
                      dsr: { ...config.dsr, fatorFixo: Number(e.target.value) }
                    })}
                    disabled={isLocked || readOnly}
                  />
                )}
              </div>

              {/* Hora Noturna */}
              <div className="space-y-2">
                <Label className="font-medium">Hora Noturna Reduzida</Label>
                <div className="flex items-center gap-4">
                  <Switch
                    checked={config.horaNoturna.reducaoAtiva}
                    onCheckedChange={(v) => setConfig({
                      ...config,
                      horaNoturna: { ...config.horaNoturna, reducaoAtiva: v }
                    })}
                    disabled={isLocked || readOnly}
                  />
                  <span className="text-sm text-muted-foreground">
                    {config.horaNoturna.reducaoAtiva ? "52min30seg" : "60min"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Label className="text-sm">Adicional Noturno:</Label>
                  <Input
                    type="number"
                    className="w-20"
                    value={config.horaNoturna.adicionalNoturno}
                    onChange={(e) => setConfig({
                      ...config,
                      horaNoturna: { ...config.horaNoturna, adicionalNoturno: Number(e.target.value) }
                    })}
                    disabled={isLocked || readOnly}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>

              {/* Média de Horas Extras */}
              <div className="space-y-2">
                <Label className="font-medium">Média de Horas Extras Mensais</Label>
                <Input
                  type="number"
                  placeholder="Ex: 30"
                  value={config.horasExtrasConfig?.mediaHorasExtrasMensais || 0}
                  onChange={(e) => setConfig({
                    ...config,
                    horasExtrasConfig: { 
                      ...config.horasExtrasConfig, 
                      mediaHorasExtrasMensais: Number(e.target.value) 
                    }
                  })}
                  disabled={isLocked || readOnly}
                />
                <p className="text-xs text-muted-foreground">
                  Quantidade média de horas extras realizadas por mês
                </p>
              </div>

              {/* Percentuais HE */}
              <div className="space-y-2">
                <Label className="font-medium">Adicional HE 50%</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20"
                    value={config.horasExtrasConfig?.percentualHE50 || 50}
                    onChange={(e) => setConfig({
                      ...config,
                      horasExtrasConfig: { 
                        ...config.horasExtrasConfig, 
                        percentualHE50: Number(e.target.value) 
                      }
                    })}
                    disabled={isLocked || readOnly}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Adicional HE 100%</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20"
                    value={config.horasExtrasConfig?.percentualHE100 || 100}
                    onChange={(e) => setConfig({
                      ...config,
                      horasExtrasConfig: { 
                        ...config.horasExtrasConfig, 
                        percentualHE100: Number(e.target.value) 
                      }
                    })}
                    disabled={isLocked || readOnly}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {config.horasExtrasConfig?.fundamentacaoLegal || "CLT Art. 59 e Art. 73"}
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Rescisão Contratual */}
        <AccordionItem value="rescisao" className="glass-card rounded-xl border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-primary" />
              <span className="font-semibold">Rescisão Contratual</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Tipo de Demissão */}
              <div className="space-y-2">
                <Label className="font-medium">Tipo de Demissão</Label>
                <Select 
                  value={config.rescisao?.tipoDemissao || "sem_justa_causa"}
                  onValueChange={(v) => setConfig({
                    ...config,
                    rescisao: { ...config.rescisao, tipoDemissao: v as TipoDemissao }
                  })}
                  disabled={isLocked || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem_justa_causa">Sem Justa Causa</SelectItem>
                    <SelectItem value="justa_causa">Justa Causa</SelectItem>
                    <SelectItem value="pedido_demissao">Pedido de Demissão</SelectItem>
                    <SelectItem value="rescisao_indireta">Rescisão Indireta</SelectItem>
                    <SelectItem value="acordo">Acordo (Art. 484-A CLT)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  CLT Art. 477 e seguintes
                </p>
              </div>

              {/* Data de Admissão */}
              <div className="space-y-2">
                <Label className="font-medium">Data de Admissão</Label>
                <Input
                  type="date"
                  value={config.rescisao?.dataAdmissao || ""}
                  onChange={(e) => setConfig({
                    ...config,
                    rescisao: { ...config.rescisao, dataAdmissao: e.target.value }
                  })}
                  disabled={isLocked || readOnly}
                />
              </div>

              {/* Data de Demissão */}
              <div className="space-y-2">
                <Label className="font-medium">Data de Demissão</Label>
                <Input
                  type="date"
                  value={config.rescisao?.dataDemissao || ""}
                  onChange={(e) => setConfig({
                    ...config,
                    rescisao: { ...config.rescisao, dataDemissao: e.target.value }
                  })}
                  disabled={isLocked || readOnly}
                />
              </div>

              {/* Calcular Verbas Automaticamente */}
              <div className="space-y-2">
                <Label className="font-medium">Calcular Verbas Rescisórias</Label>
                <div className="flex items-center gap-4">
                  <Switch
                    checked={config.rescisao?.calcularVerbas ?? true}
                    onCheckedChange={(v) => setConfig({
                      ...config,
                      rescisao: { ...config.rescisao, calcularVerbas: v }
                    })}
                    disabled={isLocked || readOnly}
                  />
                  <span className="text-sm text-muted-foreground">
                    {config.rescisao?.calcularVerbas !== false 
                      ? "Saldo, aviso, férias e 13º proporcionais" 
                      : "Desativado"}
                  </span>
                </div>
              </div>
            </div>

            {/* Preview das Verbas */}
            {config.rescisao?.calcularVerbas !== false && config.rescisao?.tipoDemissao && (
              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <Label className="font-medium text-sm mb-2 block">Verbas a calcular:</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Saldo de Salário</Badge>
                  {['sem_justa_causa', 'rescisao_indireta'].includes(config.rescisao.tipoDemissao) && (
                    <Badge variant="outline">Aviso Prévio Indenizado</Badge>
                  )}
                  <Badge variant="outline">Férias Vencidas + 1/3</Badge>
                  {config.rescisao.tipoDemissao !== 'justa_causa' && (
                    <>
                      <Badge variant="outline">Férias Proporcionais + 1/3</Badge>
                      <Badge variant="outline">13º Proporcional</Badge>
                    </>
                  )}
                  {['sem_justa_causa', 'rescisao_indireta'].includes(config.rescisao.tipoDemissao) && (
                    <Badge variant="outline">Multa 40% FGTS</Badge>
                  )}
                  {config.rescisao.tipoDemissao === 'acordo' && (
                    <Badge variant="secondary">Multa 20% FGTS (acordo)</Badge>
                  )}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Atualização Monetária */}
        <AccordionItem value="atualizacao" className="glass-card rounded-xl border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Percent className="h-5 w-5 text-primary" />
              <span className="font-semibold">Correção Monetária e Juros</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Índice de Correção */}
              <div className="space-y-2">
                <Label className="font-medium">Índice de Correção</Label>
                <Select 
                  value={config.correcao.indice}
                  onValueChange={(v) => setConfig({
                    ...config,
                    correcao: { ...config.correcao, indice: v as PremissaCorrecao['indice'] }
                  })}
                  disabled={isLocked || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="selic">SELIC (EC 113/2021)</SelectItem>
                    <SelectItem value="ipca_e">IPCA-E</SelectItem>
                    <SelectItem value="inpc">INPC</SelectItem>
                    <SelectItem value="tr">TR</SelectItem>
                    <SelectItem value="nenhum">Sem correção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Marco Inicial Correção */}
              <div className="space-y-2">
                <Label className="font-medium">Marco Inicial da Correção</Label>
                <Select 
                  value={config.correcao.marcoInicial}
                  onValueChange={(v) => setConfig({
                    ...config,
                    correcao: { ...config.correcao, marcoInicial: v as PremissaCorrecao['marcoInicial'] }
                  })}
                  disabled={isLocked || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vencimento">Vencimento da obrigação</SelectItem>
                    <SelectItem value="ajuizamento">Ajuizamento da ação</SelectItem>
                    <SelectItem value="citacao">Citação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Juros */}
              <div className="space-y-2">
                <Label className="font-medium">Juros de Mora</Label>
                <Select 
                  value={config.juros.metodo}
                  onValueChange={(v) => setConfig({
                    ...config,
                    juros: { ...config.juros, metodo: v as PremissaJuros['metodo'] }
                  })}
                  disabled={isLocked || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="selic">SELIC (incluso na correção)</SelectItem>
                    <SelectItem value="1_am">1% ao mês</SelectItem>
                    <SelectItem value="0.5_am">0,5% ao mês</SelectItem>
                    <SelectItem value="nenhum">Sem juros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Marco Inicial Juros */}
              <div className="space-y-2">
                <Label className="font-medium">Marco Inicial dos Juros</Label>
                <Select 
                  value={config.juros.marcoInicial}
                  onValueChange={(v) => setConfig({
                    ...config,
                    juros: { ...config.juros, marcoInicial: v as PremissaJuros['marcoInicial'] }
                  })}
                  disabled={isLocked || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ajuizamento">Ajuizamento</SelectItem>
                    <SelectItem value="citacao">Citação</SelectItem>
                    <SelectItem value="distribuicao">Distribuição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Médias e Reflexos */}
        <AccordionItem value="medias" className="glass-card rounded-xl border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Calculator className="h-5 w-5 text-primary" />
              <span className="font-semibold">Médias e Reflexos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Período de Média */}
              <div className="space-y-2">
                <Label className="font-medium">Período de Média Remuneratória</Label>
                <Select 
                  value={config.media.periodo}
                  onValueChange={(v) => setConfig({
                    ...config,
                    media: { ...config.media, periodo: v as PremissaMedia['periodo'] }
                  })}
                  disabled={isLocked || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ultimos_12_meses">Últimos 12 meses</SelectItem>
                    <SelectItem value="periodo_imprescrito">Período imprescrito</SelectItem>
                    <SelectItem value="todo_contrato">Todo o contrato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Média */}
              <div className="space-y-2">
                <Label className="font-medium">Tipo de Média</Label>
                <Select 
                  value={config.media.tipoMedia}
                  onValueChange={(v) => setConfig({
                    ...config,
                    media: { ...config.media, tipoMedia: v as PremissaMedia['tipoMedia'] }
                  })}
                  disabled={isLocked || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples">Média Simples</SelectItem>
                    <SelectItem value="ponderada">Média Ponderada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Base Periculosidade */}
              <div className="space-y-2">
                <Label className="font-medium">Base de Periculosidade</Label>
                <Select 
                  value={config.basePericulosidade.base}
                  onValueChange={(v) => setConfig({
                    ...config,
                    basePericulosidade: { ...config.basePericulosidade, base: v as PremissaBaseCalculo['base'] }
                  })}
                  disabled={isLocked || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salario_base">Salário Base</SelectItem>
                    <SelectItem value="remuneracao">Remuneração Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Base Insalubridade */}
              <div className="space-y-2">
                <Label className="font-medium">Base de Insalubridade</Label>
                <Select 
                  value={config.baseInsalubridade.base}
                  onValueChange={(v) => setConfig({
                    ...config,
                    baseInsalubridade: { ...config.baseInsalubridade, base: v as PremissaBaseCalculo['base'] }
                  })}
                  disabled={isLocked || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salario_minimo">Salário Mínimo</SelectItem>
                    <SelectItem value="salario_base">Salário Base</SelectItem>
                    <SelectItem value="piso_categoria">Piso da Categoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Prescrição */}
        <AccordionItem value="prescricao" className="glass-card rounded-xl border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-semibold">Prescrição</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-medium">Data de Prescrição</Label>
                <Input
                  type="date"
                  value={config.prescricao.dataPrescricao}
                  onChange={(e) => setConfig({
                    ...config,
                    prescricao: { ...config.prescricao, dataPrescricao: e.target.value }
                  })}
                  disabled={isLocked || readOnly}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Tipo de Limite</Label>
                <Select 
                  value={config.prescricao.tipoLimite}
                  onValueChange={(v) => setConfig({
                    ...config,
                    prescricao: { ...config.prescricao, tipoLimite: v as PremissaPrescricao['tipoLimite'] }
                  })}
                  disabled={isLocked || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quinquenal">Quinquenal (5 anos)</SelectItem>
                    <SelectItem value="bienal">Bienal (2 anos)</SelectItem>
                    <SelectItem value="custom">Customizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center justify-between glass-card rounded-xl p-4">
          <Button variant="outline" onClick={handleReset} disabled={isLocked}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão TRT-3
          </Button>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleSave} disabled={isLocked}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Rascunho
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isLocked || !validacao.valido}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLocked ? (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Travado
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirmar Premissas
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
