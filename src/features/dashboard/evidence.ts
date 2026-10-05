/** Largest evidence PDF the upload route accepts. */
export const MAX_EVIDENCE_MB = 10;

/** Tags the dispute editor produces; anything else is unwrapped to its text. */
const ALLOWED_TAGS = new Set([
  "P", "BR", "DIV", "H2", "H3", "B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "A", "BLOCKQUOTE",
]);
/** Dropped along with everything inside them. */
const DROPPED_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "SVG", "MATH", "IMG"]);

function safeHref(value: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value, "https://example.invalid");
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}

function clean(node: Node, into: Node, doc: Document) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE) {
      into.appendChild(doc.createTextNode(child.textContent ?? ""));
      continue;
    }
    if (!(child instanceof Element) || DROPPED_TAGS.has(child.tagName)) continue;
    if (!ALLOWED_TAGS.has(child.tagName)) {
      clean(child, into, doc);
      continue;
    }
    const copy = doc.createElement(child.tagName.toLowerCase());
    const href = child.tagName === "A" ? safeHref(child.getAttribute("href")) : undefined;
    if (href) copy.setAttribute("href", href);
    clean(child, copy, doc);
    into.appendChild(copy);
  }
}

/**
 * Keeps only the formatting the editor offers: no attributes besides a link's
 * http(s)/mailto href, and no scripts, styles or embeds. Browser only.
 */
export function cleanEvidenceHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out = doc.createElement("div");
  clean(doc.body, out, doc);
  return out.innerHTML;
}

/** True when the HTML has no words in it, e.g. "<p><br></p>". */
export function isBlankHtml(html: string) {
  return !html.replace(/<[^>]*>/g, "").replace(/&nbsp;| /g, " ").trim();
}
