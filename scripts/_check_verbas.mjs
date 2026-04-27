import { JSDOM } from 'jsdom';
import fs from 'fs';
const xml = fs.readFileSync('docs/PROCESSO_00243317820255240001_CALCULO_4435_DATA_03032026_HORA_162904.PJC', 'utf8');
const dom = new JSDOM(xml, { contentType: 'text/xml' });
const root = dom.window.document.documentElement;

const verbasSet = root.getElementsByTagName('verbas')[0];
console.log('verbas root tagName:', verbasSet?.tagName, 'parent:', verbasSet?.parentElement?.tagName);

const calc = verbasSet ? verbasSet.getElementsByTagName('Calculada').length : 0;
const ref  = verbasSet ? verbasSet.getElementsByTagName('Reflexo').length : 0;
const inf  = verbasSet ? verbasSet.getElementsByTagName('Informada').length : 0;
console.log('Inside <verbas> recursive: Calculada=', calc, 'Reflexo=', ref, 'Informada=', inf);

// Direct children of verbasSet > Set (or List)
const allDescendantCalc = root.getElementsByTagName('Calculada').length;
const allDescendantRef = root.getElementsByTagName('Reflexo').length;
const allDescendantInf = root.getElementsByTagName('Informada').length;
console.log('Whole doc recursive: Calculada=', allDescendantCalc, 'Reflexo=', allDescendantRef, 'Informada=', allDescendantInf);

// Count IDs uniques after dedup
const verbaMap = new Map();
let dupCalc = 0, dupRef = 0, dupInf = 0;
let nullIdCalc = 0;
if (verbasSet) {
  for (const el of Array.from(verbasSet.getElementsByTagName('Calculada'))) {
    const id = el.getElementsByTagName('id')[0]?.textContent?.trim() || '';
    if (!id) { nullIdCalc++; continue; }
    if (verbaMap.has(id)) { dupCalc++; continue; }
    verbaMap.set(id, 'C');
  }
  for (const el of Array.from(verbasSet.getElementsByTagName('Reflexo'))) {
    const id = el.getElementsByTagName('id')[0]?.textContent?.trim() || '';
    if (!id) continue;
    if (verbaMap.has(id)) { dupRef++; continue; }
    verbaMap.set(id, 'R');
  }
  for (const el of Array.from(verbasSet.getElementsByTagName('Informada'))) {
    const id = el.getElementsByTagName('id')[0]?.textContent?.trim() || '';
    if (!id) continue;
    if (verbaMap.has(id)) { dupInf++; continue; }
    verbaMap.set(id, 'I');
  }
}
console.log('Unique verbas after dedup:', verbaMap.size, 'duplicatas Calc=', dupCalc, 'Ref=', dupRef, 'Inf=', dupInf, 'nullIdCalc=', nullIdCalc);
