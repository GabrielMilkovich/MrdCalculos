# Recursos oficiais extraídos do PJe-Calc Cidadão v2.15.1

Onde commitar no repo MRD Calc:

```
pjecalc-fonte/_recursos-oficiais/
├── tabelas-historicas/
│   ├── csv/                          # ← 12 CSVs limpos (use isso pra Sprint 1)
│   ├── dump-h2-completo.sql          # ← 13 MB, dump bruto (referência)
│   └── README.md
├── messages.properties               # ← 611 mensagens oficiais Java
├── relatorios-jrxml/                 # ← 122 templates JasperReports (PDF)
└── integracao/                       # ← 27 arquivos Java módulo integracao
```

## Tabelas históricas (`tabelas-historicas/csv/`)

| Arquivo | Linhas | Conteúdo |
|---|---:|---|
| salario-minimo-nacional.csv | 600 | Salário mínimo nacional histórico |
| inss-base-teto.csv | 239 | Teto INSS por competência |
| inss-faixas-segurado-empregado.csv | 624 | Faixas INSS segurado/empregado (até 6 faixas por competência) |
| inss-faixas-empregado-domestico.csv | 552 | Faixas INSS empregado doméstico |
| salario-familia-faixas.csv | 360 | Faixas salário-família |
| seguro-desemprego-faixas.csv | 370 | Faixas seguro-desemprego |
| juros-selic-inss.csv | 593 | SELIC INSS mensal |
| juros-selic-irpf.csv | 588 | SELIC IRPF mensal |
| juros-taxa-legal.csv | 93 | Taxa legal pós-EC 113/2021 |
| juros-padrao.csv | 3 | Juros padrão (raros) |
| inss-taxa-multa.csv | 11 | Taxa de multa INSS |
| feriados-nacionais.csv | 4 | Feriados nacionais fixos |

**Formato:** delimitador `;`. Datas no formato `DATE 'yyyy-mm-dd'`. Valores decimais com ponto.
NULL literal quando coluna não preenchida.

**Schema das colunas:** os CSVs `c0;c1;c2;...` são exports brutos. Os semânticos
(`salario-minimo-nacional`, `inss-base-teto`) já vêm com header. Veja o `CREATE TABLE`
de cada uma no `dump-h2-completo.sql` para mapeamento exato.

## Uso (Sprint 1 do prompt)

O script `scripts/comparar-tabelas-supabase-vs-oficial.ts` (proposto no prompt anterior)
deve comparar cada CSV com a tabela equivalente no Supabase. Saída:
`docs/audit/tabelas-historicas-divergencias.md`.

Migration de seed para competências ausentes no Supabase (sem sobrescrever):
`<timestamp>_seed_tabelas_historicas_oficiais.sql`.
