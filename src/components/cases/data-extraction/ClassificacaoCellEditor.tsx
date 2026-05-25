import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  type FichaCategoriaSlug,
  CATEGORIA_LABELS,
} from './ficha-financeira-types';

interface Props {
  codigo: string;
  denominacao: string;
  categoriaAtual: FichaCategoriaSlug;
  categoriaSugerida: FichaCategoriaSlug | null;
  origemSugestao: 'catalogo' | 'parser' | 'nao_encontrado' | null;
  onChange: (novaCategoria: FichaCategoriaSlug, justificativa?: string) => void;
}

const OPCOES: FichaCategoriaSlug[] = [
  'salario_fixo',
  'comissao',
  'dsr',
  'premiacao',
  'minimo_garantido',
  'salario_familia',
  'ignorar',
];

export function ClassificacaoCellEditor({
  codigo,
  denominacao,
  categoriaAtual,
  categoriaSugerida,
  origemSugestao,
  onChange,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingCategoria, setPendingCategoria] = useState<FichaCategoriaSlug | null>(null);
  const [justificativa, setJustificativa] = useState('');

  const isModificado = categoriaSugerida != null && categoriaAtual !== categoriaSugerida;
  const isNovo = origemSugestao === 'nao_encontrado';

  const handleChange = (value: string) => {
    const nova = value as FichaCategoriaSlug;
    if (origemSugestao === 'catalogo' && categoriaSugerida != null && nova !== categoriaSugerida) {
      setPendingCategoria(nova);
      setJustificativa('');
      setConfirmOpen(true);
    } else {
      onChange(nova);
    }
  };

  const handleConfirm = () => {
    if (pendingCategoria) {
      onChange(pendingCategoria, justificativa || undefined);
    }
    setConfirmOpen(false);
    setPendingCategoria(null);
    setJustificativa('');
  };

  return (
    <div className="flex items-center gap-1">
      <Select value={categoriaAtual} onValueChange={handleChange}>
        <SelectTrigger className="h-7 min-w-[120px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPCOES.slice(0, 6).map((cat) => (
            <SelectItem key={cat} value={cat} className="text-xs">
              {CATEGORIA_LABELS[cat]}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="ignorar" className="text-xs text-muted-foreground">
            {CATEGORIA_LABELS.ignorar}
          </SelectItem>
        </SelectContent>
      </Select>

      {isNovo && !isModificado && (
        <Badge variant="destructive" className="text-[9px] px-1">
          novo
        </Badge>
      )}
      {isModificado && (
        <Badge variant="outline" className="text-[9px] px-1 border-amber-400 text-amber-700">
          modificado
        </Badge>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Reclassificar rubrica do catálogo</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              O código <strong>{codigo}</strong> ({denominacao}) está classificado como{' '}
              <strong>{categoriaSugerida ? CATEGORIA_LABELS[categoriaSugerida] : '—'}</strong> no
              catálogo. Deseja mudar para{' '}
              <strong>{pendingCategoria ? CATEGORIA_LABELS[pendingCategoria] : '—'}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Justificativa (opcional)"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            className="text-xs"
            rows={2}
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="text-xs">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
