import type { CtpsDadosPessoais } from '../../../tipos-dominio.ts';
import { mergeCamposKV, parseBoolBR } from '../helpers.ts';

export function parseDadosPessoais(linhas: string[]): CtpsDadosPessoais | null {
  if (linhas.length === 0) return null;
  const c = mergeCamposKV(linhas);
  if (!c.has('nome') || !c.has('cpf')) return null;

  // Identidade: "22051555 SSP-PR" → rg_numero + rg_orgao (último token)
  const identidade = (c.get('identidade') ?? '').trim();
  let rg_numero: string | null = null;
  let rg_orgao: string | null = null;
  if (identidade) {
    const partes = identidade.split(/\s+/);
    rg_numero = partes[0] || null;
    rg_orgao = partes.slice(1).join(' ') || null;
  }

  // CTPS: "009144100598PR" → ctps_numero (12 dígitos) + ctps_uf (2 letras finais)
  const ctpsRaw = (c.get('ctps') ?? '').trim();
  let ctps_numero: string | null = null;
  let ctps_uf: string | null = null;
  if (ctpsRaw) {
    const m = ctpsRaw.match(/^(\d+)([A-Z]{2})$/);
    if (m) {
      ctps_numero = m[1];
      ctps_uf = m[2];
    } else {
      ctps_numero = ctpsRaw;
    }
  }

  // UF/PAIS pra naturalidade: "PR Brasil"
  const ufPais = (c.get('uf_pais') ?? '').trim();
  const ufPaisParts = ufPais.split(/\s+/);

  const cartHabil = c.get('cart_habil')?.trim();

  return {
    nome: c.get('nome') ?? '',
    sexo: (c.get('sexo') as 'Masculino' | 'Feminino' | undefined) ?? null,
    estado_civil: c.get('estado_civil') || null,
    estudante: parseBoolBR(c.get('estudante')),
    naturalidade: c.get('naturalidade') || null,
    naturalidade_uf: ufPaisParts[0] || null,
    naturalidade_pais: ufPaisParts.slice(1).join(' ') || null,
    nascimento: c.get('nascimento') ?? '',
    rg_numero,
    rg_orgao,
    ctps_numero,
    ctps_uf,
    cpf: c.get('cpf') ?? '',
    pis_pasep: c.get('pis_pasep') || null,
    primeiro_emprego: parseBoolBR(c.get('1_emprego')),
    titulo_eleitor: c.get('tit_eleitor') || null,
    carteira_habilitacao: !cartHabil || cartHabil === '-' ? null : cartHabil,
    certificado_reservista: c.get('cert_res') || null,
    grau_instrucao: c.get('grau_instrucao') || null,
    pai: c.get('pai') || null,
    mae: c.get('mae') || null,
  };
}
