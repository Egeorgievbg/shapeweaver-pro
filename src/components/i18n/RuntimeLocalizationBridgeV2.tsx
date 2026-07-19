import { useEffect } from "react";
import { translateRuntimeText, useI18n } from "@/lib/i18n";
import { translateExtendedRuntimeText } from "@/lib/runtime-bg-extended";

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const LOCALIZED_ATTRIBUTES = ["placeholder", "aria-label", "title"] as const;

function shouldSkip(node: Node) {
  const element = node instanceof Element ? node : node.parentElement;
  return Boolean(element?.closest("script, style, code, pre, [data-i18n-skip='true']"));
}

function translateValue(base: string, locale: "bg" | "en") {
  if (locale === "en") return base;
  return translateExtendedRuntimeText(base) ?? translateRuntimeText(base, "bg");
}

function localizeTextNode(node: Text, locale: "bg" | "en") {
  if (shouldSkip(node)) return;
  const current = node.nodeValue ?? "";
  const base = originalText.get(node) ?? current;
  if (!originalText.has(node)) originalText.set(node, base);

  const trimmed = base.trim();
  if (!trimmed) return;
  const translated = translateValue(trimmed, locale);
  if (translated === trimmed && locale === "bg") return;

  const leading = base.match(/^\s*/)?.[0] ?? "";
  const trailing = base.match(/\s*$/)?.[0] ?? "";
  const next = `${leading}${translated}${trailing}`;
  if (node.nodeValue !== next) node.nodeValue = next;
}

function localizeAttributes(element: Element, locale: "bg" | "en") {
  if (shouldSkip(element)) return;
  let originals = originalAttributes.get(element);
  if (!originals) {
    originals = new Map<string, string>();
    originalAttributes.set(element, originals);
  }

  for (const attribute of LOCALIZED_ATTRIBUTES) {
    const current = element.getAttribute(attribute);
    if (!current) continue;
    if (!originals.has(attribute)) originals.set(attribute, current);
    const base = originals.get(attribute) ?? current;
    const next = translateValue(base, locale);
    if (current !== next) element.setAttribute(attribute, next);
  }
}

function localizeTree(root: Node, locale: "bg" | "en") {
  if (root instanceof Text) localizeTextNode(root, locale);
  if (root instanceof Element) localizeAttributes(root, locale);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node instanceof Text) localizeTextNode(node, locale);
    if (node instanceof Element) localizeAttributes(node, locale);
    node = walker.nextNode();
  }
}

export function RuntimeLocalizationBridgeV2() {
  const { locale } = useI18n();

  useEffect(() => {
    document.documentElement.lang = locale;
    let applying = false;

    const apply = (node: Node) => {
      if (applying) return;
      applying = true;
      try {
        localizeTree(node, locale);
      } finally {
        applying = false;
      }
    };

    apply(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(apply);
        if (mutation.type === "characterData") apply(mutation.target);
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          apply(mutation.target);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...LOCALIZED_ATTRIBUTES],
    });

    return () => observer.disconnect();
  }, [locale]);

  return null;
}
