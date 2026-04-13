import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML para uso seguro em dangerouslySetInnerHTML.
 * Remove scripts, event handlers e outros vetores XSS.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
      'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'span', 'div', 'blockquote', 'sub', 'sup',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  });
}
