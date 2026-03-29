/**
 * PJe-Calc — Native XLSX Generator
 * Generates real .xlsx files (Office Open XML) using JSZip.
 *
 * XLSX format is a ZIP containing XML files:
 * - [Content_Types].xml
 * - _rels/.rels
 * - xl/workbook.xml
 * - xl/_rels/workbook.xml.rels
 * - xl/styles.xml
 * - xl/sharedStrings.xml
 * - xl/worksheets/sheet1.xml (one per sheet)
 */
import JSZip from 'jszip';

// =====================================================
// XML HELPERS
// =====================================================

/** Escape special XML characters */
function xmlEscape(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Convert column index (0-based) to Excel column letter (A, B, ..., Z, AA, AB, ...) */
function colLetter(index: number): string {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

// =====================================================
// SHARED STRINGS
// =====================================================

/** Build shared strings table and return mapping + XML */
function buildSharedStrings(sheets: { name: string; rows: (string | number)[][] }[]): {
  xml: string;
  lookup: Map<string, number>;
} {
  const lookup = new Map<string, number>();
  let count = 0;
  const unique: string[] = [];

  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      for (const cell of row) {
        if (typeof cell === 'string' && cell !== '') {
          if (!lookup.has(cell)) {
            lookup.set(cell, unique.length);
            unique.push(cell);
          }
          count++;
        }
      }
    }
  }

  const siEntries = unique.map(s => `<si><t>${xmlEscape(s)}</t></si>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${count}" uniqueCount="${unique.length}">
${siEntries}
</sst>`;

  return { xml, lookup };
}

// =====================================================
// WORKSHEET XML
// =====================================================

function buildWorksheetXml(rows: (string | number)[][], stringLookup: Map<string, number>): string {
  const rowsXml: string[] = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const cellsXml: string[] = [];

    for (let c = 0; c < row.length; c++) {
      const ref = `${colLetter(c)}${r + 1}`;
      const val = row[c];

      if (val === '' || val === undefined || val === null) {
        continue;
      }

      if (typeof val === 'number') {
        cellsXml.push(`<c r="${ref}"><v>${val}</v></c>`);
      } else {
        const idx = stringLookup.get(val);
        if (idx !== undefined) {
          cellsXml.push(`<c r="${ref}" t="s"><v>${idx}</v></c>`);
        }
      }
    }

    if (cellsXml.length > 0) {
      rowsXml.push(`<row r="${r + 1}">${cellsXml.join('')}</row>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetData>
${rowsXml.join('\n')}
</sheetData>
</worksheet>`;
}

// =====================================================
// CONTENT TYPES
// =====================================================

function buildContentTypes(sheetCount: number): string {
  const sheetOverrides = Array.from({ length: sheetCount }, (_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
${sheetOverrides}
</Types>`;
}

// =====================================================
// RELATIONSHIPS
// =====================================================

function buildRootRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function buildWorkbookRels(sheetCount: number): string {
  const sheetRels = Array.from({ length: sheetCount }, (_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetRels}
<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId${sheetCount + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;
}

// =====================================================
// WORKBOOK
// =====================================================

function buildWorkbook(sheets: { name: string }[]): string {
  const sheetEntries = sheets.map((s, i) =>
    `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${sheetEntries}
</sheets>
</workbook>`;
}

// =====================================================
// STYLES (minimal)
// =====================================================

function buildStyles(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="1">
<font><sz val="11"/><name val="Calibri"/></font>
</fonts>
<fills count="2">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
</fills>
<borders count="1">
<border><left/><right/><top/><bottom/><diagonal/></border>
</borders>
<cellStyleXfs count="1">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
</cellStyleXfs>
<cellXfs count="1">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
</cellXfs>
</styleSheet>`;
}

// =====================================================
// MAIN EXPORT
// =====================================================

/**
 * Generate a native .xlsx file (Office Open XML) from sheet data.
 * Uses JSZip to assemble the ZIP structure.
 */
export async function generateXlsx(sheets: { name: string; rows: (string | number)[][] }[]): Promise<Blob> {
  const zip = new JSZip();

  // Build shared strings across all sheets
  const { xml: sharedStringsXml, lookup } = buildSharedStrings(sheets);

  // [Content_Types].xml
  zip.file('[Content_Types].xml', buildContentTypes(sheets.length));

  // _rels/.rels
  zip.file('_rels/.rels', buildRootRels());

  // xl/workbook.xml
  zip.file('xl/workbook.xml', buildWorkbook(sheets));

  // xl/_rels/workbook.xml.rels
  zip.file('xl/_rels/workbook.xml.rels', buildWorkbookRels(sheets.length));

  // xl/styles.xml
  zip.file('xl/styles.xml', buildStyles());

  // xl/sharedStrings.xml
  zip.file('xl/sharedStrings.xml', sharedStringsXml);

  // xl/worksheets/sheet{N}.xml
  for (let i = 0; i < sheets.length; i++) {
    zip.file(`xl/worksheets/sheet${i + 1}.xml`, buildWorksheetXml(sheets[i].rows, lookup));
  }

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
