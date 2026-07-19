import { minorToInput } from "./money"

export type PayTarget = { kind: "link"; href: string } | { kind: "copy"; text: string }

// Turns a member's free-text payment handle into something actionable.
// Smart where the service supports amount prefill, pass-through for any URL,
// copyable text for everything else (Apple Pay or Zelle phone numbers, etc.).
export function paymentTarget(
  handle: string,
  amountMinor: number,
  currency: string,
  note: string,
): PayTarget {
  const h = handle.trim()
  const amount = minorToInput(amountMinor, currency)

  // @handle -> Venmo, amount + note prefilled
  if (h.startsWith("@")) {
    const user = encodeURIComponent(h.slice(1))
    return {
      kind: "link",
      href: `https://venmo.com/u/${user}?txn=pay&amount=${amount}&note=${encodeURIComponent(note)}`,
    }
  }

  // $cashtag -> Cash App with amount
  if (h.startsWith("$")) {
    return { kind: "link", href: `https://cash.app/${encodeURIComponent(h)}/${amount}` }
  }

  // PayPal.Me link (with or without scheme) -> amount + currency appended
  if (/(^|\/\/)(www\.)?paypal\.me\//i.test(h)) {
    const base = (/^https?:\/\//i.test(h) ? h : `https://${h}`).replace(/\/+$/, "")
    return { kind: "link", href: `${base}/${amount}${currency.toUpperCase()}` }
  }

  // Any other URL (Coinbase, Kraken Pay, Wise, Revolut, ...) opens as-is
  if (/^https?:\/\//i.test(h)) {
    return { kind: "link", href: h }
  }

  // Plain text (phone number, "Apple Pay: ...") -> copy to clipboard
  return { kind: "copy", text: h }
}
