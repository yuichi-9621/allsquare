import { useSyncExternalStore } from "react"
import { en } from "../locales/en"
import { ja } from "../locales/ja"

export type MessageKey = keyof typeof en
export type Locale = "en" | "ja"

const STORAGE_KEY = "allsquare:locale"

function readStoredLocale(): Locale | null {
  try {
    if (typeof localStorage === "undefined") return null
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === "en" || stored === "ja" ? stored : null
  } catch {
    // Storage can throw in private-browsing / locked-down environments.
    return null
  }
}

function detectNavigatorLocale(): Locale {
  try {
    if (typeof navigator === "undefined") return "en"
    return navigator.language?.toLowerCase().startsWith("ja") ? "ja" : "en"
  } catch {
    return "en"
  }
}

// localStorage override wins; otherwise navigator.language starting with
// "ja" resolves to Japanese, everything else falls back to English.
export function resolveLocale(): Locale {
  return readStoredLocale() ?? detectNavigatorLocale()
}

function dictFor(locale: Locale) {
  return locale === "ja" ? ja : en
}

function applyDocumentLang(locale: Locale) {
  try {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = locale
    }
  } catch {
    // Non-browser environment; nothing to sync.
  }
}

let currentLocale: Locale = resolveLocale()
const subscribers = new Set<() => void>()

// Keep <html lang> in sync from the moment the module loads, before any
// component subscribes.
applyDocumentLang(currentLocale)

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const template = dictFor(currentLocale)[key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : match,
  )
}

function setLocale(next: Locale): void {
  if (next === currentLocale) return
  currentLocale = next
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Ignore write failures (private browsing, quota, etc.); the in-memory
    // locale still switches for the rest of this session.
  }
  applyDocumentLang(next)
  for (const notify of subscribers) notify()
}

function subscribe(callback: () => void): () => void {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

function getSnapshot(): Locale {
  return currentLocale
}

// React hook: [locale, setLocale]. Components that only need t() but still
// must re-render on a locale change should use useT() below instead.
export function useLocale(): [Locale, (next: Locale) => void] {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return [locale, setLocale]
}

// The recommended pattern for components that only need t(): subscribes to
// locale changes (so the component re-renders) without exposing the setter.
export function useT(): typeof t {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return t
}
