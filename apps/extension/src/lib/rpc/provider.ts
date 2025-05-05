import { setNamespace, onMessage } from "webext-bridge/window";
import TurndownService from "turndown";

setNamespace("grinta");

// Initialize Turndown with LLM-friendly options
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
});

// Remove unwanted entire sections
function cleanDOMForLLM(root: HTMLElement) {
  // Remove junk
  root
    .querySelectorAll(
      "script, style, nav, footer, aside, noscript, iframe, form, button",
    )
    .forEach((el) => el.remove());

  // Unwrap meaningless divs and spans
  root.querySelectorAll("div, span").forEach((el) => {
    const onlyText = (el as HTMLElement).innerText.trim();
    const onlyOneChild = el.children.length === 1;

    // If div/span only wraps another element or only contains text, unwrap it
    if (onlyOneChild || onlyText.length > 0) {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent?.insertBefore(el.firstChild, el);
      }
      parent?.removeChild(el);
    }
  });

  // Optional: Remove empty paragraphs
  root.querySelectorAll("p").forEach((el) => {
    if (el.innerText.trim() === "") el.remove();
  });
}

// Clean Markdown after Turndown
function cleanMarkdown(md: string) {
  return md
    .replace(/\n{3,}/g, "\n\n") // Normalize multiple blank lines
    .replace(/^\s+|\s+$/g, "") // Trim
    .replace(/[ \t]+\n/g, "\n"); // Remove trailing spaces
}

onMessage("grinta_getContent", (message) => {
  if (message.sender.context !== "content-script") return;
  const clone = document.body.cloneNode(true) as HTMLElement;
  cleanDOMForLLM(clone);
  const rawMarkdown = turndownService.turndown(clone.innerHTML);
  const cleanedMarkdown = cleanMarkdown(rawMarkdown);
  return {
    content: cleanedMarkdown,
  };
});

console.log("[Grinta] RPC initialized");
