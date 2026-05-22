#!/usr/bin/env python3
"""
Validador que cobre AMBOS layouts (antigo + novo) lendo page-by-page.
Compara CSV gerado vs ground truth extraído por pdfplumber.
"""
import sys, csv, re
import pdfplumber
from collections import Counter

RE_DATA_NOVO = re.compile(r"^(\d{2})/(\d{2})/(\d{4})\s*-\s*(Dom|Seg|Ter|Qua|Qui|Sex|Sáb)", re.I)
RE_DATA_ANT = re.compile(r"^(\d{2})/(\d{2})/(\d{4})\s+(SEG|TER|QUA|QUI|SEX|SAB|DOM)\b", re.I)
RE_HORA = re.compile(r"\b(\d{1,2}):(\d{2})\*?\b")
RE_DESC = re.compile(r"\b(\d{1,2}):(\d{2})\s*-\s*Desconsiderado", re.I)
RE_HEADER_ESCALAS = re.compile(r"Horários\s+\.\.:?\s*([\s\S]+?)(?=Data\s+Dia)")
RE_ESCALA_ITEM = re.compile(r"\b(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})")
RE_MARCADOR = re.compile(
    r"\b(?:ABONO\s+AUTORIZADO|D[ée]bito\s+Banco\s+de\s+horas|Cr[eé]dito\s+Banco\s+de\s+horas"
    r"|Atraso\s+Abonado|Sa[íi]da\s+Antecipada|Afast(?:amento)?\s+Abonado|AFAST\b"
    r"|Treinamento|Problemas\s+Relogio|F[ée]rias\s+F[ée]rias"
    r"|Atestado\s+M[ée]dico\s+Atestado\s+M[ée]dico|Falta\s+Injustificada"
    r"|DSR\s+DSR|FERIADO\s+FERIADO|FOLGA\s+-)", re.I)

def extrair_escalas(text):
    out = set()
    for m in RE_HEADER_ESCALAS.finditer(text):
        for em in RE_ESCALA_ITEM.finditer(m.group(1)):
            out.add(tuple(em.group(i) for i in (1,2,3,4)))
    return out

def horas_validas(matches):
    out = []
    for m in matches:
        h, mn = int(m.group(1)), int(m.group(2))
        if 0 <= h <= 23 and 0 <= mn <= 59:
            out.append((f"{h:02d}:{mn:02d}", m.start()))
    return out

def extrair_batidas_antigo(linha, escalas):
    mm = RE_MARCADOR.search(linha)
    horas_pos = horas_validas(RE_HORA.finditer(linha))
    if mm:
        return [h for h, p in horas_pos if p < mm.start()]
    horas = [h for h, _ in horas_pos]
    if len(horas) >= 4:
        for i in range(len(horas) - 3):
            jan = tuple(horas[i:i+4])
            if jan in escalas:
                if i == 0 and len(horas) >= 8: return horas[:4]
                return horas[:i]
    if len(horas) == 8: return horas[:4]
    return horas

def gt_from_pdf(pdf_path):
    out = {}
    with pdfplumber.open(pdf_path) as pdf:
        for pgnum, pg in enumerate(pdf.pages, 1):
            text = pg.extract_text(layout=False) or ""
            is_novo = "ESPELHO DE PONTO" in text
            if is_novo:
                for tab in pg.extract_tables() or []:
                    if not tab: continue
                    for hi, row in enumerate(tab):
                        hs = [str(c or '').strip().upper() for c in row]
                        if 'DATA' in hs and 'BATIDAS' in hs:
                            i_data = hs.index('DATA')
                            i_bat = hs.index('BATIDAS')
                            i_ajs = hs.index('AJUSTES') if 'AJUSTES' in hs else -1
                            for r in tab[hi+1:]:
                                if not r or not r[i_data]: continue
                                m = RE_DATA_NOVO.match(str(r[i_data]).strip())
                                if not m: continue
                                d = f"{m.group(1)}/{m.group(2)}/{m.group(3)}"
                                bat = str(r[i_bat] or '').strip()
                                ajs = str(r[i_ajs] if i_ajs >= 0 else '').strip()
                                if bat == '--' or not bat:
                                    horas = []
                                else:
                                    horas = [f"{int(mm.group(1)):02d}:{mm.group(2)}"
                                             for mm in RE_HORA.finditer(bat)
                                             if 0 <= int(mm.group(1)) <= 23]
                                desc = {f"{int(mm.group(1)):02d}:{mm.group(2)}" for mm in RE_DESC.finditer(ajs)}
                                horas = [h for h in horas if h not in desc]
                                # Layout novo: precedência sempre, MAS se já existe e tem mais batidas, mantém
                                if d not in out or len(horas) > len(out[d]):
                                    out[d] = horas
            else:
                # Layout antigo: linha-por-linha
                escalas = extrair_escalas(text)
                for line in text.split('\n'):
                    m = RE_DATA_ANT.match(line.strip())
                    if not m: continue
                    data = f"{m.group(1)}/{m.group(2)}/{m.group(3)}"
                    resto = line[m.end():]
                    horas = extrair_batidas_antigo(resto, escalas)
                    if data not in out or len(horas) > len(out[data]):
                        out[data] = horas
    return out

def load_csv(p):
    out = {}
    with open(p, encoding='utf-8') as f:
        rd = csv.reader(f, delimiter=';')
        next(rd, None)
        for row in rd:
            if not row or not row[0]: continue
            out[row[0]] = [v.strip() for v in row[1:] if v.strip()]
    return out

def main():
    pdf, csv_path = sys.argv[1], sys.argv[2]
    gt = gt_from_pdf(pdf)
    cv = load_csv(csv_path)
    comuns = set(gt) & set(cv)
    perfeitos = 0
    diverg = []
    for d in sorted(comuns):
        if gt[d] == cv[d]: perfeitos += 1
        else: diverg.append((d, gt[d], cv[d]))
    only_gt = set(gt) - set(cv)
    only_csv = set(cv) - set(gt)
    print(f"GT: {len(gt)} | CSV: {len(cv)} | Comuns: {len(comuns)}")
    print(f"Perfeitos: {perfeitos} | Divergências: {len(diverg)}")
    if comuns:
        print(f"\nCoerência sobre comuns: {100*perfeitos/len(comuns):.2f}%")
    print(f"\nSó no GT: {len(only_gt)}")
    if only_gt: print(f"  exemplos: {sorted(only_gt)[:5]}")
    print(f"Só no CSV: {len(only_csv)}")
    if only_csv: print(f"  exemplos: {sorted(only_csv)[:5]}")
    if diverg:
        print(f"\nDivergências (primeiras 20):")
        for d, esp, c in diverg[:20]:
            print(f"  {d}:\n    GT : {esp}\n    CSV: {c}")
    sys.exit(0 if comuns and (100*perfeitos/len(comuns)) >= 99.0 else 1)

if __name__ == '__main__': main()
