import "@testing-library/jest-dom/vitest"
import { afterAll, afterEach, beforeAll } from "vitest"
import { server } from "./src/test/server"

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// jsdom doesn't implement these; Radix primitives (Select, RadioGroup,
// Checkbox) need them to mount/interact in tests. Mirrors packages/ui's
// vitest.setup.ts.
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= RO as unknown as typeof ResizeObserver
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {}
