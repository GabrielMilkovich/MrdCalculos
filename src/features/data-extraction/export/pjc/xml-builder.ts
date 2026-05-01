/**
 * XMLBuilder manual — gera XML como string com escape correto.
 *
 * Alternativa: libs externas (xml-js, xmlbuilder2) são pesadas e podem
 * mudar a formatação. Para o .pjc precisamos controle total: ordem dos
 * elementos, valores `null` literal, ISO-8859-1.
 *
 * Uso:
 *   const x = new XMLBuilder();
 *   x.declaration("1.0", "ISO-8859-1");
 *   const root = x.element("Calculo");
 *   root.elementText("id", "1");
 *   root.element("ferias").element("Set");
 *   const s = x.toString();
 */

export class XMLBuilder {
  private parts: string[] = [];

  declaration(version = "1.0", encoding = "ISO-8859-1"): this {
    this.parts.push(`<?xml version="${version}" encoding="${encoding}"?>`);
    return this;
  }

  /** Cria um elemento raiz e retorna handle pra adicionar filhos. */
  element(name: string): XMLNode {
    const node = new XMLNode(name);
    this.parts.push(node);
    return node;
  }

  /** Renderiza o XML completo como string. */
  toString(): string {
    return this.parts.map((p) => (typeof p === "string" ? p : p.render())).join("");
  }
}

export class XMLNode {
  private children: Array<XMLNode | string> = [];

  constructor(public readonly name: string) {}

  /** Adiciona um elemento filho e retorna o handle dele. */
  element(name: string): XMLNode {
    const node = new XMLNode(name);
    this.children.push(node);
    return node;
  }

  /** Adiciona elemento <name>text</name> com escape automático. */
  elementText(name: string, text: string | number | boolean | null | undefined): this {
    const node = new XMLNode(name);
    if (text === null || text === undefined) {
      node.children.push("null");
    } else {
      node.children.push(escape(String(text)));
    }
    this.children.push(node);
    return this;
  }

  /** Adiciona texto bruto (já escapado) como filho. */
  rawText(s: string): this {
    this.children.push(s);
    return this;
  }

  render(): string {
    if (this.children.length === 0) {
      // Self-closing tag pra elemento vazio
      return `<${this.name}/>`;
    }
    const inner = this.children.map((c) => (typeof c === "string" ? c : c.render())).join("");
    return `<${this.name}>${inner}</${this.name}>`;
  }
}

/**
 * Escape XML: 5 caracteres reservados.
 * & < > " '
 */
export function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return c;
    }
  });
}
