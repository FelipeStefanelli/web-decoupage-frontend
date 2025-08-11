// useHotkeys.js
import { useEffect, useRef } from "react";

export function useHotkeys(
  bindings,
  { enabled = true, ignoreWhenTyping = true, allowRepeat = false } = {}
) {
  const bindingsRef = useRef(bindings);
  useEffect(() => { bindingsRef.current = bindings; }, [bindings]);

  useEffect(() => {
    if (!enabled) return;

    const BLOCK_INPUT_TYPES = new Set([
      "button","checkbox","color","file","hidden","image","radio","range","reset","submit"
    ]);

    const isTyping = (el) => {
      const node = el && el.nodeType === 1 ? el : null;
      if (!node) return false;
      if (node.closest && node.closest('[data-hotkeys="off"]')) return true;
      if (node.isContentEditable) return true;
      const tag = (node.tagName || "").toUpperCase();
      if (tag === "TEXTAREA") return true;
      if (tag === "INPUT") {
        const t = (node.type || "").toLowerCase();
        return !BLOCK_INPUT_TYPES.has(t);
      }
      return false;
    };

    const onKeyDown = (e) => {
      if (ignoreWhenTyping && isTyping(e.target)) return;
      if (!allowRepeat && e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = (e.key || "").toLowerCase();
      const map = bindingsRef.current || {};
      const handler = map[key] || (key === "decimal" ? map["."] : undefined);

      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };

    const opts = { capture: true };          // mantém captura
    document.addEventListener("keydown", onKeyDown, opts); // ✅ só document
    return () => {
      document.removeEventListener("keydown", onKeyDown, opts);
    };
  }, [enabled, ignoreWhenTyping, allowRepeat]);
}
