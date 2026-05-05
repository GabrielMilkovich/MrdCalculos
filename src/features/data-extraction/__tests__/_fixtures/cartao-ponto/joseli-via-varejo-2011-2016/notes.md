# Fixture: Joseli Silva Wanderley — Cartão de Ponto Via Varejo / Casa Bahia

## Origem

Processo `0012003-73.2021.5.15.0077` (TRT-15). Reclamante: JOSELI SILVA WANDERLEY,
matrícula 01788485, filial 1651. Empregadora: NOVA CASA BAHIA S/A (até 03/2013),
depois VIA VAREJO S/A (a partir de 03/2013, mesma matrícula). Cargo: VENDEDOR
DE MOVEIS → VENDEDOR DE LINHA LEVE.

`ocr.txt` é o output bruto do Mistral OCR aplicado ao PDF do PJe (57 páginas
de cartão de ponto cobrindo 06/2011 a 02/2016).

`expected.csv` cobre apenas os primeiros 3 cartões (~63 linhas) verificadas
manualmente. O parser deve passar 100% nessas linhas e ser executado nas 54
páginas restantes para gerar o CSV completo (que o operador valida no Review
Dialog).

## Layout do documento (Via Varejo / Casa Bahia)

**Cabeçalho** (sempre presente):
```
| Nome JOSELI SILVA WANDERLEY | Matrícula 01788485 | Filial 1651 | Depto. 0003 | Seção 00 |
| Cargo ... | Sindicato ... | Jornada 7,2 | Tipo 2 | Período 21.05.2011 A 20.06.2011 |
| Razão Social NOVA CASA BAHIA S/A | C.G.C. 10.757.237/0556-62 |
```

A linha **Período DD.MM.YYYY A DD.MM.YYYY** (com pontos, não barras) é a chave
para reconstruir as datas de cada dia. Padrão MRJ: cartão de ponto Via Varejo
fecha sempre dia 20 e abre dia 21 do mês seguinte.

**Linhas de dia** — dois layouts possíveis dependendo de como o Mistral
renderizou a tabela:

### Layout A — linha-por-linha (~60% dos cartões)

```
| 21 TER | 13:45 17:02 | 18:10 22:05 |
| 22 QUA | 13:46 17:12 | 18:21 22:12 |
| 23 FERIADO | 11:54 15:30 | 16:31 |
| 24 SEX | 13:52 17:05 | 18:08 22:14 |
| 28 TER | | |
```

Cada linha tem `dd DiaSemana` + 1º Período + 2º Período. Dias sem batida vêm
com células vazias.

### Layout B — tabela colapsada (~40% dos cartões)

O Mistral às vezes funde múltiplos dias numa única célula multi-linha:

```
| 02 QUI
03 SEX
04 SAB
05 D.S.R.
... | 10:03 14:02
09:41 14:10
09:56 14:38
... | 15:10 18:25
15:14 18:09
15:41 18:34
... |
```

Cada coluna vira uma string com `\n` interno. **O alinhamento é POSICIONAL**:
a i-ésima linha da coluna "Dia" corresponde à i-ésima linha das colunas
"1. Período" e "2. Período".

**Armadilha do alinhamento**: a coluna "Dia" tem todos os dias do mês
(incluindo D.S.R. e dias sem batida). As colunas "1. Período" e "2. Período"
têm SÓ os dias com batida. Resultado: `len(dias) > len(batidas)`.

Heurística de alinhamento:
1. Identifique os dias D.S.R., FERIADO sem horário, e dias completamente em
   branco — eles NÃO têm batida correspondente nas colunas de período.
2. Para os dias restantes, faça alinhamento posicional 1:1 entre a coluna
   "Dia" e as colunas "Período".
3. Se a contagem ainda não bater, sinalize warning (`alinhamento_incerto`)
   e devolva o que conseguiu — operador resolve no Review.

No cartão 1 (pág 1, exemplo acima): 19 dias listados, 16 batidas → dias 18,
19 (D.S.R.), 20 não têm batida. Os 16 primeiros dias casam com as 16 batidas.

## Regra de reconstrução de data

Dado um dia `dd` e o período do cabeçalho `DD1.MM1.YYYY1 A DD2.MM2.YYYY2`:

