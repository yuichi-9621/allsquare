import { expect, test } from "vitest"
import { assertSafeMinor } from "../src/money.js"

test.each([-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
  "assertSafeMinor rejects %s",
  (bad) => {
    expect(() => assertSafeMinor(bad as number)).toThrow()
  },
)

test.each([0, 1, 500000, Number.MAX_SAFE_INTEGER])("assertSafeMinor accepts %s", (ok) => {
  expect(() => assertSafeMinor(ok)).not.toThrow()
})
