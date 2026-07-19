import { Button } from "@allsquare/ui"
import { useState } from "react"
import { useT } from "../lib/i18n"
import { drawShareCard, tripSummary } from "../lib/shareCard"
import type { Expense, Group, Member } from "../lib/types"

// "Share trip summary" appears once the trip is all square: renders the
// settled-trip card to a canvas and hands it to the native share sheet
// (falling back to a download where Web Share can't take files).
export function ShareSummary({
  group,
  members,
  expenses,
}: {
  group: Group
  members: Member[]
  expenses: Expense[]
}) {
  const t = useT()
  const [busy, setBusy] = useState(false)

  const share = async () => {
    setBusy(true)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = 1200
      canvas.height = 630
      const summary = tripSummary(expenses, members, group.baseCurrency)
      if (!drawShareCard(canvas, group.title, group.baseCurrency, summary)) return
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
      if (!blob) return
      const file = new File([blob], "allsquare-trip.png", { type: "image/png" })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: group.title })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "allsquare-trip.png"
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      // sharing cancelled; nothing to clean up
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={share} disabled={busy}>
      {busy ? t("preparing") : t("shareTripSummary")}
    </Button>
  )
}
