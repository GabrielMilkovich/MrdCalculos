# Rosicleia Pereira Chaves — Casas Bahia (jun-dez/2021)

- **Processo:** 0010765-52.2024.5.03.0140
- **Período:** 16/06/2021 a 15/12/2021 (6 competências)
- **Total de apurações esperadas:** ~183

## Bugs históricos cobertos por esta fixture

### Bug 1 — `Inserido` cortava linha (PR #33)
Linhas com formato `X:XX* | X:XX - Inserido | ...` perdiam as batidas posteriores ao primeiro "Inserido".

- 16/07/2021: 4ª batida (19:50) era perdida; CSV virava `11:30;14:00;15:05;11:30`
- 13/09/2021: caso similar com 4 inseridas

### Bug 2 — Feriado trabalhado descartava batidas (PR #33)
Builder ignorava batidas quando ocorrência ≠ NORMAL.

- 02/11/2021 (Finados): CSV vinha vazio apesar de 08:41/14:12 no OCR (5h31min HE feriado perdidas)

### Bug 3 — Batidas ímpares descartadas (PR #33)
3º horário sem par era silenciosamente descartado.

- 30/11/2021: 13:14 sumia (apenas 08:03/12:03 saíam)
- 11/12/2021: 15:52 sumia (apenas 10:02/14:15 saíam)

### Bug 4 — `Horas Trabalhadas` virava Entrada3 (PR anterior)
Marcadores de resultado eram capturados como horários.

- 01/10/2021, 07/07/2021, 26/11/2021: cobertura no teste por dia

## Inconsistências no OCR original (não são bugs do parser)

- 21-22/08/2021: possível troca de dias no espelho original (sábado vs domingo). Parser reproduz fielmente o que está no OCR.
- 16-29/12/2021: período sem espelho (último doc encerra em 15/12).

## Datas com observação manual

- 22/08/2021 — verificar OCR original (suspeita de inversão sáb/dom)
