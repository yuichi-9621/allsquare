export type CategoryId =
  | "food"
  | "drinks"
  | "transport"
  | "lodging"
  | "activities"
  | "groceries"
  | "shopping"
  | "other"

// The fixed set; ids are the contract, emoji/labels are presentation.
export const CATEGORIES: { id: CategoryId; emoji: string; label: string }[] = [
  { id: "food", emoji: "🍜", label: "Food" },
  { id: "drinks", emoji: "🍺", label: "Drinks" },
  { id: "transport", emoji: "🚕", label: "Transport" },
  { id: "lodging", emoji: "🏨", label: "Lodging" },
  { id: "activities", emoji: "🎟️", label: "Activities" },
  { id: "groceries", emoji: "🛒", label: "Groceries" },
  { id: "shopping", emoji: "🛍️", label: "Shopping" },
  { id: "other", emoji: "📦", label: "Other" },
]

export function categoryOf(id: string | null | undefined) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}
