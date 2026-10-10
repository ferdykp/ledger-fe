import { nextTick } from "vue";
const stack = [];
const states = new WeakMap();
let originalOverflow;
const focusables = (el) =>
  [
    ...el.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    ),
  ].filter((node) => node.getClientRects().length);
export default {
  mounted(el, binding) {
    const previous = document.activeElement;
    if (!stack.length) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    stack.push(el);
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.tabIndex = -1;
    if (!el.hasAttribute("aria-label"))
      el.setAttribute(
        "aria-label",
        el.querySelector("h2,h3")?.textContent?.trim() || "Dialog",
      );
    const state = { close: binding.value, previous };
    state.keydown = (event) => {
      if (stack.at(-1) !== el) return;
      if (event.key === "Escape") {
        event.preventDefault();
        state.close?.();
      }
      if (event.key === "Tab") {
        const items = focusables(el);
        const first = items[0];
        const last = items.at(-1);
        if (!first) {
          event.preventDefault();
          el.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === el ||
            document.activeElement === first ||
            !el.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !el.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    states.set(el, state);
    document.addEventListener("keydown", state.keydown);
    nextTick(() => {
      if (el.isConnected) (focusables(el)[0] || el).focus();
    });
  },
  updated(el, binding) {
    states.get(el).close = binding.value;
  },
  unmounted(el) {
    const state = states.get(el);
    document.removeEventListener("keydown", state.keydown);
    const index = stack.indexOf(el);
    if (index >= 0) stack.splice(index, 1);
    if (!stack.length) document.body.style.overflow = originalOverflow;
    if (state.previous?.isConnected) state.previous.focus();
    states.delete(el);
  },
};
