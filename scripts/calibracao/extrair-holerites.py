#!/usr/bin/env python3
"""
Sprint 3c Fase 4 — extrai texto OCR dos 3 PDFs de contracheque
versionados no repo, salvando 1 arquivo .txt por página (= 1 holerite).

Output: scripts/calibracao/ocr-holerites/{slug}-pg{N:03d}.txt

Não tem dependência de cryptography (usa pypdfium2 direto, evita
o pdfplumber→pdfminer→cryptography quebrado no container).
"""
import pypdfium2 as pdfium
import os
import sys

PDFS = [
    ("roque", "public/reports/roque-guerreiro/Contracheques.pdf"),
    ("rosicleia-antigo", "public/reports/rosicleia/Contracheques_ate_06.2021.pdf"),
    ("rosicleia-novo", "public/reports/rosicleia/Contracheques_apos_06.2021.pdf"),
]

OUT = "scripts/calibracao/ocr-holerites"
os.makedirs(OUT, exist_ok=True)

resumo = []
for slug, path in PDFS:
    pdf = pdfium.PdfDocument(path)
    n = len(pdf)
    for i in range(n):
        txt = pdf[i].get_textpage().get_text_range()
        fname = f"{OUT}/{slug}-pg{i+1:03d}.txt"
        with open(fname, "w", encoding="utf-8") as f:
            f.write(txt)
    resumo.append((slug, path, n))

print("Extração concluída:")
for slug, path, n in resumo:
    print(f"  {slug:25s}  {n:3d} pgs  ({path})")
