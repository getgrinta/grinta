import { parseDocument, DomUtils } from "htmlparser2";
import { Element, isTag } from "domhandler";

function isFillableOrClickable(el: Element): boolean {
  const tag = el.name.toLowerCase();
  const attrs = el.attribs || {};

  return (
    // Fillable
    (tag === "input" && !["hidden", "submit", "button"].includes(attrs.type)) ||
    tag === "textarea" ||
    tag === "select" ||
    // Clickable
    tag === "button" ||
    tag === "a" ||
    attrs.onclick !== undefined ||
    attrs.role === "button"
  );
}

function describeAttributes(el: Element): string {
  const attrs = el.attribs || {};
  const keysToKeep = [
    "type",
    "placeholder",
    "name",
    "value",
    "id",
    "class",
    "href",
    "role",
    "aria-label",
  ];
  const desc = keysToKeep
    .filter((key) => attrs[key])
    .map((key) => `${key}="${attrs[key]}"`)
    .join(" ");
  return desc ? ` { ${desc} }` : "";
}

function buildSelector(el: Element, parents: Element[]): string {
  const parts: string[] = [];

  for (const parent of parents.concat(el)) {
    let selector = parent.name;
    if (parent.attribs?.id) {
      selector += `#${parent.attribs.id}`;
    }
    if (parent.attribs?.class) {
      const classes = parent.attribs.class.trim().split(/\s+/).join(".");
      selector += `.${classes}`;
    }
    parts.push(selector);
  }

  return parts.join(" > ");
}

function toMarkdownDOM(
  el: Element,
  parents: Element[] = [],
  indent = 0,
): string {
  const pad = "  ".repeat(indent);
  let output = "";

  const currentPath = [...parents, el];

  if (isFillableOrClickable(el)) {
    const labelText = DomUtils.getText(el).trim();
    const selector = buildSelector(el, parents);
    output += `${pad}- <${el.name}> ${describeAttributes(el)} — ${labelText ? `"${labelText}"` : "no text"}\n`;
    output += `${pad}  Selector: \`${selector}\`\n`;
  }

  if (el.children) {
    for (const child of el.children) {
      if (isTag(child)) {
        output += toMarkdownDOM(child, currentPath, indent + 1);
      }
    }
  }

  return output;
}

export function htmlToMarkdownTree(html: string): string {
  const dom = parseDocument(html);
  return dom.children
    .filter(isTag)
    .map((el) => toMarkdownDOM(el))
    .join("")
    .trim();
}
