/* Boxes that scroll sideways (wide tables on a phone) must be reachable by keyboard, so people who don't use a mouse
   or touch can scroll them with the arrow keys (WCAG 2.1.1). A box gets a keyboard stop only while it overflows, so
   tables that fit add no extra stops. Checked after every redraw and on resize. */
const SCROLLERS = ".tablewrap";

function update() {
  document.querySelectorAll(SCROLLERS).forEach(box => {
    const scrolls = box.scrollWidth > box.clientWidth + 1;
    if (scrolls && box.dataset.keyStop !== "1") { box.tabIndex = 0; box.dataset.keyStop = "1"; }
    else if (!scrolls && box.dataset.keyStop === "1") { box.removeAttribute("tabindex"); delete box.dataset.keyStop; }
  });
}

export function watchScrollers() {
  let queued = false;
  const soon = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } };
  new MutationObserver(soon).observe(document.body, {childList: true, subtree: true});
  window.addEventListener("resize", soon);
  soon();
}
