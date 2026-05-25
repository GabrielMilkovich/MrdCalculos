// =====================================================
// VALIDATION VIEW V2 - LADO A LADO COM ORIGEM DOCUMENTAL
// =====================================================

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { 
  Check, 
  X, 
  Edit2, 
  FileText, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  History,
  Filter,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
// syncFromValidation removed (deleted module)

interface Extraction {
  id: string;
  document_id: string;
  campo: string;
  valor_proposto: string;
  tipo_valor: string;
  confianca: number | null;
  origem: {
    pagina?: number;
    trecho_texto?: string;
    linha?: number;
  };
  status: string;
  created_at: string;
}

interface Validation {
  id: string;
  extraction_id: string | null;
  campo: string;
  valor_anterior: string | null;
  valor_validado: string;
  acao: 'aprovar' | 'editar' | 'rejeitar';
  justificativa: string | null;
  usuario_id: string;
  validated_at: string;
}

interface Document {
  id: string;
  tipo: string;
  file_name: string | null;
  arquivo_url: string | null;
  storage_path: string | null;
}

interface ValidationViewV2Props {
  caseId: string;
  onValidationComplete?: () => void;
}

const CAMPO_LABELS: Record<string, string> = {
  data_admissao: 'Data de Admissão',
  data_demissao: 'Data de Demissão',
  salario_base: 'Salário Base',
  salario_mensal: 'Salário Mensal',
  funcao: 'Função/Cargo',
  jornada_contratual: 'Jornada Contratual',
  horas_extras_50: 'Horas Extras 50%',
  horas_extras_100: 'Horas Extras 100%',
  horas_noturnas: 'Horas Noturnas',
  tipo_demissao: 'Tipo de Demissão',
};

const TIPO_LABELS: Record<string, string> = {
  money: 'Valor Monetário',
  number: 'Número',
  date: 'Data',
  string: 'Texto',
  duration: 'Duração',
};

export function ValidationViewV2({ caseId, onValidationComplete }: ValidationViewV2Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedExtraction, setSelectedExtraction] = useState<Extraction | null>(null);
  const [editValue, setEditValue] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch extractions
  const { data: extractions, isLoading: loadingExtractions } = useQuery({
    queryKey: ['extractions', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('extractions')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Extraction[];
    },
  });

  // Fetch validations history
  const { data: validations } = useQuery({
    queryKey: ['validations', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('validations')
        .select('*')
        .eq('case_id', caseId)
        .order('validated_at', { ascending: false });
      if (error) throw error;
      return data as Validation[];
    },
  });

  // Fetch documents
  const { data: documents } = useQuery({
    queryKey: ['documents', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, tipo, file_name, arquivo_url, storage_path')
        .eq('case_id', caseId);
      if (error) throw error;
      return data as Document[];
    },
  });

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: async ({ 
      extraction, 
      acao, 
      valorValidado 
    }: { 
      extraction: Extraction; 
      acao: 'aprovar' | 'editar' | 'rejeitar';
      valorValidado: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Insert validation record
      const { error: validationError } = await supabase
        .from('validations')
        .insert({
          case_id: caseId,
          extraction_id: extraction.id,
          campo: extraction.campo,
          valor_anterior: extraction.valor_proposto,
          valor_validado: valorValidado,
          acao,
          justificativa: justificativa || null,
          usuario_id: user.id,
        });
      if (validationError) throw validationError;

      // Update extraction status
      const { error: extractionError } = await supabase
        .from('extractions')
        .update({ 
          status: acao === 'rejeitar' ? 'rejeitado' : 'validado' 
        })
        .eq('id', extraction.id);
      if (extractionError) throw extractionError;

      return { acao };
    },
    onSuccess: async ({ acao }) => {
      toast({
        title: acao === 'aprovar' ? 'Aprovado' : acao === 'editar' ? 'Editado' : 'Rejeitado',
        description: 'Validação registrada com sucesso.',
      });
      await queryClient.invalidateQueries({ queryKey: ['extractions', caseId] });
      await queryClient.invalidateQueries({ queryKey: ['validations', caseId] });
      setShowEditDialog(false);
      setSelectedExtraction(null);
      setEditValue('');
      setJustificativa('');

      // Check if all extractions are now validated — auto-sync
      const { data: remaining } = await supabase
        .from('extractions')
        .select('id')
        .eq('case_id', caseId)
        .eq('status', 'pendente');
      
      if (!remaining?.length) {
        toast({
          title: 'Validação concluída',
          description:
            'Todas as extrações foram validadas. Importe um .pjc ou preencha os módulos de cálculo manualmente.',
        });
        onValidationComplete?.();
      }
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Load document preview
  const loadPreview = async (documentId: string) => {
    const doc = documents?.find(d => d.id === documentId);
    if (!doc?.storage_path) return;

    const { data, error } = await supabase.functions.invoke('get-signed-document-url', {
      body: { storage_path: doc.storage_path },
    });

    if (!error && data?.signedUrl) {
      setPreviewUrl(data.signedUrl);
    }
  };

  // Filter extractions
  const filteredExtractions = extractions?.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (searchTerm && !e.campo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Group by status
  const pendingExtractions = filteredExtractions?.filter(e => e.status === 'pendente') || [];
  const validatedExtractions = filteredExtractions?.filter(e => e.status === 'validado') || [];
  const rejectedExtractions = filteredExtractions?.filter(e => e.status === 'rejeitado') || [];

  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return 'text-muted-foreground';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number | null) => {
    if (confidence === null) return 'N/A';
    return `${Math.round(confidence * 100)}%`;
  };

  const handleApprove = (extraction: Extraction) => {
    validateMutation.mutate({
      extraction,
      acao: 'aprovar',
      valorValidado: extraction.valor_proposto,
    });
  };

  const handleEdit = (extraction: Extraction) => {
    setSelectedExtraction(extraction);
    setEditValue(extraction.valor_proposto);
    setShowEditDialog(true);
    loadPreview(extraction.document_id);
  };

  const handleSaveEdit = () => {
    if (!selectedExtraction) return;
    validateMutation.mutate({
      extraction: selectedExtraction,
      acao: 'editar',
      valorValidado: editValue,
    });
  };

  const handleReject = (extraction: Extraction) => {
    setSelectedExtraction(extraction);
    setShowEditDialog(true);
  };

  const confirmReject = () => {
    if (!selectedExtraction) return;
    validateMutation.mutate({
      extraction: selectedExtraction,
      acao: 'rejeitar',
      valorValidado: '',
    });
  };

  const renderExtractionRow = (extraction: Extraction) => {
    const doc = documents?.find(d => d.id === extraction.document_id);
    const validationHistory = validations?.filter(v => v.extraction_id === extraction.id) || [];

    return (
      <div 
        key={extraction.id}
        className={cn(
          "p-4 rounded-lg border transition-all",
          extraction.status === 'pendente' && "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200",
          extraction.status === 'validado' && "bg-green-50/50 dark:bg-green-950/20 border-green-200",
          extraction.status === 'rejeitado' && "bg-red-50/50 dark:bg-red-950/20 border-red-200"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Field info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">
                {CAMPO_LABELS[extraction.campo] || extraction.campo}
              </span>
              <Badge variant="outline" className="text-xs">
                {TIPO_LABELS[extraction.tipo_valor] || extraction.tipo_valor}
              </Badge>
            </div>
            
            <div className="text-lg font-semibold text-foreground mb-2">
              {extraction.valor_proposto}
            </div>

            {/* Source info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{doc?.file_name || 'Documento'}</span>
              {extraction.origem?.pagina && (
                <span>• Pág. {extraction.origem.pagina}</span>
              )}
            </div>

            {/* Confidence — badge sempre visivel quando confianca existe (mesmo low) */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Qualidade da leitura:</span>
              {extraction.confianca !== null && extraction.confianca !== undefined ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-mono",
                    extraction.confianca >= 0.8 && "border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30",
                    extraction.confianca >= 0.5 && extraction.confianca < 0.8 && "border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30",
                    extraction.confianca < 0.5 && "border-red-500 text-red-700 bg-red-50 dark:bg-red-950/30",
                  )}
                >
                  {getConfidenceLabel(extraction.confianca)}
                  {extraction.confianca < 0.5 && <AlertTriangle className="h-3 w-3 ml-1" />}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">N/A</Badge>
              )}
            </div>

            {/* Quote */}
            {extraction.origem?.trecho_texto && (
              <div className="mt-3 p-2 bg-muted/50 rounded text-sm italic border-l-2 border-primary/30">
                "{extraction.origem.trecho_texto}"
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-2">
            {extraction.status === 'pendente' ? (
              <>
                <Button 
                  size="sm" 
                  onClick={() => handleApprove(extraction)}
                  disabled={validateMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Aprovar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleEdit(extraction)}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleReject(extraction)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Rejeitar
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant={extraction.status === 'validado' ? 'default' : 'destructive'}>
                  {extraction.status === 'validado' ? 'Validado' : 'Rejeitado'}
                </Badge>
                {validationHistory.length > 0 && (
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <History className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loadingExtractions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Conferência de Dados</h2>
          <p className="text-sm text-muted-foreground">
            Confira e aprove os dados encontrados nos documentos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {pendingExtractions.length} pendente{pendingExtractions.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary">
            {validatedExtractions.length} conferido{validatedExtractions.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar campo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="validado">Conferidos</SelectItem>
                <SelectItem value="rejeitado">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pending Section */}
      {pendingExtractions.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Aguardando conferência ({pendingExtractions.length})
          </h3>
          <div className="space-y-3">
            {pendingExtractions.map(renderExtractionRow)}
          </div>
        </div>
      )}

      {/* Validated Section */}
      {validatedExtractions.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="validated">
            <AccordionTrigger className="text-lg font-medium">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                Validados ({validatedExtractions.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {validatedExtractions.map(renderExtractionRow)}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Rejected Section */}
      {rejectedExtractions.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="rejected">
            <AccordionTrigger className="text-lg font-medium">
              <div className="flex items-center gap-2">
                <X className="h-5 w-5 text-red-500" />
                Rejeitados ({rejectedExtractions.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {rejectedExtractions.map(renderExtractionRow)}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Empty state */}
      {filteredExtractions?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma extração encontrada</h3>
            <p className="text-muted-foreground">
              Processe os documentos para extrair dados automaticamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {selectedExtraction?.status === 'pendente' ? 'Editar Valor' : 'Rejeitar Extração'}
            </DialogTitle>
            <DialogDescription>
              Compare com o documento original e faça as correções necessárias.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
            {/* Left: Edit form */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Campo</label>
                <p className="text-lg">
                  {selectedExtraction && (CAMPO_LABELS[selectedExtraction.campo] || selectedExtraction.campo)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Valor Original</label>
                <p className="p-2 bg-muted rounded text-muted-foreground">
                  {selectedExtraction?.valor_proposto}
                </p>
              </div>

              {selectedExtraction?.status === 'pendente' && (
                <div>
                  <label className="text-sm font-medium">Valor Corrigido</label>
                  <Input 
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Digite o valor correto"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Justificativa (opcional)</label>
                <Textarea 
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Explique a alteração ou rejeição..."
                  rows={3}
                />
              </div>

              {selectedExtraction?.origem?.trecho_texto && (
                <div>
                  <label className="text-sm font-medium">Trecho do Documento</label>
                  <div className="p-3 bg-muted/50 rounded border-l-2 border-primary/30 italic">
                    "{selectedExtraction.origem.trecho_texto}"
                  </div>
                </div>
              )}
            </div>

            {/* Right: Document preview */}
            <div className="border rounded-lg overflow-hidden bg-muted/30">
              {previewUrl ? (
                <iframe 
                  src={`${previewUrl}#page=${selectedExtraction?.origem?.pagina || 1}`}
                  className="w-full h-full min-h-[400px]"
                  title="Document preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-8 w-8 mx-auto mb-2" />
                    <p>Visualização não disponível</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            {selectedExtraction?.status === 'pendente' ? (
              <Button onClick={handleSaveEdit} disabled={validateMutation.isPending}>
                Salvar Alteração
              </Button>
            ) : (
              <Button 
                variant="destructive" 
                onClick={confirmReject}
                disabled={validateMutation.isPending}
              >
                Confirmar Rejeição
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