```typescript
function reconstruirData(dia: number, periodo: { inicio: Date; fim: Date }): Date {
  const { inicio, fim } = periodo;
  // Tenta primeiro o mês inicial
  const candidatoInicio = new Date(inicio.getFullYear(), inicio.getMonth(), dia);
  if (candidatoInicio >= inicio && candidatoInicio <= fim) return candidatoInicio;
  // Fallback: mês final (período cruzou virada de mês)
  const candidatoFim = new Date(fim.getFullYear(), fim.getMonth(), dia);
  if (candidatoFim >= inicio && candidatoFim <= fim) return candidatoFim;
  throw new Error(`Dia ${dia} fora do período ${inicio.toISOString()}–${fim.toISOString()}`);
}
```

Para o cartão 1 (`21.05.2011 A 20.06.2011`), dia 02:
- Candidato 1: 02/05/2011 → fora do período (anterior a 21/05) → rejeita
- Candidato 2: 02/06/2011 → dentro do período → aceita

Para o cartão 2 (`21.06.2011 A 20.07.2011`), dia 21:
- Candidato 1: 21/06/2011 → dentro → aceita

## Cortes semânticos obrigatórios

O parser DEVE parar de capturar batidas ao encontrar QUALQUER um destes
marcadores:

- `Resumo do Período`
- `HORAS TRABALHADAS`
- `D.S.R PAGOS`
- `Afastamentos do Período`
- `Assinado eletronicamente`
- `Número do processo:`
- `--- PAGE`

Sem esse corte, o regex captura como batida valores tipo `02:14` (que é
ADICIONAL NOTURNO 2h14min do resumo), ou `20/04/2022` (data de assinatura
digital do PJe), ou `11.05.2013 A 11.05.2013` (datas de atestado médico).

## Tipos de ocorrência sem batida

Os seguintes marcadores indicam dia sem registro de ponto (não geram linha
no CSV):

- `D.S.R.` (descanso semanal remunerado) sem horário
- `FERIADO` sem horário
- `FER. DESC.` (período de férias descansadas) — pode aparecer como bloco
  contíguo
- Dias completamente vazios (apenas `dd DiaSemana | | |`)

`D.S.R.` e `FERIADO` COM horário (ex: `D.S.R. | 11:57 14:42 | 15:46`)
significam que o trabalhador efetivamente trabalhou no descanso/feriado e
DEVEM gerar linha no CSV — esses são candidatos a horas extras.

## Casos de borda confirmados nos cartões

- **Marcação ímpar** (3 batidas): pág 2, dia 23 FERIADO `11:54 15:30 | 16:31`.
  A 4ª batida está faltando (provavelmente erro de marcação do funcionário).
  Manter as 3 batidas (Entrada1=11:54, Saída1=15:30, Entrada2=16:31, Saída2
  vazia). PJe-Calc trata.
- **1 par só**: pág 1, dia 17 SEX `13:42 16:34 | 17:32 22:17` →
  Entrada1=13:42, Saída1=16:34, Entrada2=17:32, Saída2=22:17. Padrão.
- **Dias com afastamento parcial**: marcador `AF`, `AG`, `A2` na coluna
  Ocorrências indica atestado/atraso. Não afetam o CSV (são metadados —
  operador vê no parsed.eventos).
- **Mudança de empresa (Casa Bahia → Via Varejo)**: pág 23 (cartão
  21.03.2013-20.04.2013) — razão social muda. Continua mesma matrícula,
  parser deve seguir normalmente.
- **Última página com 36 dias** (pág 57, `11.01.2016 A 15.02.2016`): período
  de 5 semanas (não os 30 dias usuais). Ajustar lógica do período pra aceitar
  qualquer DD1-DD2 sem assumir "21 a 20".

## Métricas de aceite

Sobre o OCR completo (~1700 linhas esperadas):
- **Cobertura**: ≥ 95% das datas reais devem aparecer no CSV.
- **Precisão**: 0 falsos positivos (linhas do CSV que não correspondem a um
  dia real do cartão).
- **Pureza dos horários**: 0 horários vindo do "Resumo do Período".
- **Fixture de regressão**: 100% das 63 linhas do `expected.csv` devem casar
  byte-a-byte com o output do parser.
