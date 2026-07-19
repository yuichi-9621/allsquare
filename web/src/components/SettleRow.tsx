import { Button } from "@allsquare/ui"
import { useState } from "react"
import type { Member, Transfer } from "../lib/types"
import { MemberAvatar } from "./MemberAvatar"
import { MoneyAmount } from "./MoneyAmount"

// One "who pays who" line with a Mark paid action. Recording semantics live in
// the parent (GroupPage) — this row only reports the tap and shows progress.
export function SettleRow({
  transfer,
  members,
  baseCurrency,
  onMarkPaid,
}: {
  transfer: Transfer
  members: Member[]
  baseCurrency: string
  onMarkPaid: (transfer: Transfer) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  const from = nameOf.get(transfer.from) ?? "?"
  const to = nameOf.get(transfer.to) ?? "?"

  const markPaid = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await onMarkPaid(transfer)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <MemberAvatar members={members} memberId={transfer.from} />
          {from} → <MemberAvatar members={members} memberId={transfer.to} />
          {to}
        </span>
        <div className="flex shrink-0 items-center gap-2.5">
          <MoneyAmount amountMinor={transfer.amountMinor} currency={baseCurrency} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={markPaid}
            aria-label={`Mark ${from} paid ${to}`}
          >
            {busy ? "Saving…" : "Mark paid"}
          </Button>
        </div>
      </div>
      {failed ? (
        <p role="alert" className="text-sm text-danger">
          Could not record the payment.
        </p>
      ) : null}
    </div>
  )
}
