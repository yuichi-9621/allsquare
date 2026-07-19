import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { resolveLocale, t, useLocale } from "./i18n"

const STORAGE_KEY = "allsquare:locale"
const originalLanguage = navigator.language

function stubLanguage(language: string) {
  Object.defineProperty(navigator, "language", { value: language, configurable: true })
}

beforeEach(() => {
  localStorage.clear()
  stubLanguage(originalLanguage)
})

afterEach(() => {
  localStorage.clear()
  stubLanguage(originalLanguage)
})

describe("t()", () => {
  test("returns the plain string for a key with no vars", () => {
    expect(t("cancel")).toBe("Cancel")
  })

  test("interpolates a single {name} slot", () => {
    expect(t("imMember", { name: "Alice" })).toBe("I'm Alice")
  })

  test("interpolates multiple slots, including {n}-style names", () => {
    expect(t("itemNMember", { n: 2, name: "Bob" })).toBe("Item 2: Bob")
  })

  test("leaves an unmatched slot untouched rather than throwing", () => {
    expect(t("youAreText", {})).toBe("You are {name}.")
  })
})

describe("resolveLocale()", () => {
  test("prefers a valid localStorage override over navigator.language", () => {
    localStorage.setItem(STORAGE_KEY, "ja")
    stubLanguage("en-US")
    expect(resolveLocale()).toBe("ja")
  })

  test("ignores a garbage localStorage value and falls through to navigator", () => {
    localStorage.setItem(STORAGE_KEY, "fr")
    stubLanguage("ja-JP")
    expect(resolveLocale()).toBe("ja")
  })

  test("resolves ja when navigator.language starts with ja", () => {
    stubLanguage("ja-JP")
    expect(resolveLocale()).toBe("ja")
  })

  test("resolves en for any non-ja navigator.language", () => {
    stubLanguage("fr-FR")
    expect(resolveLocale()).toBe("en")
  })
})

describe("useLocale()", () => {
  test("the setter persists to localStorage and updates document.documentElement.lang", () => {
    const { result } = renderHook(() => useLocale())

    act(() => result.current[1]("ja"))

    expect(result.current[0]).toBe("ja")
    expect(localStorage.getItem(STORAGE_KEY)).toBe("ja")
    expect(document.documentElement.lang).toBe("ja")
    expect(t("cancel")).toBe("キャンセル")

    // Reset so later tests (and other files sharing this module instance
    // within the same worker) see English again.
    act(() => result.current[1]("en"))
    expect(document.documentElement.lang).toBe("en")
    expect(t("cancel")).toBe("Cancel")
  })

  test("a second subscriber re-renders when the first one changes the locale", () => {
    const a = renderHook(() => useLocale())
    const b = renderHook(() => useLocale())

    act(() => a.result.current[1]("ja"))

    expect(b.result.current[0]).toBe("ja")

    act(() => a.result.current[1]("en"))
    expect(b.result.current[0]).toBe("en")
  })
})
