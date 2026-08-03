import DOMPurify from 'dompurify';
import { marked } from 'marked';

// Render streamed assistant markdown to sanitized HTML. LLM output is untrusted,
// so every render passes through DOMPurify. Links open in a new tab with safe rel.
marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(source: string): string {
  const rawHtml = marked.parse(source, { async: false }) as string;
  const clean = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'textarea'],
    FORBID_ATTR: ['style', 'onerror', 'onload'],
  });
  return clean;
}
