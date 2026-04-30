import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Categoria } from '@/features/data-extraction';

interface Props {
  competencia: string; // herda do documento
  categorias: Categoria[];
  onSubmit: (input: {
    codigo: string | null;
    nome: string;
    valor: number;
    categoria_id: string | null; // null = ignorar
  }) => Promise<void>;
}

export function ManualRubricaDialog({ competencia, categorias, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [categoriaId, setCategoriaId] = useState<string>('__none__');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCodigo('');
    setNome('');
    setValor('');
    setCategoriaId('__none__');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNome = nome.trim();
    if (!trimmedNome) return;
    const numeric = Number(valor.replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric < 0) return;

    setSubmitting(true);
    await onSubmit({
      codigo: codigo.trim() || null,
      nome: trimmedNome,
      valor: numeric,
      categoria_id:
        categoriaId === '__none__'
          ? null
          : categoriaId === '__ignorar__'
            ? null
            : categoriaId,
    });
    setSubmitting(false);
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
          <Plus className="h-3 w-3" /> Rubrica manual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar rubrica manual</DialogTitle>
          <DialogDescription>
            Competência herdada do documento: <strong>{competencia || '—'}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="codigo" className="text-xs">Código (opcional)</Label>
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex: 0620"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="valor" className="text-xs">Valor *</Label>
              <Input
                id="valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className="h-9 text-sm"
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="nome" className="text-xs">Nome da rubrica *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Comissões"
              className="h-9 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categoria *</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem categoria</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_exibicao}
                  </SelectItem>
                ))}
                <SelectItem value="__ignorar__">Ignorar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={submitting || !nome.trim() || !valor.trim()}>
              {submitting ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
