import { expect, test } from "vitest"
import { todayISODate } from "./date"

test("returns a YYYY-MM-DD string", () => {
  expect(todayISODate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})
