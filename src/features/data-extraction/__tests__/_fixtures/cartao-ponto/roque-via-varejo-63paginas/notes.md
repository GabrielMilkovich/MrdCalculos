# ROQUE — Via Varejo S/A — cartão de 63 páginas (2016-2021)

Fonte: ID 0c9555d, processo 0000610-03.2021.5.09.0245.
OCR Mistral, qualidade BAIXA. Cobre 5 anos de jornada com múltiplos
ciclos 16-15 (cada página = uma competência).

## Patologias que essa fixture cobre

1. **OCR sujo de palavras-chave**:
   - "Admiro:" / "Admirado:" / "Admiredo:" (variantes de "Admissão:")
   - "Crachá:" → "Cracha:" / "Coachá:" / "Ciacha:" / "Crucia:" / "Crança:"
   - "Empregado:" → "Engenheiro:" / "Empgnegado:"
   - "TRATINO:" / "TRATADO:" / "TRATIOS:" (header de período)
   - "Cooperência:" / "Cooperativa:" → "Competência:"

2. **Layout coluna dupla "Horário Registrado | Horário de Trabalho"**:
   cada linha de dia traz 8 horas (4 batidas reais + 4 da escala).

3. **Legenda de escalas no topo de cada página**:
   "Horários: 91 08:00 11:00 12:00 14:25 1 162 09:00 12:00 13:00 17:25 ..."

4. **Datas absurdas do OCR**: 31/04/2016, 32/05/2016, 33/05/2016 etc.
   (eram 01/05, 02/05, 03/05 mal-lidos). Já rejeitadas por isValidDate.

5. **Horários absurdos do OCR**: "59:00" (era 09:00 mal-lido).

6. **Bloco "Movimentos:" / "Demonstrar:" / "Necimentos:"** ao fim de cada
   página com totalizadores (HE 75%, banco crédito, intervalo, adicional
   sábado, etc.).

7. **Múltiplos ciclos 16-15**: cada página declara um período próprio
   (16/02 a 15/03, 16/03 a 15/04, etc.). Documento tem ~63 ranges.

8. **Cronologia inválida residual**: linhas como
   "14/07/2014 SEG 162 N 05:56 05:57 22:09 05:53" onde S2 < E2.

9. **Headers de assinatura e rodapés**:
   "Estou de pleno acordo", "Funkeia/Fonteis/Fickeis 25 de JUNHO de 2021",
   "Assinado eletronicamente por: TATIANE...", "ID. 0c9555d - Pág. N".

## Volumes esperados (baseline pre-fix)

- Linhas no OCR: ~4338
- Apurações extraídas pelo parser atual: ~1085 (verificar com test)
- Dias com batidas reais: ~700-800 (estimado)
- Falsos positivos (admissão, eventos): vide bug-report do user

## Como manter

Esse OCR é um SUBSET representativo (não as 63 páginas completas — seriam
~250KB) com as patologias mapeadas acima. Se precisar do OCR completo,
pegar do PJe do processo 0000610-03.2021.5.09.0245.
