import { afterEach, expect, test } from "vitest"
import { clearActiveMember, getActiveMemberId, setActiveMemberId } from "./activeMember"

afterEach(() => localStorage.clear())

test("returns null before any member is chosen", () => {
  expect(getActiveMemberId("abc123")).toBeNull()
})

test("persists the active member per slug", () => {
  setActiveMemberId("abc123", "m1")
  setActiveMemberId("other", "m9")
  expect(getActiveMemberId("abc123")).toBe("m1")
  expect(getActiveMemberId("other")).toBe("m9")
})

test("clearActiveMember removes only that slug", () => {
  setActiveMemberId("abc123", "m1")
  clearActiveMember("abc123")
  expect(getActiveMemberId("abc123")).toBeNull()
})
