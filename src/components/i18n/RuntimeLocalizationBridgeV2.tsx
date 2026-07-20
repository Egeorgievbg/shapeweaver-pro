import { useEffect } from "react";
import { translateRuntimeText, useI18n } from "@/lib/i18n";
import { translateExtendedRuntimeText } from "@/lib/runtime-bg-extended";
import { translatePolishedRuntimeText } from "@/lib/runtime-bg-polish";

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const LOCALIZED_ATTRIBUTES = ["placeholder", "aria-label", "title"] as const;

function shouldSkip(node: Node) {
  const element = node instanceof Element ? node : node.parentElement;
  return Boolean(element?.closest("script, style, code, pre, [data-i18n-skip='true']"));
}

function translateValue(base: string, locale: "bg" | "en") {
  if (locale === "en") return base;
  return (
    translatePolishedRuntimeText(base) ??
    translateExtendedRuntimeText(base) ??
    translateRuntimeText(base, "bg")
  );
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

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function RuntimeLocalizationBridgeV2() {
  const { locale } = useI18n();

  useEffect(() => {
    document.documentElement.lang = locale;

    let cancelled = false;
    let applying = false;
    let observer: MutationObserver | undefined;
    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const apply = (node: Node) => {
      if (cancelled || applying) return;
      applying = true;
      try {
        localizeTree(node, locale);
      } finally {
        applying = false;
      }
    };

    const connect = () => {
      if (cancelled) return;
      apply(document.body);
      observer = new MutationObserver((mutations) => {
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
    };

    const schedule = () => {
      const idleWindow = window as IdleWindow;
      if (idleWindow.requestIdleCallback) {
        idleHandle = idleWindow.requestIdleCallback(connect, { timeout: 2000 });
      } else {
        timeoutHandle = setTimeout(connect, 750);
      }
    };

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      const idleWindow = window as IdleWindow;
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
      observer?.disconnect();
    };
  }, [locale]);

  return null;
}
