import { expect, test } from "vitest"
import { CORE_VERSION } from "../src/index.js"

test("core package builds and exports", () => {
  expect(CORE_VERSION).toBe("0.0.0")
})
