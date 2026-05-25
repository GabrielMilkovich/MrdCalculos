# Smoke Test — Ficha Financeira

## Pré-requisitos

- Acesso a `mrdcalc.vercel.app` (ou `localhost:5173` em dev)
- PDF de Ficha Financeira ADP/Via Varejo (caso ROQUE 2016 recomendado)
- PJe-Calc 2.15.1 desktop instalado (para validação final)

## Procedimento

### 1. Upload e classificação

1. Acessar MRD Calc, abrir ou criar um caso
2. Na aba "Extração de Dados", fazer upload do PDF `Ficha Financeira 2016.pdf`
3. Verificar que o auto-detect classificou como `Ficha Financeira (anual)`
   - Se não classificou: selecionar manualmente no dropdown
4. Aguardar OCR/processamento (status deve ir pra `ocr_done`)
5. Clicar "Confirmar OCR" quando disponível

### 2. Revisão no Dialog

1. Clicar "Revisar e baixar ZIP"
2. Verificar que `FichaFinanceiraPreviewDialog` abre com:
   - Título: "Ficha Financeira 2016 — ROQUE GUERREIRO TEIXEIRA / Via Varejo"
   - Tabela com colunas Jan-Dez (ou meses presentes no PDF)
   - ValidationBanner verde (se totais batem)
3. Verificar rubricas:
   - `0620 Comissões` → Categoria: Comissões (auto via catálogo)
   - `0501 DSR (Comissão)` → Categoria: DSR (auto via catálogo)
   - `5560 INSS` → Ignorar (auto, checkbox desmarcado)
   - Códigos sem catálogo → Badge "novo" vermelho, requer classificação manual
4. Se houver códigos não classificados: classificar via dropdown
5. Verificar totais por categoria no footer

### 3. Download e inspeção do ZIP

1. Clicar "Salvar classificações" (se houve classificações manuais: verificar toast de sucesso)
2. ZIP baixado automaticamente: `ficha_via_varejo_2016.zip`
3. Extrair e verificar conteúdo:
   - `historico_salarial_comissao.csv` — deve ter 1 linha por mês com soma > 0
   - `historico_salarial_dsr.csv` — idem
   - `historico_salarial_premiacao.csv` — idem (se houver prêmios)
   - `auditoria_completa.csv` — TODAS as rubricas com classificação
   - `resumo_validacao.txt` — "Resultado: OK" (se validação passou)
   - `metadata.json` — campos ano, empregador, totais por categoria
4. Abrir um CSV de histórico e verificar formato:
   ```
   "MES_ANO";"VALOR";"FGTS";"FGTS_REC.";"CONTRIBUICAO_SOCIAL";"CONTRIBUICAO_SOCIAL_REC."
   "01/2016";"1309,42";"S";"N";"S";"N"
   ```

### 4. Importação no PJe-Calc 2.15.1

1. Abrir PJe-Calc 2.15.1 desktop
2. Criar caso ou abrir caso existente
3. Para cada CSV de histórico salarial:
   a. Criar Histórico Salarial com o nome da categoria (ex: "Comissões")
   b. Menu: Arquivo → Importar CSV
   c. Selecionar o CSV correspondente
   d. Verificar que PJe-Calc aceita sem erro
   e. Conferir valores importados na tela
4. Rodar liquidação
5. Comparar resultado com cálculo manual de referência (tolerância ±5%)

## Critérios de aprovação

| Critério | Limiar |
|---|---|
| Auto-detect classifica PDF como ficha_financeira | confiança ≥ média |
| Dialog abre com rubricas enriquecidas | 100% das rubricas visíveis |
| ValidationBanner cor correta | verde ou amarelo (não vermelho) |
| ZIP contém ≥ 4 arquivos | historico + auditoria + resumo + metadata |
| CSV formato PJe-Calc | header correto, decimal BR, CRLF |
| PJe-Calc aceita importação | sem erro de parsing |
| Liquidação delta ≤ 5% | vs cálculo manual |

## Resultados

| Data | Caso | Resultado | Notas |
|---|---|---|---|
| _pendente_ | ROQUE 2016 | _pendente_ | Primeiro smoke real |
