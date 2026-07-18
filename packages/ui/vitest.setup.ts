import "@testing-library/jest-dom/vitest"

class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= RO as unknown as typeof ResizeObserver
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {}
