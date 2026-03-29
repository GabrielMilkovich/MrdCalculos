import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Landmark, FileText } from 'lucide-react';
import { useState } from 'react';
import type { PjeResumo } from '@/lib/pjecalc/engine-types';
import { classificarPrecatorioRPV, type EsferaFazenda } from '@/lib/pjecalc/precatorio-rpv';

interface ClassificacaoPrecatorioProps {
  resumo: PjeResumo;
  salarioMinimo?: number;
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function ClassificacaoPrecatorio({ resumo, salarioMinimo = 1412.00 }: ClassificacaoPrecatorioProps) {
  const [esfera, setEsfera] = useState<EsferaFazenda>('federal');

  const result = useMemo(
    () => classificarPrecatorioRPV(resumo, esfera, salarioMinimo),
    [resumo, esfera, salarioMinimo]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4" />
            Classificação Fazenda Pública
          </CardTitle>
          <Select value={esfera} onValueChange={(v) => setEsfera(v as EsferaFazenda)}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="federal">Federal (60 SM)</SelectItem>
              <SelectItem value="estadual">Estadual (40 SM)</SelectItem>
              <SelectItem value="municipal">Municipal (30 SM)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Badge
            variant={result.classificacao === 'rpv' ? 'default' : 'destructive'}
            className="text-sm px-3 py-1"
          >
            <FileText className="h-3 w-3 mr-1" />
            {result.classificacao === 'rpv' ? 'RPV' : 'PRECATÓRIO'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Teto RPV: {BRL.format(result.teto_rpv)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {result.fundamentacao}
        </p>
      </CardContent>
    </Card>
  );
}
