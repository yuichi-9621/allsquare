import type { MessageKey } from "./i18n"

export type CategoryId =
  | "food"
  | "drinks"
  | "transport"
  | "lodging"
  | "activities"
  | "groceries"
  | "shopping"
  | "other"

// The fixed set; ids are the contract, emoji is presentation, `label` is the
// English fallback. `labelKey` is what render sites should pass through
// t() so the chip/list text follows the active locale; ids and emoji never
// change with locale.
export const CATEGORIES: { id: CategoryId; emoji: string; label: string; labelKey: MessageKey }[] =
  [
    { id: "food", emoji: "🍜", label: "Food", labelKey: "catFood" },
    { id: "drinks", emoji: "🍺", label: "Drinks", labelKey: "catDrinks" },
    { id: "transport", emoji: "🚕", label: "Transport", labelKey: "catTransport" },
    { id: "lodging", emoji: "🏨", label: "Lodging", labelKey: "catLodging" },
    { id: "activities", emoji: "🎟️", label: "Activities", labelKey: "catActivities" },
    { id: "groceries", emoji: "🛒", label: "Groceries", labelKey: "catGroceries" },
    { id: "shopping", emoji: "🛍️", label: "Shopping", labelKey: "catShopping" },
    { id: "other", emoji: "📦", label: "Other", labelKey: "catOther" },
  ]

export function categoryOf(id: string | null | undefined) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}
